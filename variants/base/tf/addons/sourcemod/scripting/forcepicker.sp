#pragma semicolon 1
#pragma newdecls required

#include <sourcemod>
#include <tf2_stocks>
#include <sdktools>


#define PLUGIN_URL ""
#define PLUGIN_VERSION "3.0"
#define PLUGIN_NAME "Force Picker"
#define PLUGIN_AUTHOR "Statik"
#define DEBUG 1

#define MAX_TIME_WITHOUT_PICKERS 5
#define MAX_AFK_TIME 15

public Plugin myinfo = 
{
	name = PLUGIN_NAME, 
	author = PLUGIN_AUTHOR, 
	description = "Tool to make the pick up games quicker", 
	version = PLUGIN_VERSION, 
	url = PLUGIN_URL
}

/*================================
************ HANDLES *************
================================*/

Handle g_hTimer;

/*=====================================
************* VARIABLES ***************
=====================================*/

int remainingTime;
int remainingRetries;
bool isRunning = false;
bool waitingPicker = false;

int remainingTimeWithoutPickers;

float clientsPosition[MAXPLAYERS + 1][3];
float clientsAngle[MAXPLAYERS + 1][3];

int afkMatches[MAXPLAYERS + 1];

int lastRandomInt;

/*==================================
******* ONFUNCTIONS & EVENTS *******
==================================*/

public void OnPluginStart()
{
	// Cvars 
	CreateConVar("forcepicker_version", PLUGIN_VERSION, "Force Picker Version", FCVAR_SPONLY | FCVAR_DONTRECORD | FCVAR_NOTIFY);
	
	
	// Commands
	RegAdminCmd("sm_forcepicker", cmdForcePicker, ADMFLAG_GENERIC, "Forces random people from spec to pick players.");
	RegAdminCmd("fp", cmdForcePicker, ADMFLAG_GENERIC, "Forces random people from spec to pick players.");
	
	// To hook timer related game events
	HookEvent("player_team", OnPrePlayerChangeTeam, EventHookMode_Pre);
	HookEvent("player_team", OnPostPlayerChangeTeam, EventHookMode_Post);
	
	HookEvent("player_death", OnPlayerDeath);
}

public void OnPrePlayerChangeTeam(Event event, const char[] strName, bool bDontBroadcast)
{
	if (isRunning)
	{
		int userid = event.GetInt("userid");
		int newteam = event.GetInt("team");
		int oldteam = event.GetInt("oldteam");
		
		event.SetBool("silent", true);
		
		// Player moves from picking team to spec or disconnect
		if ((oldteam == 2 || oldteam == 3) && (newteam != 2 && newteam != 3))
		{
			if (GetRandomInt(0, 1000) == 666)
			{
				if (oldteam == 2 && GetRealTeamClientCount(2) == 1)
					PrintToChatAll("\x01\x07FF4040%N \x01anda con la pera.", GetClientOfUserId(userid));
				
				if (oldteam == 3 && GetRealTeamClientCount(3) == 1)
					PrintToChatAll("\x01\x0799CCFF%N \x01anda con la pera.", GetClientOfUserId(userid));
			}
			else
			{
				if (oldteam == 2 && GetRealTeamClientCount(2) == 1)
					PrintToChatAll("\x01\x07FF4040%N \x01refused to pick.", GetClientOfUserId(userid));
				
				if (oldteam == 3 && GetRealTeamClientCount(3) == 1)
					PrintToChatAll("\x01\x0799CCFF%N \x01refused to pick.", GetClientOfUserId(userid));
			}
		}
		
		// Player chooses to pick while waiting for players to pick.
		if (waitingPicker)
		{
			if ((newteam == 2 || newteam == 3) && (oldteam != 2 && oldteam != 3))
			{
				if (newteam == 2 && GetRealTeamClientCount(2) == 0)
					PrintToChatAll("\x01\x07FF4040%N \x01will be picking players this match.", GetClientOfUserId(userid));
				
				if (newteam == 3 && GetRealTeamClientCount(3) == 0)
					PrintToChatAll("\x01\x0799CCFF%N \x01will be picking players this match.", GetClientOfUserId(userid));
			}
		}
	}
}

public void OnPostPlayerChangeTeam(Event event, const char[] strName, bool bDontBroadcast)
{
	if (isRunning)
	{
		int userid = event.GetInt("userid");
		int newteam = event.GetInt("team");
		int oldteam = event.GetInt("oldteam");
		
		// Moves players to old team if attempts to join team that already has a picker
		if ((newteam == 2 && GetRealTeamClientCount(2) == 1) || (newteam == 3 && GetRealTeamClientCount(3) == 1))
		{
			DataPack pack;
			CreateDataTimer(0.1, ChangeTeamTimer, pack);
			pack.WriteCell(GetClientOfUserId(userid));
			pack.WriteCell(oldteam);
		}
	}
}

