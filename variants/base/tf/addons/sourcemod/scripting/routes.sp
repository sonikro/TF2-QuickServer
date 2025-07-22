#include <sdkhooks>
#include <sdktools>
#include <sourcemod>
#include <steampawn>
#include <SteamWorks>

#pragma newdecls required
#pragma semicolon 1

char sSDRIP[64];
int  SDR_IP[4];
bool SDR_IP_Set = false;

char sPublicIP[64];
int  Public_IP[4];
bool Public_IP_Set = false;

public Plugin myinfo =
{
    name        = "Connection Routes",
    author      = "sonikro",
    description = "Allows players to see both SDR and Public IP routes for connecting to the server.",
    version     = "1.0.0",
    url         = "https://github.com/sonikro/TF2-QuickServer"
};

public void OnPluginStart()
{
    HookEvent("player_activate", Event_PlayerSpawn, EventHookMode_Post);
    RegConsoleCmd("sm_routes", Command_Routes, "Show available connection routes");
}

public void OnConfigsExecuted()
{
    // Get SDR IP
    int decSDRIP = SteamPawn_GetSDRFakeIP();
    if (decSDRIP != 0)
    {
        SDR_IP_Set  = true;
        SDR_IP[0]   = (decSDRIP >> 24) & 0xFF;
        SDR_IP[1]   = (decSDRIP >> 16) & 0xFF;
        SDR_IP[2]   = (decSDRIP >> 8) & 0xFF;
        SDR_IP[3]   = decSDRIP & 0xFF;
        int SDRPort = SteamPawn_GetSDRFakePort(0);
        Format(sSDRIP, sizeof(sSDRIP), "%u.%u.%u.%u:%d", SDR_IP[0], SDR_IP[1], SDR_IP[2], SDR_IP[3], SDRPort);
    }
    // Get Public IP using SteamWorks
    int  ipArray[4];
    bool gotIP = SteamWorks_GetPublicIP(ipArray);
    if (gotIP)
    {
        Public_IP_Set = true;
        Public_IP[0]  = ipArray[0];
        Public_IP[1]  = ipArray[1];
        Public_IP[2]  = ipArray[2];
        Public_IP[3]  = ipArray[3];
        int port      = GetConVarInt(FindConVar("hostport"));
        Format(sPublicIP, sizeof(sPublicIP), "%u.%u.%u.%u:%d", Public_IP[0], Public_IP[1], Public_IP[2], Public_IP[3], port);
    }
}

public void Event_PlayerSpawn(Event event, const char[] name, bool dontBroadcast)
{
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (!IsClientInGame(client) || IsFakeClient(client))
    {
        return;
    }
    // Delay latency tip by 5 seconds
    CreateTimer(5.0, Timer_LatencyTip, client);
}

public Action Timer_LatencyTip(Handle timer, any client)
{
    if (!IsClientInGame(client) || IsFakeClient(client))
    {
        return Plugin_Stop;
    }
    PrintToChat(client, "\x04If you experience high latency, run !routes and try another route.");
    return Plugin_Stop;
}

public Action Command_Routes(int client, int args)
{
    if (!IsClientInGame(client) || IsFakeClient(client))
    {
        return Plugin_Handled;
    }

    char password[64];
    FindConVar("sv_password").GetString(password, sizeof(password));

    char connectSDR[128];
    char connectPublic[128];
    if (SDR_IP_Set)
    {
        Format(connectSDR, sizeof(connectSDR), "connect %s; password %s", sSDRIP, password);
    }
    else {
        Format(connectSDR, sizeof(connectSDR), "SDR IP not available");
    }

    if (Public_IP_Set)
    {
        Format(connectPublic, sizeof(connectPublic), "connect %s; password %s", sPublicIP, password);
    }
    else {
        Format(connectPublic, sizeof(connectPublic), "Public IP not available");
    }

    PrintToChat(client, "\x04[Connection Routes] Each route might provide a different latency experience.");
    PrintToChat(client, "\x05SDR Route: %s", connectSDR);
    PrintToChat(client, "\x05Direct Route: %s", connectPublic);
    return Plugin_Handled;
}
