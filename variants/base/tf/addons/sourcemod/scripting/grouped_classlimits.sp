#include <sourcemod>
#include <sdktools>
#include <sdkhooks>
#include <tf2_stocks>
#include <keyvalues>
#include <adt_array>

#pragma newdecls required
#pragma semicolon 1

#define PLUGIN_VERSION "1.0.1"

// --- Plugin Info ---
public Plugin myinfo =
{
    name        = "TF2 Grouped Class Limits",
    author      = "Fuko",
    description = "Restricts TF2 classes based on configurable groups.",
    version     = PLUGIN_VERSION,
    url         = "https://www.fullbuff.gg/"
};

// --- Globals ---
ConVar g_hEnabled;
ConVar g_hImmunityFlags;
ConVar g_hConfigFile;

// Structure to hold group limit information
// For older versions of SourcePawn, we'll use separate arrays for the properties
Handle g_LimitGroups; // Main array to hold limit objects
Handle g_GroupClasses; // Array of arrays for each group's classes
int g_GroupLimits[128]; // Array of limit values for each group (128 is arbitrary max number of groups)
int g_GroupCount = 0; // Count of groups currently loaded

// Store the last valid class for players to revert to if needed
TFClassType g_PlayerLastClass[MAXPLAYERS + 1];

// --- Plugin Functions ---

public void OnPluginStart()
{
    CreateConVar("sm_grouped_classlimits_version", PLUGIN_VERSION, "TF2 Grouped Class Limits version", FCVAR_NOTIFY|FCVAR_SPONLY);
    g_hEnabled       = CreateConVar("sm_grouped_classlimits_enabled", "1", "Enable/disable the grouped class limits plugin.", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_hImmunityFlags = CreateConVar("sm_grouped_classlimits_immunity_flags", "b", "Admin flags required to bypass class limits (e.g., 'b', 'o'). Empty string means no immunity.");
    g_hConfigFile    = CreateConVar("sm_grouped_classlimits_config", "grouped_classlimits.cfg", "Path to the class limit group configuration file, relative to the sourcemod directory.");

    g_LimitGroups = CreateArray(); // Array to store group IDs
    g_GroupClasses = CreateArray(); // Array to store handles to class arrays

    // Hook events
    HookEvent("player_changeclass", Event_PlayerChangeClass, EventHookMode_Pre); // Use Pre to potentially block the change
    HookEvent("player_spawn", Event_PlayerSpawn);
    HookEvent("player_team", Event_PlayerTeam); // Handle team changes

    // Register commands
    RegAdminCmd("sm_reload_classlimits", Cmd_ReloadConfig, ADMFLAG_CONFIG, "Reloads the grouped class limits configuration file.");
    RegAdminCmd("sm_load_classlimits", Cmd_LoadConfig, ADMFLAG_CONFIG, "Loads a specific class limits configuration file. Usage: sm_load_classlimits <filename>");

    // Load initial config
    LoadGroupLimitsConfig();

    // Autoexec config
    AutoExecConfig(true, "plugin.grouped_classlimits");
}

public void OnPluginEnd()
{
    // Clean up Arrays
    ClearGroupLimits();
    
    if (g_LimitGroups != INVALID_HANDLE)
    {
        CloseHandle(g_LimitGroups);
        g_LimitGroups = INVALID_HANDLE;
    }
    
    if (g_GroupClasses != INVALID_HANDLE)
    {
        CloseHandle(g_GroupClasses);
        g_GroupClasses = INVALID_HANDLE;
    }
}

public void OnMapStart()
{
    // Reload config on map start to catch any manual file changes
    LoadGroupLimitsConfig();

    // Precache common "no" sounds (optional, but good practice)
    PrecacheSound("vo/scout_no03.mp3");
    PrecacheSound("vo/sniper_no04.mp3");
    PrecacheSound("vo/soldier_no01.mp3");
    PrecacheSound("vo/demoman_no03.mp3");
    PrecacheSound("vo/medic_no03.mp3");
    PrecacheSound("vo/heavy_no02.mp3");
    PrecacheSound("vo/pyro_no01.mp3");
    PrecacheSound("vo/spy_no02.mp3");
    PrecacheSound("vo/engineer_no03.mp3");
}

public void OnClientPutInServer(int client)
{
    // Initialize last known class
    g_PlayerLastClass[client] = TFClass_Unknown;
}

public void OnClientDisconnect(int client)
{
    // Reset last known class
    g_PlayerLastClass[client] = TFClass_Unknown;
}

// --- Event Handlers ---

// Using EventHookMode_Pre allows us to block the class change *before* it happens
public Action Event_PlayerChangeClass(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_hEnabled.BoolValue) return Plugin_Continue; // Plugin disabled

    int client = GetClientOfUserId(event.GetInt("userid"));
    TFClassType desiredClass = view_as<TFClassType>(event.GetInt("class"));
    int team = GetClientTeam(client);

    // Basic validation
    if (client <= 0 || client > MaxClients || !IsClientInGame(client) || team < 2 /* TFTeam_Red */ || desiredClass <= TFClass_Unknown || desiredClass > TFClass_Engineer)
    {
        return Plugin_Continue; // Invalid state, let the game handle it
    }

    // Check immunity
    if (IsClientImmune(client))
    {
        g_PlayerLastClass[client] = desiredClass; // Update last class if immune
        return Plugin_Continue;
    }

    // Check if the desired class violates any group limits
    if (CheckGroupLimitsForClass(client, team, desiredClass))
    {
        // Limit reached! Block the change.
        PrintToChat(client, " \x04[SM]\x01 Class limit reached for this group. Cannot switch to \x04%s\x01.", TF2_GetClassName(desiredClass));
        EmitDenySound(client, desiredClass);

        // Force the class selection menu back open
        ForcePlayerClassMenu(client);

        // Prevent the engine from changing the class
        return Plugin_Handled;
    }
    else
    {
        // Class change is allowed, update the last known valid class
        g_PlayerLastClass[client] = desiredClass;
        return Plugin_Continue;
    }
}