public Action ChangeTeamTimer(Handle timer, DataPack pack)
{
	int client;
	int oldteam;
	
	pack.Reset();
	client = pack.ReadCell();
	oldteam = pack.ReadCell();
	
	if (IsValidClient(client))
	{
		ChangeClientTeam(client, oldteam);
		PrintToChat(client, "You cannot join a team that already has a picker.");
	}
}

public void OnPlayerDeath(Event event, const char[] strName, bool bDontBroadcast)
{
	if (isRunning)
	{
		int deadPlayer = GetClientOfUserId(event.GetInt("userid"));
		int attackerPlayer = GetClientOfUserId(event.GetInt("attacker"));
		
		int deadPlayerTeam = GetClientTeam(deadPlayer);
		int attackerPlayerTeam = GetClientTeam(attackerPlayer);
		
		if ((deadPlayerTeam == 2 && attackerPlayerTeam == 3))
		{
			PrintToChatAll("\x01\x07FF4040%N \x01and \x0799CCFF%N \x01will be picking this match.", deadPlayerTeam, attackerPlayerTeam);
			ClearTimer(g_hTimer);
		}
		if ((deadPlayerTeam == 3 && attackerPlayerTeam == 2))
		{
			PrintToChatAll("\x01\x07FF4040%N \x01and \x0799CCFF%N \x01will be picking this match.", attackerPlayerTeam, deadPlayerTeam);
			ClearTimer(g_hTimer);
		}
	}
	//PrintToChatAll("player_death");
}

/*==================================
*********CLIENT COMMANDS************
==================================*/

public Action cmdForcePicker(int client, int args)
{
	char buffer[16];
	if (GetConVarBool(FindConVar("mp_tournament")) == false)
		return Plugin_Handled;
	
	if (args == 0)
		cmdExecutor(client);
	if (args > 0)
	{
		GetCmdArg(1, buffer, sizeof buffer);
		int retries = StringToInt(buffer);
		if (retries == 0) // retries is nan
		{
			if (StrEqual(buffer, "stop"))
			{
				cmdExecutor(client, _, _, true);
				return Plugin_Handled;
			}
			else if (StrEqual(buffer, "spec"))
			{
				cmdExecutor(client, _, true);
				return Plugin_Handled;
			}
			else
			{
				GetCmdArg(0, buffer, sizeof(buffer));
				PrintToChat(client, "\x01Incorrect syntax, usage: \x01%s [1-30] [stop|spec]", buffer);
				return Plugin_Handled;
			}
		}
		if (args > 1)
		{
			GetCmdArg(2, buffer, sizeof buffer);
			if (StrEqual(buffer, "spec"))
			{
				cmdExecutor(client, retries, true);
				return Plugin_Handled;
			}
			else
			{
				GetCmdArg(0, buffer, sizeof(buffer));
				PrintToChat(client, "\x01Incorrect syntax, usage: \x01%s [1-30] [stop|spec]", buffer);
				return Plugin_Handled;
			}
		}
		else
		{
			cmdExecutor(client, retries);
			return Plugin_Handled;
		}
	}
	return Plugin_Handled;
}

void cmdExecutor(int client, int retries = 0, bool spec = false, bool stop = false)
{
	if (GetRealClientCount() < 2)
	{
		PrintToChat(client, "\x01There is no enough players to pick.");
		return;
	}
	if (retries != 0 && (retries < 1 || retries > 30))
	{
		PrintToChat(client, "\x01Invalid retries. Input range: \x01[1-30].");
		return;
	}
	if (!spec && !stop)
	{
		if ((GetRealTeamClientCount(2) > 0) && (GetRealTeamClientCount(3) > 0))
		{
			PrintToChat(client, "\x01There are already players in both teams.");
			return;
		}
		if (GetRealTeamClientCount(1) < 2)
		{
			PrintToChat(client, "\x01There is no enough players on Spectator team.");
			return;
		}
	}
	if (stop)
	{
		if (!isRunning)
			PrintToChat(client, "\x01Force picker is not running at this time.");
		else
			PrintToChatAll("\x01Force picker has been stopped.");
		
		ClearTimer(g_hTimer);
		return;
	}
	if (spec)
		MovePlayersToSpec();
	
	if (retries)
	{
		ClearTimer(g_hTimer);
		
		PrintToChatAll("\x01Random players will be chosen to pick with a limit of \x01%i \x01retries.", retries);
		
		remainingTime = 180;
		remainingRetries = retries;
		remainingTimeWithoutPickers = MAX_TIME_WITHOUT_PICKERS;
		g_hTimer = CreateTimer(1.0, CountdownTimer, _, TIMER_REPEAT);
	}
	else
	{
		if (GetRealTeamClientCount(1) < 2)
		{
			PrintToChat(client, "\x01There is no enough players on Spectator team.");
			return;
		}
		ForcePicker();
	}
}

