#include <sdkhooks>
#include <sdktools>
#include <sourcemod>
#include <steampawn>
#include <cURL>

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
    version     = "1.1.0",
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
    
    // Get Public IP using cURL and ifconfig.me
    FetchPublicIP();
}

void FetchPublicIP()
{
    Handle curl = curl_easy_init();
    if (curl == INVALID_HANDLE)
    {
        LogError("[Routes] Failed to initialize cURL");
        return;
    }

    // Set cURL options
    curl_easy_setopt_int(curl, CURLOPT_NOSIGNAL, 1);
    curl_easy_setopt_int(curl, CURLOPT_NOPROGRESS, 1);
    curl_easy_setopt_int(curl, CURLOPT_TIMEOUT, 10);
    curl_easy_setopt_int(curl, CURLOPT_CONNECTTIMEOUT, 5);
    curl_easy_setopt_string(curl, CURLOPT_URL, "http://ifconfig.me");
    
    // Set user agent to avoid rejection
    Handle slist = curl_slist();
    curl_slist_append(slist, "User-Agent: curl/7.88.1");
    curl_easy_setopt_handle(curl, CURLOPT_HTTPHEADER, slist);
    
    // Create temporary file to store response
    char filename[PLATFORM_MAX_PATH];
    BuildPath(Path_SM, filename, sizeof(filename), "data/routes_ip_temp.txt");
    
    Handle file = curl_OpenFile(filename, "wb");
    if (file == INVALID_HANDLE)
    {
        LogError("[Routes] Failed to open temp file for IP response");
        delete curl;
        return;
    }
    
    curl_easy_setopt_handle(curl, CURLOPT_WRITEDATA, file);
    
    // Store file handle in a DataPack to pass to callback
    DataPack pack = new DataPack();
    pack.WriteCell(file);
    pack.WriteString(filename);
    
    curl_easy_perform_thread(curl, OnPublicIPReceived, pack);
}

void OnPublicIPReceived(Handle hndl, CURLcode code, DataPack pack)
{
    pack.Reset();
    Handle file = pack.ReadCell();
    
    char filename[PLATFORM_MAX_PATH];
    pack.ReadString(filename, sizeof(filename));
    delete pack;
    
    // Close the file handle
    delete file;
    
    if (code != CURLE_OK)
    {
        char error_buffer[256];
        curl_easy_strerror(code, error_buffer, sizeof(error_buffer));
        LogError("[Routes] cURL error when fetching public IP: %s", error_buffer);
        delete hndl;
        return;
    }
    
    // Check HTTP response code
    int responseCode = 0;
    curl_easy_getinfo_int(hndl, CURLINFO_RESPONSE_CODE, responseCode);
    
    if (responseCode != 200)
    {
        LogError("[Routes] HTTP error when fetching public IP: %d", responseCode);
        delete hndl;
        return;
    }
    
    delete hndl;
    
    // Read the IP from the file
    File ipFile = OpenFile(filename, "r");
    if (ipFile == null)
    {
        LogError("[Routes] Failed to read IP response file");
        return;
    }
    
    char ipString[64];
    if (ipFile.ReadLine(ipString, sizeof(ipString)))
    {
        // Trim whitespace and newlines
        TrimString(ipString);
        
        // Parse the IP address
        if (ParseIPAddress(ipString))
        {
            int port = GetConVarInt(FindConVar("hostport"));
            Format(sPublicIP, sizeof(sPublicIP), "%s:%d", ipString, port);
            Public_IP_Set = true;
            PrintToServer("[Routes] Successfully fetched public IP: %s", sPublicIP);
        }
        else
        {
            LogError("[Routes] Failed to parse IP address: %s", ipString);
        }
    }
    else
    {
        LogError("[Routes] Failed to read IP from response file");
    }
    
    delete ipFile;
    DeleteFile(filename);
}

bool ParseIPAddress(const char[] ipString)
{
    char parts[4][16];
    if (ExplodeString(ipString, ".", parts, 4, 16) != 4)
    {
        return false;
    }
    
    for (int i = 0; i < 4; i++)
    {
        int part = StringToInt(parts[i]);
        if (part < 0 || part > 255)
        {
            return false;
        }
        Public_IP[i] = part;
    }
    
    return true;
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
