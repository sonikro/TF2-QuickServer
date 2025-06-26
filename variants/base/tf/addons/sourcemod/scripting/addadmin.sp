#pragma semicolon 1

/*
 * SM Addadmin
 * by MaTTe (mateo10)
 *
 * Modifications by sonikro (v1.1):
 *  - Improved argument validation and error handling
 *  - Password argument is now optional
 *  - Input sanitization for quotes and newlines
 *  - File open error handling and user feedback
 *  - Reloads admins after writing
 *  - Resolves name, #userid, or STEAMID to correct SteamID for admin entry
 *  - Updated command usage/help text to reflect accepted input types
 */

#define VERSION "1.1"

public Plugin:myinfo = 
{
	name = "SM Addadmin",
	author = "sonikro (original by MaTTe)",
	description = "Add an admin during the game with sm_addadmin",
	version = VERSION,
	url = "http://www.sourcemod.net/"
};

public OnPluginStart()
{
	CreateConVar("smaddadmin_version", VERSION, "SM Addadmin Version", FCVAR_PLUGIN|FCVAR_SPONLY|FCVAR_REPLICATED|FCVAR_NOTIFY);

	RegAdminCmd("sm_addadmin", Command_AddAdmin, ADMFLAG_RCON, "Adds an admin to admins_simple.ini. Usage: sm_addadmin <name | #userid | STEAMID> <flags (e.g. z)> [password]");
}

public Action:Command_AddAdmin(client, args)
{
	if(args < 2)
	{
		ReplyToCommand(client, "[SM] Usage: sm_addadmin <name | #userid | STEAMID> <flags (e.g. z)> [password]");
		return Plugin_Handled;
	}

	new String:szTarget[64], String:szFlags[20], String:szPassword[32];
	GetCmdArg(1, szTarget, sizeof(szTarget));
	GetCmdArg(2, szFlags, sizeof(szFlags));
	if (args >= 3)
	{
		GetCmdArg(3, szPassword, sizeof(szPassword));
	}
	else
	{
		szPassword[0] = '\0';
	}

	// Attempt to resolve szTarget to a client index if possible
	new targetIndex = 0;
	if (szTarget[0] == '#')
	{
		targetIndex = StringToInt(szTarget[1]);
	}
	else
	{
		targetIndex = FindTarget(client, szTarget, false, false);
	}

	new String:szSteamID[32];
	if (targetIndex > 0 && IsClientInGame(targetIndex))
	{
		GetClientAuthString(targetIndex, szSteamID, sizeof(szSteamID));
	}
	else
	{
		// If not found, assume user entered a SteamID directly
		strcopy(szSteamID, sizeof(szSteamID), szTarget);
	}

	// Input sanitization: check for quotes or newlines in input
	if (StrContains(szSteamID, "\"") != -1 || StrContains(szFlags, "\"") != -1 || StrContains(szPassword, "\"") != -1 ||
	    StrContains(szSteamID, "\n") != -1 || StrContains(szFlags, "\n") != -1 || StrContains(szPassword, "\n") != -1)
	{
		ReplyToCommand(client, "[SM] Invalid characters in input.");
		return Plugin_Handled;
	}

	new String:szFile[256];
	BuildPath(Path_SM, szFile, sizeof(szFile), "configs/admins_simple.ini");

	new Handle:hFile = OpenFile(szFile, "at");
	if (hFile == INVALID_HANDLE)
	{
		ReplyToCommand(client, "[SM] Failed to open admins_simple.ini for writing.");
		return Plugin_Handled;
	}

	if (szPassword[0] == '\0')
	{
		WriteFileLine(hFile, "\"%s\" \"%s\"", szSteamID, szFlags);
	}
	else
	{
		WriteFileLine(hFile, "\"%s\" \"%s\" \"%s\"", szSteamID, szFlags, szPassword);
	}

	CloseHandle(hFile);

	// Reload admins so changes take effect immediately
	ServerCommand("sm_reloadadmins");

	ReplyToCommand(client, "[SM] Admin added: %s (%s)", szSteamID, szFlags);

	return Plugin_Handled;
}