public Action CountdownTimer(Handle hTimer)
{
	isRunning = true;
	
	if (remainingTime < 0 || remainingRetries <= 0)
	{
		PrintToChatAll("\x01Force picker stopped.");
		isRunning = false;
		waitingPicker = false;
		return Plugin_Stop;
	}
	else
	{
		int redCount = GetRealTeamClientCount(2);
		int bluCount = GetRealTeamClientCount(3);
		
		// =========== WAITING PICKER  ============= start
		if (redCount == 0 || bluCount == 0)
		{
			waitingPicker = true;
			if (remainingTimeWithoutPickers <= 0)
			{
				remainingTimeWithoutPickers = MAX_TIME_WITHOUT_PICKERS;
				remainingRetries--;
				PrintToChatAll("\x01%d force retries reamaning.", remainingRetries);
				waitingPicker = false;
				ForcePicker();
			}
			else
			{
				PrintCenterTextAll("Forcing random players to pick in %d seconds.", remainingTimeWithoutPickers);
			}
			remainingTimeWithoutPickers--;
		}
		else
		{
			waitingPicker = false;
			remainingTimeWithoutPickers = MAX_TIME_WITHOUT_PICKERS;
		}
		// =========== WAITING PICKER  ============= end
		
		// =========== AFK MANAGER ============= start
		if (redCount > 0 || bluCount > 0)
		{
			AfkManager();
		}
		// =========== AFK MANAGER ============= end
		remainingTime--;
		return Plugin_Handled;
	}
}

void ClearTimer(Handle & hTimer)
{
	if (hTimer != INVALID_HANDLE && isRunning == true)
	{
		KillTimer(hTimer);
		hTimer = INVALID_HANDLE;
		isRunning = false;
		waitingPicker = false;
	}
}

/*==================================
*************MAIN CODE**************
==================================*/

void ForcePicker()
{
	int client1, client2;
	int redCount = GetRealTeamClientCount(2);
	int bluCount = GetRealTeamClientCount(3);
	
	if (redCount > 0 || bluCount > 0)
	{
		if (GetRealTeamClientCount(1) < 1)
		{
			PrintToChatAll("\x01There is no enough players on Spectator team.");
			return;
		}
	}
	else
	{
		if (GetRealTeamClientCount(1) < 2)
		{
			PrintToChatAll("\x01There is no enough players on Spectator team.");
			return;
		}
	}
	if (redCount == 0)
	{
		client1 = GetRandomPlayer(1); // Spectator
		ChangeClientTeam(client1, 2); // Red
		PrintCenterText(client1, "You have been chosen to pick for this match.");
	}
	else
	{  // Get current player in the team
		client1 = GetRandomPlayer(2);
	}
	
	if (bluCount == 0)
	{
		client2 = GetRandomPlayer(1); // Spectator
		ChangeClientTeam(client2, 3); // Blue
		PrintCenterText(client2, "You have been chosen to pick for this match.");
	}
	else
	{  // Get current player in the team
		client2 = GetRandomPlayer(3);
	}
	
	TF2_SetPlayerClass(client1, TFClass_Scout);
	TF2_SetPlayerClass(client2, TFClass_Scout);
	
	TF2_RespawnPlayer(client1);
	TF2_RespawnPlayer(client2);
	
	CreateTimer(1.0, tmrMeleeStrip, client1);
	CreateTimer(1.0, tmrMeleeStrip, client2);
	
	if (redCount == 0 && bluCount == 0)
		PrintToChatAll("\x01\x07FF4040%N \x01and \x0799CCFF%N \x01have been randomly chosen to pick.", client1, client2);
	else if (redCount == 0)
		PrintToChatAll("\x01\x07FF4040%N \x01has been randomly chosen to pick against \x0799CCFF%N\x01.", client1, client2);
	else if (bluCount == 0)
		PrintToChatAll("\x01\x0799CCFF%N \x01has been randomly chosen to pick against \x07FF4040%N\x01.", client2, client1);
	else
		PrintToChatAll("\x01\x07FF4040%N \x01and \x0799CCFF%N \x01are picking for this match.", client1, client2);
}


