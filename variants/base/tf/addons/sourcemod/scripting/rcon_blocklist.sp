#include <sourcemod>
#include <files>

#define BLOCKLIST_FILE "addons/sourcemod/configs/rcon_blocklist.txt"
#define FROZEN_FILE "addons/sourcemod/configs/rcon_frozen.txt"
#define SECRET_CVARS_FILE "addons/sourcemod/configs/secret_cvars.txt"
#define ALLOWED_CLIENTS_FILE "addons/sourcemod/configs/rcon_allowed_clients.txt"

public Plugin myinfo =
{
    name = "RCON Command Blocker",          
    author = "sonikro",          
    description = "Restricts RCON access: blocks, freezes, and hides sensitive commands and cvars from users.",
    version = "1.0.0",                    
    url = "https://github.com/sonikro/TF2-QuickServer"   
};

new String:g_Blocklist[64][64];
new g_BlocklistCount = 0;
new String:g_FrozenCommands[32][64];
new g_FrozenCommandsCount = 0;
char g_sFrozenValues[32][256];
bool g_bFrozenSet[32];
bool g_bSuppressFrozenHook[32];
new String:g_SecretCvars[32][64];
new g_SecretCvarsCount = 0;

char g_AllowedClients[32][32];
int g_AllowedClientsCount = 0;

public void OnPluginStart()
{
    LoadAllowedClients();
    LoadBlocklist();
    LoadFrozenCommands();
    LoadSecretCvars();
    AddCommandListener(Command_Blocklist, "");
    AddCommandListener(Command_SecretCvarView, "");
    for (int i = 0; i < g_FrozenCommandsCount; i++)
    {
        g_bFrozenSet[i] = false;
        g_bSuppressFrozenHook[i] = false;
        ConVar cvar = FindConVar(g_FrozenCommands[i]);
        if (cvar != null)
        {
            cvar.GetString(g_sFrozenValues[i], sizeof(g_sFrozenValues[]));
            if (g_sFrozenValues[i][0] != '\0')
            {
                g_bFrozenSet[i] = true;
            }
            HookConVarChange(cvar, OnFrozenConVarChanged);
        }
    }
}

void LoadBlocklist()
{
    File file = OpenFile(BLOCKLIST_FILE, "r");
    if (file == null)
    {
        PrintToServer("[RCONBlock] Could not open blocklist file.");
        return;
    }

    g_BlocklistCount = 0;
    char line[64];
    while (!IsEndOfFile(file) && g_BlocklistCount < sizeof(g_Blocklist))
    {
        ReadFileLine(file, line, sizeof(line));
        TrimString(line);
        if (line[0] == '\0' || line[0] == ';' || line[0] == '#')
            continue;
        strcopy(g_Blocklist[g_BlocklistCount], sizeof(g_Blocklist[]), line);
        g_BlocklistCount++;
    }
    CloseHandle(file);

    // Print all blocked commands to the server console
    PrintToServer("[RCONBlock] Blocked commands loaded (%d):", g_BlocklistCount);
    for (int i = 0; i < g_BlocklistCount; i++)
    {
        PrintToServer("[RCONBlock]   - %s", g_Blocklist[i]);
    }
}

void LoadFrozenCommands()
{
    File file = OpenFile(FROZEN_FILE, "r");
    if (file == null)
    {
        PrintToServer("[RCONBlock] Could not open frozen commands file.");
        return;
    }
    g_FrozenCommandsCount = 0;
    char line[64];
    while (!IsEndOfFile(file) && g_FrozenCommandsCount < sizeof(g_FrozenCommands))
    {
        ReadFileLine(file, line, sizeof(line));
        TrimString(line);
        if (line[0] == '\0' || line[0] == ';' || line[0] == '#')
            continue;
        strcopy(g_FrozenCommands[g_FrozenCommandsCount], sizeof(g_FrozenCommands[]), line);
        g_FrozenCommandsCount++;
    }
    CloseHandle(file);
    PrintToServer("[RCONBlock] Frozen commands loaded (%d):", g_FrozenCommandsCount);
    for (int i = 0; i < g_FrozenCommandsCount; i++)
    {
        PrintToServer("[RCONBlock]   - %s", g_FrozenCommands[i]);
    }
}

void LoadSecretCvars()
{
    File file = OpenFile(SECRET_CVARS_FILE, "r");
    if (file == null)
    {
        PrintToServer("[RCONBlock] Could not open secret cvars file.");
        return;
    }
    g_SecretCvarsCount = 0;
    char line[64];
    while (!IsEndOfFile(file) && g_SecretCvarsCount < sizeof(g_SecretCvars))
    {
        ReadFileLine(file, line, sizeof(line));
        TrimString(line);
        if (line[0] == '\0' || line[0] == ';' || line[0] == '#')
            continue;
        strcopy(g_SecretCvars[g_SecretCvarsCount], sizeof(g_SecretCvars[]), line);
        g_SecretCvarsCount++;
    }
    CloseHandle(file);
    PrintToServer("[RCONBlock] Secret cvars loaded (%d):", g_SecretCvarsCount);
    for (int i = 0; i < g_SecretCvarsCount; i++)
    {
        PrintToServer("[RCONBlock]   - %s", g_SecretCvars[i]);
    }
}