public void Event_PlayerSpawn(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_hEnabled.BoolValue) return; // Plugin disabled

    int client = GetClientOfUserId(event.GetInt("userid"));
    int team = GetClientTeam(client);

    // Basic validation
    if (client <= 0 || client > MaxClients || !IsClientInGame(client) || team < 2 /* TFTeam_Red */)
    {
        return; // Invalid state
    }

    TFClassType currentClass = TF2_GetPlayerClass(client);

    // Check immunity
    if (IsClientImmune(client))
    {
        g_PlayerLastClass[client] = currentClass; // Update last class if immune
        return;
    }

    // Check if the *current* class violates limits (e.g., if limits changed or team stacked)
    if (CheckGroupLimitsForClass(client, team, currentClass))
    {
        // Limit reached! Force player to change class.
        PrintToChat(client, " \x04[SM]\x01 Class limit reached for your current class group (\x04%s\x01). Please choose another class.", TF2_GetClassName(currentClass));
        EmitDenySound(client, currentClass);

        // Note: Directly changing class here might trigger another spawn event loop.
        // Forcing the menu is safer.
        TF2_ChangeClientTeam(client, team);
        ForcePlayerClassMenu(client); // Show menu

        // Attempt to restore to previous valid class if possible, otherwise let them pick
        // TF2_SetPlayerClass(client, g_PlayerLastClass[client]); // This might cause issues if the previous class is *also* full now. Forcing menu is better.
    }
    else
    {
        // Spawn is okay, update last known class
        g_PlayerLastClass[client] = currentClass;
    }
}

public void Event_PlayerTeam(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_hEnabled.BoolValue) return; // Plugin disabled

    int client = GetClientOfUserId(event.GetInt("userid"));
    int newTeam = event.GetInt("team");
    // int oldTeam = event.GetInt("oldteam"); // Useful if needed later
    bool disconnect = event.GetBool("disconnect");

    if (client <= 0 || client > MaxClients || !IsClientInGame(client) || disconnect || newTeam < 2 /* TFTeam_Red */)
    {
        return; // Ignore spectators, invalid clients, or disconnects
    }

    TFClassType currentClass = TF2_GetPlayerClass(client);
    if (currentClass == TFClass_Unknown) return; // Not spawned yet or invalid class

    // Check immunity
    if (IsClientImmune(client))
    {
        g_PlayerLastClass[client] = currentClass; // Update last class if immune
        return;
    }

    // Check if their current class is valid on the *new* team
    // We need to exclude the player themselves from the count initially, as they haven't fully joined the team's count yet in some states.
    if (CheckGroupLimitsForClass(client, newTeam, currentClass, true)) // Pass 'excludeSelf' as true
    {
        // Limit reached on the new team!
        PrintToChat(client, " \x04[SM]\x01 Class limit reached for your current class group (\x04%s\x01) on this team. Please choose another class.", TF2_GetClassName(currentClass));
        EmitDenySound(client, currentClass);

        // Force class selection menu
        ForcePlayerClassMenu(client);
        // Don't change their class here, let them pick from the menu.
    }
    else
    {
        // Team change is okay class-wise, update last known class
        g_PlayerLastClass[client] = currentClass;
    }
}