void AfkManager()
{
	for (int i = 1; i <= MaxClients; i++)
	{
		if (IsValidClient(i))
		{
			if ((GetClientTeam(i) == 2 || GetClientTeam(i) == 3))
			{
				float clientPosition[3];
				GetClientAbsOrigin(i, clientPosition);
				
				float clientAngle[3];
				GetClientEyeAngles(i, clientAngle);
				
				if (AreVectorsEqual(clientPosition, clientsPosition[i]) && 
					AreVectorsEqual(clientAngle, clientsAngle[i]))
				{
					afkMatches[i]++;
				}
				else
				{
					afkMatches[i] = 0;
				}
				clientsPosition[i] = clientPosition;
				clientsAngle[i] = clientAngle;
				
				if (afkMatches[i] == (MAX_AFK_TIME - 5))
				{
					if (GetClientTeam(i) == 2)
						PrintToChatAll("\x01Seems that \x07FF4040%N \x01is AFK and will be moved to spectator in 5 seconds.", i);
					if (GetClientTeam(i) == 3)
						PrintToChatAll("\x01Seems that \x0799CCFF%N \x01is AFK and will be moved to spectator in 5 seconds.", i);
				}
				if (afkMatches[i] >= MAX_AFK_TIME)
				{
					/*
					if(GetClientTeam(i) == 2)
						PrintToChatAll("\x07FF4040%N \x01has been moved to spectator for being AFK.", i);
					if(GetClientTeam(i) == 3)
						PrintToChatAll("\x0799CCFF%N \x01has been moved to spectator for being AFK.", i);
					*/
					ChangeClientTeam(i, 1);
				}
				if (afkMatches[i] >= (MAX_AFK_TIME - 5))
				{
					PrintCenterText(i, "You will be moved to spectator if you don't move in %d seconds.", (MAX_AFK_TIME - afkMatches[i]));
				}
			}
			else
			{
				afkMatches[i] = 0;
			}
		}
	}
}

// Change to weapon slot 2 (Melee)
public Action tmrMeleeStrip(Handle timer, any client)
{
	if (client && IsPlayerAlive(client))
	{
		int weapon = GetPlayerWeaponSlot(client, TFWeaponSlot_Melee);
		SetEntPropEnt(client, Prop_Send, "m_hActiveWeapon", weapon);
	}
}

/*==================================
*********EXTRA FUNCTIONS************
==================================*/


bool IsValidClient(int client)
{
	//if(client <= 0 || client > MaxClients || !IsClientInGame(client)) // DEBUG PURPOSES
	if (client <= 0 || client > MaxClients || !IsClientInGame(client) || IsFakeClient(client))
		return false;
	return true;
}

int GetRealClientCount()
{
	int clients = 0;
	for (int i = 1; i <= MaxClients; i++)
	{
		if (IsValidClient(i))
			clients++;
	}
	return clients;
}

int GetRealTeamClientCount(int team)
{
	int clients = 0;
	for (int i = 1; i <= MaxClients; i++)
	if (IsValidClient(i) && GetClientTeam(i) == team)
		clients++;
	return clients;
}

int GetRandomPlayer(int team)
{
	int[] clients = new int[MaxClients + 1];
	int clientCount;
	for (int i = 1; i <= MaxClients; i++)
	if (IsValidClient(i) && GetClientTeam(i) == team)
		clients[clientCount++] = i;
	
	int randomInt = GetRandomInt(0, clientCount - 1);
	if (randomInt == lastRandomInt)
		randomInt = GetRandomInt(0, clientCount - 1);
	lastRandomInt = randomInt;
	
	return (clientCount == 0) ? -1 : clients[randomInt];
}

void MovePlayersToSpec()
{
	char buffer[96];
	int targets[33];
	bool ml;
	int count = ProcessTargetString("@all", 0, targets, sizeof(targets), COMMAND_FILTER_CONNECTED, buffer, sizeof(buffer), ml);
	if (count > 0)
	{
		for (int i = 0; i < count; i++)
		{
			int t = targets[i];
			if (IsPlayerAlive(t))ForcePlayerSuicide(t);
			ChangeClientTeam(t, 1);
		}
	}
}

stock bool AreVectorsEqual(float[3] v1, float[3] v2)
{
	return (v1[0] == v2[0] && v1[1] == v2[1] && v1[2] == v2[2]);
}
