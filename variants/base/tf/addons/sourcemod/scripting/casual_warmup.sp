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
ConVar g_hMatchMode;

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

	// Persist match mode state across plugin reloads (plugin is in disabled/
	// and gets re-loaded on map change — this ConVar survives that cycle)
	g_hMatchMode = CreateConVar("sm_casual_warmup_matchmode", "0",
		"Tracks whether match mode has been triggered. Set to 0 to reset. (internal use)",
		FCVAR_NONE, true, 0.0, true, 1.0);

	// Log initial state for debugging
	PrintToServer("[CasualWarmup] Plugin v%s loaded. MatchMode=%s Threshold=%d Delay=%d Enabled=%s",
		PLUGIN_VERSION,
		g_hMatchMode.BoolValue ? "ON" : "OFF",
		g_hThreshold.IntValue,
		g_hDelay.IntValue,
		g_hEnabled.BoolValue ? "YES" : "NO");

	// Start the periodic player check timer
	g_hTimer = CreateTimer(5.0, Timer_CheckPlayers, _, TIMER_REPEAT);
}

public void OnPluginEnd()
{
	ClearTimer(g_hTimer);
}

public void OnMapStart()
{
	if (!g_hMatchMode.BoolValue)
	{
		PrintToServer("[CasualWarmup] Map changed, still in warmup mode.");
		return;
	}

	PrintToServer("[CasualWarmup] Map changed, match mode still active. Ensuring SOAP DM plugins are unloaded.");
	ServerCommand("sm plugins unload soap_tf2dm");
	ServerCommand("sm plugins unload soap_tournament");
}

public void OnClientPutInServer(int client)
{
	if (g_hMatchMode.BoolValue)
	{
		PrintToServer("[CasualWarmup] Player joined but match mode is active — no warmup message sent.");
		return;
	}

	int iThreshold = g_hThreshold.IntValue;
	PrintToServer("[CasualWarmup] Player %N joined — warmup active (%d/%d players needed).", client, GetRealPlayerCount(), iThreshold);
	PrintToChat(client, " \x04[Warmup]\x01 This server is in \x04Warmup / DM mode\x01. A casual match will start once \x04%d\x01 players are connected!", iThreshold);
}

public void OnConfigsExecuted()
{
	if (g_hMatchMode.BoolValue)
	{
		PrintToServer("[CasualWarmup] OnConfigsExecuted — match mode ON, skipping SOAP plugin load.");
		return;
	}

	PrintToServer("[CasualWarmup] OnConfigsExecuted — warmup mode, loading SOAP DM plugins from disabled/.");
	ServerCommand("sm plugins load disabled/soap_tf2dm");
	ServerCommand("sm plugins load disabled/soap_tournament");
}

public Action Timer_CheckPlayers(Handle timer)
{
	if (!g_hEnabled.BoolValue)
	{
		return Plugin_Continue;
	}

	if (g_hMatchMode.BoolValue)
	{
		return Plugin_Continue;
	}

	int iPlayerCount = GetRealPlayerCount();
	int iThreshold = g_hThreshold.IntValue;
	int iDelay = g_hDelay.IntValue;

	PrintToServer("[CasualWarmup] Timer check: players=%d threshold=%d grace=%d/%d",
		iPlayerCount, iThreshold, g_iGraceCount, iDelay);

	if (iPlayerCount >= iThreshold)
	{
		g_iGraceCount += 5;
		PrintToServer("[CasualWarmup] Grace count increased to %d (need %d).", g_iGraceCount, iDelay);

		if (g_iGraceCount >= iDelay)
		{
			SwitchToMatchMode();
		}
		else
		{
			int iRemaining = iDelay - g_iGraceCount;

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
			PrintToServer("[CasualWarmup] Player count dropped below threshold. Resetting grace counter.");
			g_iGraceCount = 0;
			PrintToChatAll(" \x04[Warmup]\x01 Player count dropped below threshold (%d/%d). Resuming warmup.",
				iPlayerCount, iThreshold);
		}
	}

	return Plugin_Continue;
}

void SwitchToMatchMode()
{
	g_hMatchMode.SetBool(true);
	g_iGraceCount = 0;
	ClearTimer(g_hTimer);

	PrintToChatAll(" \x04[Warmup]\x01 Enough players connected! Switching to match mode...");
	PrintToServer("[CasualWarmup] === SWITCHING TO MATCH MODE ===");
	PrintToServer("[CasualWarmup] Disabling SOAP DM plugins.");

	// Unload SOAP DM plugins — these were active during warmup
	ServerCommand("sm plugins unload soap_tf2dm");
	ServerCommand("sm plugins unload soap_tournament");

	// Re-run the map's server config to apply match settings
	// We use servercfgfile which is set per-map (e.g. casual_5cp.cfg, casual_koth.cfg)
	char sCfgFile[128];
	FindConVar("servercfgfile").GetString(sCfgFile, sizeof(sCfgFile));
	PrintToServer("[CasualWarmup] Executing map config: %s", sCfgFile);
	ServerCommand("exec %s", sCfgFile);

	// Force a round restart so match settings take effect immediately
	PrintToServer("[CasualWarmup] Restarting round.");
	ServerCommand("mp_restartgame 1");
}

int GetRealPlayerCount()
{
	int count = 0;
	for (int i = 1; i <= MaxClients; i++)
	{
		if (IsClientConnected(i) && IsClientInGame(i) && !IsFakeClient(i) && !IsClientSourceTV(i))
		{
			count++;
		}
	}
	return count;
}

void ClearTimer(Handle &timer)
{
	if (timer != null)
	{
		KillTimer(timer);
		timer = null;
	}
}