// --- Core Logic ---

/**
 * Adds a class to a group
 * @param groupIndex    The index of the group
 * @param classType     The class type to add
 */
void AddClassToGroup(int groupIndex, TFClassType classType)
{
    Handle classArray = GetArrayCell(g_GroupClasses, groupIndex);
    PushArrayCell(classArray, view_as<int>(classType));
}

/**
 * Checks if a class is in a group
 * @param groupIndex    The index of the group
 * @param classType     The class type to check
 * @return              True if the class is in the group, false otherwise
 */
bool HasClassInGroup(int groupIndex, TFClassType classType)
{
    Handle classArray = GetArrayCell(g_GroupClasses, groupIndex);
    return (FindValueInArray(classArray, view_as<int>(classType)) != -1);
}

/**
 * Checks if selecting a specific class would violate any group limits for the player's team.
 *
 * @param client        The client index attempting the class change/spawn.
 * @param team          The team index (TFTeam_Red or TFTeam_Blue).
 * @param desiredClass  The class the player wants to be or is spawning as.
 * @param excludeSelf   Whether to exclude the 'client' from the count (used during team changes before counts fully update).
 * @return              True if a limit is reached, false otherwise.
 */
bool CheckGroupLimitsForClass(int client, int team, TFClassType desiredClass, bool excludeSelf = false)
{
    if (g_LimitGroups == INVALID_HANDLE || GetArraySize(g_LimitGroups) == 0)
    {
        return false; // No groups defined
    }

    // Iterate through all defined limit groups
    for (int i = 0; i < GetArraySize(g_LimitGroups); i++)
    {
        // Check if the desired class is part of this group
        if (HasClassInGroup(i, desiredClass))
        {
            // Get the limit for this group
            int limit = g_GroupLimits[i];
            
            // Count players currently in this group on the same team
            int currentCount = CountPlayersInGroup(team, i, client);

            // If adding this player exceeds the limit, return true (limit reached)
            if (currentCount >= limit)
            {
                // LogToServer("[GroupedClassLimits] Limit reached for client %d (%N) wanting class %d on team %d. Group Limit: %d, Current Count: %d",
                //             client, client, view_as<int>(desiredClass), team, limit, currentCount);
                return true;
            }
        }
    }

    // No limits reached for any group this class belongs to
    return false;
}

/**
 * Counts the number of players on a specific team currently playing a class within the given group.
 *
 * @param team          The team index (TFTeam_Red or TFTeam_Blue).
 * @param groupIndex    The index of the group to check
 * @param excludeClient Optional client index to exclude from the count (e.g., the player checking). Defaults to -1 (no exclusion).
 * @return              The number of players on the team in the specified group.
 */
int CountPlayersInGroup(int team, int groupIndex, int excludeClient = -1)
{
    int count = 0;
    for (int i = 1; i <= MaxClients; i++)
    {
        // Skip invalid clients, clients not in game, the excluded client, or clients on the wrong team
        if (i == excludeClient || !IsClientInGame(i) || GetClientTeam(i) != team)
        {
            continue;
        }

        // Get the client's current class
        TFClassType playerClass = TF2_GetPlayerClass(i);

        // Check if this player's class is in the group we're counting
        if (HasClassInGroup(groupIndex, playerClass))
        {
            count++;
        }
    }
    return count;
}

/**
 * Checks if a client has immunity flags.
 *
 * @param client        The client index.
 * @return              True if the client is immune, false otherwise.
 */
bool IsClientImmune(int client)
{
    char sFlags[32];
    g_hImmunityFlags.GetString(sFlags, sizeof(sFlags));

    // If no flags are set, no one is immune
    if (sFlags[0] == '\0')
    {
        return false;
    }

    // Check if the client has the required admin flags
    int iFlags = ReadFlagString(sFlags);
    return (GetUserFlagBits(client) & iFlags) != 0;
}

