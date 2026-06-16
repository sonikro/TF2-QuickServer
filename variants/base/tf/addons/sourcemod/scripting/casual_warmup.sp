#include <sourcemod>

#pragma newdecls required
#pragma semicolon 1

#define PLUGIN_VERSION "1.0.0"

public Plugin myinfo =
{
	name        = "Casual Warmup",
	author      = "sonikro",
	description = "Enables DM mode (soap_tf2dm/soap_tournament) while fewer players are connected, then switches to match mode when enough players join.",
	version     = PLUGIN_VERSION,
	url         = "https://github.com/sonikro/TF2-QuickServer"
};

ConVar g_hThreshold;
ConVar g_hDelay;
ConVar g_hEnabled;

bool g_bMatchMode = false;
int g_iGraceCount = 0;
Handle g_hTimer = null;

public void OnPluginStart()
{
	g_hThreshold = CreateConVar("sm_casual_warmup_threshold", "8",
		"Number of real players required to trigger match mode.",
		FCVAR_NONE, true, 1.0);

	g_hDelay = CreateConVar("sm_casual_warmup_delay", "30",
		"Seconds the player count must stay above threshold before switching to match mode.",
		FCVAR_NONE, true, 1.0);

	g_hEnabled = CreateConVar("sm_casual_warmup_enabled", "1",
		"Enable/disable the casual warmup plugin.",
		FCVAR_NONE, true, 0.0, true, 1.0);

	// Start the periodic player check timer
	g_hTimer = CreateTimer(5.0, Timer_CheckPlayers, _, TIMER_REPEAT);
}

public void OnPluginEnd()
{
	ClearTimer(g_hTimer);
}

public void OnClientPutInServer(int client)
{
	if (g_bMatchMode)
	{
		return;
	}

	int iThreshold = g_hThreshold.IntValue;
	PrintToChat(client, " \x04[Warmup]\x01 This server is in \x04Warmup / DM mode\x01. A casual match will start once \x04%d\x01 players are connected!", iThreshold);
}

public void OnConfigsExecuted()
{
	if (g_bMatchMode)
	{
		return;
	}

	// Explicitly load SOAP DM plugins for warmup mode
	// This ensures DM is active regardless of image state or previous reloads
	PrintToServer("[CasualWarmup] Warmup mode active. Loading SOAP DM plugins.");
	ServerCommand("sm plugins load soap_tf2dm");
	ServerCommand("sm plugins load soap_tournament");
}

public Action Timer_CheckPlayers(Handle timer)
{
	if (!g_hEnabled.BoolValue)
	{
		return Plugin_Continue;
	}

	if (g_bMatchMode)
	{
		// Already switched — no more checks needed
		return Plugin_Continue;
	}

	// Count real human players (exclude bots, SourceTV, and unauthenticated clients)
	int iPlayerCount = 0;
	for (int i = 1; i <= MaxClients; i++)
	{
		if (IsClientConnected(i) && IsClientInGame(i) && !IsFakeClient(i) && !IsClientSourceTV(i))
		{
			iPlayerCount++;
		}
	}

	int iThreshold = g_hThreshold.IntValue;
	int iDelay = g_hDelay.IntValue;

	if (iPlayerCount >= iThreshold)
	{
		g_iGraceCount += 5;

		if (g_iGraceCount >= iDelay)
		{
			SwitchToMatchMode();
		}
		else
		{
			int iRemaining = iDelay - g_iGraceCount;

			// Announce at 15s remaining, then every 10s
			if (iRemaining <= 5 || iRemaining == 10 || iRemaining == 15)
			{
				PrintToChatAll(" \x04[Warmup]\x01 Match mode starting in \x04%ds\x01 (%d/%d players)...",
					iRemaining, iPlayerCount, iThreshold);
			}
		}
	}
	else
	{
		if (g_iGraceCount > 0)
		{
			g_iGraceCount = 0;
			PrintToChatAll(" \x04[Warmup]\x01 Player count dropped below threshold (%d/%d). Resuming warmup.",
				iPlayerCount, iThreshold);
		}
	}

	return Plugin_Continue;
}

void SwitchToMatchMode()
{
	g_bMatchMode = true;
	g_iGraceCount = 0;
	ClearTimer(g_hTimer);

	PrintToChatAll(" \x04[Warmup]\x01 Enough players connected! Switching to match mode...");
	PrintToServer("[CasualWarmup] Switching to match mode. Disabling SOAP DM plugins.");

	// Unload SOAP DM plugins — these were active during warmup
	ServerCommand("sm plugins unload soap_tf2dm");
	ServerCommand("sm plugins unload soap_tournament");

	// Re-run the map's server config to apply match settings
	// We use servercfgfile which is set per-map (e.g. casual_5cp.cfg, casual_koth.cfg)
	char sCfgFile[128];
	FindConVar("servercfgfile").GetString(sCfgFile, sizeof(sCfgFile));
	ServerCommand("exec %s", sCfgFile);

	// Force a round restart so match settings take effect immediately
	ServerCommand("mp_restartgame 1");
}

void ClearTimer(Handle &timer)
{
	if (timer != null)
	{
		KillTimer(timer);
		timer = null;
	}
}