void LoadAllowedClients()
{
    File file = OpenFile(ALLOWED_CLIENTS_FILE, "r");
    if (file == null)
    {
        PrintToServer("[RCONBlock] Could not open allowed clients file.");
        return;
    }
    g_AllowedClientsCount = 0;
    char line[32];
    while (!IsEndOfFile(file) && g_AllowedClientsCount < sizeof(g_AllowedClients))
    {
        ReadFileLine(file, line, sizeof(line));
        TrimString(line);
        if (line[0] == '\0' || line[0] == ';' || line[0] == '#')
            continue;
        strcopy(g_AllowedClients[g_AllowedClientsCount], sizeof(g_AllowedClients[]), line);
        g_AllowedClientsCount++;
    }
    CloseHandle(file);
    PrintToServer("[RCONBlock] Allowed clients loaded (%d):", g_AllowedClientsCount);
    for (int i = 0; i < g_AllowedClientsCount; i++)
    {
        PrintToServer("[RCONBlock]   - %s", g_AllowedClients[i]);
    }
}

bool IsAnyAllowedClientConnected()
{
    for (int i = 1; i <= MaxClients; i++)
    {
        if (!IsClientInGame(i))
            continue;
        char auth[32];
        GetClientAuthId(i, AuthId_Steam2, auth, sizeof(auth), true);
        for (int j = 0; j < g_AllowedClientsCount; j++)
        {
            if (StrEqual(auth, g_AllowedClients[j], false))
                return true;
        }
    }
    return false;
}

public Action Command_Blocklist(int client, const char[] command, int argc)
{
    // Only match the base command (no arguments)
    char baseCmd[64];
    strcopy(baseCmd, sizeof(baseCmd), command);
    // Remove any leading/trailing whitespace (shouldn't be needed, but safe)
    TrimString(baseCmd);
    // Compare against blocklist (case-insensitive, exact match)
    for (int i = 0; i < g_BlocklistCount; i++)
    {
        if (StrEqual(baseCmd, g_Blocklist[i], false))
        {
            if (IsAnyAllowedClientConnected())
            {
                PrintToServer("[RCONBlock] Allowing blocked command due to an allowed client being present.", baseCmd);
                return Plugin_Continue;
            } else {
                PrintToServer("[RCONBlock] Blocked forbidden command: %s", baseCmd);
            }
            return Plugin_Handled;
        }
    }
    return Plugin_Continue;
}

public Action Command_SecretCvarView(int client, const char[] command, int argc)
{
    if (IsAnyAllowedClientConnected())
        return Plugin_Continue;
    if (argc < 1)
        return Plugin_Continue;
    char cvarName[64];
    GetCmdArg(1, cvarName, sizeof(cvarName));
    TrimString(cvarName);
    for (int i = 0; i < g_SecretCvarsCount; i++)
    {
        if (StrEqual(cvarName, g_SecretCvars[i], false))
        {
            if (client > 0)
            {
                PrintToChat(client, "[RCONBlock] The value of '%s' is secret and cannot be visualized.", cvarName);
            }
            PrintToServer("[RCONBlock] Attempt to view secret cvar '%s' was blocked.", cvarName);
            return Plugin_Handled;
        }
    }
    return Plugin_Continue;
}

public void OnFrozenConVarChanged(ConVar convar, const char[] oldValue, const char[] newValue)
{
    char cvarName[64];
    convar.GetName(cvarName, sizeof(cvarName));
    for (int i = 0; i < g_FrozenCommandsCount; i++)
    {
        if (StrEqual(cvarName, g_FrozenCommands[i], false))
        {
            if (g_bSuppressFrozenHook[i])
                return;
            // If never set, allow and mark as set
            if (!g_bFrozenSet[i] && newValue[0] != '\0')
            {
                g_bFrozenSet[i] = true;
                strcopy(g_sFrozenValues[i], sizeof(g_sFrozenValues[]), newValue);
                PrintToServer("[RCONBlock] %s set for the first time. From now on, changes will be blocked.", cvarName);
                return;
            }
            // If already set, block any further changes
            g_bSuppressFrozenHook[i] = true;
            convar.SetString(g_sFrozenValues[i]);
            g_bSuppressFrozenHook[i] = false;
            PrintToServer("[RCONBlock] Attempt to change %s was blocked and reverted.", cvarName);
            for (int j = 1; j <= MaxClients; j++)
            {
                if (IsClientInGame(j) && GetUserFlagBits(j) & ADMFLAG_RCON)
                {
                    PrintToChat(j, "[RCONBlock] Changing %s is not allowed after it has been set.", cvarName);
                }
            }
            return;
        }
    }
}

public void OnPluginEnd()
{
    // Attempt to reload the plugin if it is unloaded
    PrintToServer("[RCONBlock] Plugin unload detected! Re-loading...");
    for (int i = 1; i <= MaxClients; i++)
    {
        if (IsClientInGame(i) && GetUserFlagBits(i) & ADMFLAG_RCON)
        {
            PrintToChat(i, "[RCONBlock] Plugin unload detected! Re-loading rcon_blocklist...");
        }
    }
    ServerCommand("sm plugins load rcon_blocklist");
}