/**
 * Forces the player's class selection VGUI menu open.
 *
 * @param client        The client index.
 */
void ForcePlayerClassMenu(int client)
{
    // Get the correct VGUI panel name based on team
    int team = GetClientTeam(client);
    char panelName[32];
    if (team == 2) // TFTeam_Red
    {
        strcopy(panelName, sizeof(panelName), "class_red");
    }
    else if (team == 3) // TFTeam_Blue
    {
        strcopy(panelName, sizeof(panelName), "class_blue");
    }
    else // Spectator or other? Default to red, though ideally they should be forced to pick a team first.
    {
        strcopy(panelName, sizeof(panelName), "class_red");
    }

    // Show the panel
    ShowVGUIPanel(client, panelName);
    
    // Only set class to Unknown if player is in spawn area to avoid glitching
    if (TF2_IsPlayerInCondition(client, TFCond_SpawnOutline))
    {
        TF2_SetPlayerClass(client, TFClass_Unknown);
    }
}

/**
 * Emits a class-specific "no" sound to the client.
 *
 * @param client        The client index.
 * @param deniedClass   The class that was denied.
 */
void EmitDenySound(int client, TFClassType deniedClass)
{
    char soundPath[64];
    switch (deniedClass)
    {
        case TFClass_Scout:     Format(soundPath, sizeof(soundPath), "vo/scout_no03.mp3");
        case TFClass_Sniper:    Format(soundPath, sizeof(soundPath), "vo/sniper_no04.mp3");
        case TFClass_Soldier:   Format(soundPath, sizeof(soundPath), "vo/soldier_no01.mp3");
        case TFClass_DemoMan:   Format(soundPath, sizeof(soundPath), "vo/demoman_no03.mp3");
        case TFClass_Medic:     Format(soundPath, sizeof(soundPath), "vo/medic_no03.mp3");
        case TFClass_Heavy:     Format(soundPath, sizeof(soundPath), "vo/heavy_no02.mp3");
        case TFClass_Pyro:      Format(soundPath, sizeof(soundPath), "vo/pyro_no01.mp3");
        case TFClass_Spy:       Format(soundPath, sizeof(soundPath), "vo/spy_no02.mp3");
        case TFClass_Engineer:  Format(soundPath, sizeof(soundPath), "vo/engineer_no03.mp3");
        default: return; // No sound for unknown class
    }

    // Ensure the sound is precached (should be from OnMapStart, but belt-and-suspenders)
    // PrecacheSound(soundPath); // PrecacheSound outside of gameplay loops is better

    EmitSoundToClient(client, soundPath);
}

// --- Configuration Loading ---

/**
 * Reloads the group limits configuration from the file specified by the convar.
 */
public Action Cmd_ReloadConfig(int client, int args)
{
    if (client > 0) // Command executed by a player
    {
         PrintToChat(client," \x04[SM]\x01 Reloading grouped class limits configuration...");
    }
    LogAction(client, -1, "\"%L\" reloaded the grouped class limits configuration.", client);

    LoadGroupLimitsConfig();

    if (client > 0)
    {
        PrintToChat(client," \x04[SM]\x01 Configuration reloaded.");
    }
    return Plugin_Handled;
}

/**
 * Loads a specific group limits configuration file.
 * Usage: sm_load_classlimits <filename>
 */
public Action Cmd_LoadConfig(int client, int args)
{
    if (args < 1)
    {
        if (client > 0)
        {
            PrintToChat(client, " \x04[SM]\x01 Usage: sm_load_classlimits <filename>");
        }
        else
        {
            PrintToServer("Usage: sm_load_classlimits <filename>");
        }
        return Plugin_Handled;
    }

    char filename[PLATFORM_MAX_PATH];
    GetCmdArg(1, filename, sizeof(filename));

    // Update the convar with the new filename
    g_hConfigFile.SetString(filename);

    if (client > 0)
    {
        PrintToChat(client, " \x04[SM]\x01 Loading class limits configuration from '%s'...", filename);
    }
    LogAction(client, -1, "\"%L\" loaded the grouped class limits configuration file '%s'.", client, filename);

    // Load the specified config
    LoadGroupLimitsConfig();

    if (client > 0)
    {
        PrintToChat(client, " \x04[SM]\x01 Configuration loaded.");
    }
    return Plugin_Handled;
}

/**
 * Loads and parses the KeyValues configuration file.
 */
void LoadGroupLimitsConfig()
{
    // Clear existing data first
    ClearGroupLimits();

    char configPath[PLATFORM_MAX_PATH];
    g_hConfigFile.GetString(configPath, sizeof(configPath));

    char fullPath[PLATFORM_MAX_PATH];
    char extlessPath[PLATFORM_MAX_PATH];
    char gamePath[PLATFORM_MAX_PATH];
    bool fileFound = false;
    
    // First, try to load from the SourceMod configs directory
    BuildPath(Path_SM, fullPath, sizeof(fullPath), "configs/%s", configPath);
    
    // Check if the path already includes .cfg extension
    bool hasExtension = StrContains(fullPath, ".cfg", false) != -1;
    
    // If no extension is provided, make a copy of the path without extension
    if (!hasExtension) {
        strcopy(extlessPath, sizeof(extlessPath), fullPath);
        Format(fullPath, sizeof(fullPath), "%s.cfg", extlessPath);
    }
    
    // Check if file exists in SourceMod configs
    fileFound = FileExists(fullPath);
    
    // If not found, try the direct path (might be absolute)
    if (!fileFound) {
        if (hasExtension) {
            strcopy(fullPath, sizeof(fullPath), configPath);
        } else {
            Format(fullPath, sizeof(fullPath), "%s.cfg", configPath);
        }
        
        fileFound = FileExists(fullPath);
    }
    
    // If still not found, try in /tf/cfg/
    if (!fileFound) {
        // Get the game directory path
        GetGameFolderName(gamePath, sizeof(gamePath));
        
        if (hasExtension) {
            Format(fullPath, sizeof(fullPath), "cfg/%s", configPath);
        } else {
            Format(fullPath, sizeof(fullPath), "cfg/%s.cfg", configPath);
        }
        
        // Try to build the path relative to the game directory
        char gameFullPath[PLATFORM_MAX_PATH];
        Format(gameFullPath, sizeof(gameFullPath), "../../%s/%s", gamePath, fullPath);
        
        fileFound = FileExists(gameFullPath);
        if (fileFound) {
            strcopy(fullPath, sizeof(fullPath), gameFullPath);
        }
    }

    if (!FileExists(fullPath))
    {
        LogError("Grouped class limits config file not found: %s", fullPath);
        return;
    }

    KeyValues kv = new KeyValues("GroupedClassLimits");
    if (!kv.ImportFromFile(fullPath))
    {
        LogError("Failed to import KeyValues from config file: %s", fullPath);
        delete kv;
        return;
    }

    // Navigate to the root section (optional if file root is the main key)
    // if (!kv.GotoFirstSubKey()) { ... error ... }

    // Iterate through each group defined in the config
    if (kv.GotoFirstSubKey(false)) // false = don't create key if missing
    {
        do
        {
            char groupName[64];
            kv.GetSectionName(groupName, sizeof(groupName));

            int limit = kv.GetNum("limit", -1); // Default to -1 (no limit) if key missing

            // Validate the limit
            if (limit < 0)
            {
                LogMessage("Group '%s' has an invalid or missing 'limit' (< 0). Skipping.", groupName);
                continue; // Skip this group
            }

            // Create a new group
            int groupIndex = g_GroupCount;
            PushArrayCell(g_LimitGroups, groupIndex);
            
            // Store the limit
            g_GroupLimits[groupIndex] = limit;
            
            // Create array for classes in this group
            Handle classArray = CreateArray();
            PushArrayCell(g_GroupClasses, classArray);
            
            g_GroupCount++;

            // Navigate to the "classes" subkey within this group
            if (kv.JumpToKey("classes"))
            {
                // Iterate through each class listed in the "classes" section
                if (kv.GotoFirstSubKey(false))
                {
                    do
                    {
                        char className[32];
                        kv.GetSectionName(className, sizeof(className));
                        TFClassType classType = MapClassNameToEnum(className);

                        if (classType != TFClass_Unknown)
                        {
                            AddClassToGroup(groupIndex, classType);
                            // LogMessage("Added class %s (%d) to group %s", className, view_as<int>(classType), groupName);
                        }
                        else
                        {
                            LogMessage("Unknown class name '%s' found in group '%s'. Skipping.", className, groupName);
                        }
                    } while (kv.GotoNextKey(false));

                    kv.GoBack(); // Go back from classes list
                }
                else
                {
                    LogMessage("Group '%s' has an empty 'classes' section. Group will have no effect.", groupName);
                }
                
                kv.GoBack(); // Go back from classes key to the group key
            }
            else
            {
                LogMessage("Group '%s' is missing the 'classes' section. Group will have no effect.", groupName);
            }

            // Check if group has any classes
            Handle currentClassArray = GetArrayCell(g_GroupClasses, groupIndex);
            if (GetArraySize(currentClassArray) == 0)
            {
                // Clean up the empty group
                CloseHandle(currentClassArray);
                
                // Remove from the arrays
                RemoveFromArray(g_GroupClasses, groupIndex);
                RemoveFromArray(g_LimitGroups, groupIndex);
                g_GroupCount--;
            }

        } while (kv.GotoNextKey(false)); // Move to the next group definition
    }
    else
    {
        LogMessage("Configuration file '%s' appears to be empty or has no group definitions.", fullPath);
    }

    // Clean up KeyValues object
    delete kv;

    LogMessage("Loaded %d class limit groups from '%s'.", g_GroupCount, fullPath);
}

/**
 * Clears the global list of limit groups and frees associated memory.
 */
void ClearGroupLimits()
{
    if (g_GroupClasses != INVALID_HANDLE && GetArraySize(g_GroupClasses) > 0)
    {
        // Delete each class array stored in g_GroupClasses
        for (int i = 0; i < GetArraySize(g_GroupClasses); i++)
        {
            Handle classArray = GetArrayCell(g_GroupClasses, i);
            if (classArray != INVALID_HANDLE)
            {
                CloseHandle(classArray);
            }
        }
        
        // Clear the arrays
        ClearArray(g_GroupClasses);
        ClearArray(g_LimitGroups);
        g_GroupCount = 0;
    }
}


// --- Utility Functions ---

/**
 * Maps a TF2 class name string (case-insensitive) to its TFClassType enum.
 *
 * @param className     The string name of the class (e.g., "scout", "heavyweapons").
 * @return              The corresponding TFClassType enum, or TFClass_Unknown if not found.
 */
TFClassType MapClassNameToEnum(const char[] className)
{
    if (StrEqual(className, "scout", false))        return TFClass_Scout;
    if (StrEqual(className, "soldier", false))      return TFClass_Soldier;
    if (StrEqual(className, "pyro", false))         return TFClass_Pyro;
    if (StrEqual(className, "demoman", false))      return TFClass_DemoMan;
    if (StrEqual(className, "heavyweapons", false) || StrEqual(className, "heavy", false)) return TFClass_Heavy; // Allow "heavy" as alias
    if (StrEqual(className, "engineer", false))     return TFClass_Engineer;
    if (StrEqual(className, "medic", false))        return TFClass_Medic;
    if (StrEqual(className, "sniper", false))       return TFClass_Sniper;
    if (StrEqual(className, "spy", false))          return TFClass_Spy;

    return TFClass_Unknown; // Not found
}

/**
 * Gets the standard TF2 class name string from a TFClassType enum.
 *
 * @param classType     The TFClassType enum.
 * @return              A string buffer containing the class name.
 */
stock char[] TF2_GetClassName(TFClassType classType)
{
    char buffer[16];
    
    switch (classType)
    {
        case TFClass_Scout:     strcopy(buffer, sizeof(buffer), "Scout");
        case TFClass_Sniper:    strcopy(buffer, sizeof(buffer), "Sniper");
        case TFClass_Soldier:   strcopy(buffer, sizeof(buffer), "Soldier");
        case TFClass_DemoMan:   strcopy(buffer, sizeof(buffer), "Demoman");
        case TFClass_Medic:     strcopy(buffer, sizeof(buffer), "Medic");
        case TFClass_Heavy:     strcopy(buffer, sizeof(buffer), "Heavy");
        case TFClass_Pyro:      strcopy(buffer, sizeof(buffer), "Pyro");
        case TFClass_Spy:       strcopy(buffer, sizeof(buffer), "Spy");
        case TFClass_Engineer:  strcopy(buffer, sizeof(buffer), "Engineer");
        default:                strcopy(buffer, sizeof(buffer), "Unknown");
    }
    
    return buffer;
}