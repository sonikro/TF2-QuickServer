#include <sourcemod>
#include <adminmenu>

#pragma semicolon 1
#pragma newdecls required

#define PLUGIN_VERSION "1.1.0"
#define MAX_LEAGUE_NAME 64
#define MAX_CFG_NAME 128
#define MAX_DISPLAY_NAME 128

TopMenu g_hAdminMenu = null;
ConVar g_cvarConfigPath;
char g_sConfigPath[PLATFORM_MAX_PATH];
char g_sClientLeague[MAXPLAYERS + 1][MAX_LEAGUE_NAME];

public Plugin myinfo = 
{
	name = "League CFGs",
	author = "TF2-QuickServer",
	description = "Adds a categorized league CFG menu to the !admin menu",
	version = PLUGIN_VERSION,
	url = "https://github.com/sonikro/TF2-QuickServer"
};

public void OnPluginStart()
{
	CreateConVar("league_cfgs_version", PLUGIN_VERSION, 
		"League CFGs plugin version", FCVAR_NOTIFY | FCVAR_DONTRECORD);
	
	g_cvarConfigPath = CreateConVar("league_cfgs_config", "configs/league_cfgs.cfg", 
		"Path to the league CFGs config file (relative to sourcemod/configs)");
	
	// Build the config path
	BuildConfigPath();
	
	// Register direct chat command (admin-only: requires "config" flag)
	RegAdminCmd("sm_cfgs", Command_LeagueCFGs, ADMFLAG_CONFIG, 
		"Opens the League CFGs menu");
	
	// Hook into admin menu if it's already loaded
	TopMenu topmenu;
	if (LibraryExists("adminmenu") && ((topmenu = GetAdminTopMenu()) != null))
	{
		OnAdminMenuReady(topmenu);
	}
	
	// Auto-generate cfg file so ConVars persist
	AutoExecConfig(true, "plugin.league_cfgs");
}

void BuildConfigPath()
{
	char relativePath[PLATFORM_MAX_PATH];
	GetConVarString(g_cvarConfigPath, relativePath, sizeof(relativePath));
	BuildPath(Path_SM, g_sConfigPath, sizeof(g_sConfigPath), relativePath);
}

public void OnConfigsExecuted()
{
	// Re-read config path after server configs have been processed
	BuildConfigPath();
}

public void OnMapStart()
{
	BuildConfigPath();
}

public void OnClientDisconnect(int client)
{
	g_sClientLeague[client][0] = '\0';
}

public void OnLibraryAdded(const char[] name)
{
	if (StrEqual(name, "adminmenu", false))
	{
		TopMenu topmenu = GetAdminTopMenu();
		if (topmenu != null)
		{
			OnAdminMenuReady(topmenu);
		}
	}
}

public void OnLibraryRemoved(const char[] name)
{
	if (StrEqual(name, "adminmenu", false))
	{
		g_hAdminMenu = null;
	}
}

public void OnAdminMenuReady(Handle aTopMenu)
{
	TopMenu topmenu = TopMenu.FromHandle(aTopMenu);
	
	if (topmenu == g_hAdminMenu)
		return;
	
	g_hAdminMenu = topmenu;
	
	// Add "League CFGs" as an item under "ServerCommands" in the admin menu
	TopMenuObject serverCmds = FindTopMenuCategory(g_hAdminMenu, ADMINMENU_SERVERCOMMANDS);
	
	if (serverCmds != INVALID_TOPMENUOBJECT)
	{
		AddToTopMenu(
			g_hAdminMenu,
			"league_cfgs",
			TopMenuObject_Item,
			AdminMenu_LeagueItemHandler,
			serverCmds,
			"sm_cfgs",
			ADMFLAG_CONFIG);
	}
}

public void AdminMenu_LeagueItemHandler(TopMenu topmenu, TopMenuAction action,
	TopMenuObject object_id, int param, char[] buffer, int maxlength)
{
	switch (action)
	{
		case TopMenuAction_DisplayOption:
		{
			strcopy(buffer, maxlength, "League CFGs");
		}
		case TopMenuAction_SelectOption:
		{
			DisplayLeagueMenu(param);
		}
	}
}

public Action Command_LeagueCFGs(int client, int args)
{
	if (client == 0)
	{
		ReplyToCommand(client, "[League CFGs] This command can only be used in-game.");
		return Plugin_Handled;
	}
	
	DisplayLeagueMenu(client);
	return Plugin_Handled;
}

void DisplayLeagueMenu(int client)
{
	Menu menu = new Menu(MenuHandler_LeagueSelect);
	menu.SetTitle("League CFGs:");
	menu.ExitBackButton = true;
	
	KeyValues kv = new KeyValues("league_cfgs");
	if (kv.ImportFromFile(g_sConfigPath) && kv.GotoFirstSubKey())
	{
		char league[MAX_LEAGUE_NAME];
		char display[MAX_DISPLAY_NAME];
		
		do
		{
			kv.GetSectionName(league, sizeof(league));
			kv.GetString("display", display, sizeof(display), league);
			menu.AddItem(league, display);
		}
		while (kv.GotoNextKey());
	}
	else
	{
		menu.AddItem("", "No leagues configured (check config)", ITEMDRAW_DISABLED);
	}
	
	delete kv;
	
	if (menu.ItemCount == 0)
	{
		menu.AddItem("", "No leagues configured", ITEMDRAW_DISABLED);
	}
	
	menu.Display(client, MENU_TIME_FOREVER);
}

public int MenuHandler_LeagueSelect(Menu menu, MenuAction action, int param1, int param2)
{
	switch (action)
	{
		case MenuAction_Select:
		{
			char league[MAX_LEAGUE_NAME];
			menu.GetItem(param2, league, sizeof(league));
			
			// Store the league for back navigation
			strcopy(g_sClientLeague[param1], sizeof(g_sClientLeague[param1]), league);
			
			DisplayCFGMenu(param1, league);
		}
		case MenuAction_Cancel:
		{
			if (param2 == MenuCancel_ExitBack && g_hAdminMenu != null)
			{
				g_hAdminMenu.Display(param1, TopMenuPosition_LastCategory);
			}
		}
		case MenuAction_End:
		{
			delete menu;
		}
	}
	return 0;
}

void DisplayCFGMenu(int client, const char[] league)
{
	char displayName[MAX_DISPLAY_NAME];
	Menu menu = new Menu(MenuHandler_CFGSelect);
	menu.ExitBackButton = true;
	
	KeyValues kv = new KeyValues("league_cfgs");
	if (kv.ImportFromFile(g_sConfigPath) && kv.JumpToKey(league))
	{
		kv.GetString("display", displayName, sizeof(displayName), league);
		
		char title[256];
		Format(title, sizeof(title), "%s:", displayName);
		menu.SetTitle(title);
		
		// Export the league section to a temp file and parse key-value pairs
		// (GotoFirstSubKey doesn't enumerate flat key-value pairs — only sub-sections)
		char exportPath[PLATFORM_MAX_PATH];
		BuildPath(Path_SM, exportPath, sizeof(exportPath), "configs/__lcg_export.txt");
		kv.ExportToFile(exportPath);
		
		File file = OpenFile(exportPath, "r");
		if (file != null)
		{
			char line[1024];
			
			// Skip first two lines: section name and opening brace
			if (!IsEndOfFile(file)) ReadFileLine(file, line, sizeof(line));
			if (!IsEndOfFile(file)) ReadFileLine(file, line, sizeof(line));
			
			// Parse each line until closing brace
			while (!IsEndOfFile(file))
			{
				if (!ReadFileLine(file, line, sizeof(line)))
					break;
					
				TrimString(line);
				
				if (line[0] == '}' || line[0] == '\0')
					break;
				
				// Parse quoted key-value format: "key"\t"value"
				int firstQuote = -1, secondQuote = -1, thirdQuote = -1, fourthQuote = -1;
				int len = strlen(line);
				
				for (int i = 0; i < len; i++)
				{
					if (line[i] == '"')
					{
						if (firstQuote == -1) firstQuote = i;
						else if (secondQuote == -1) secondQuote = i;
						else if (thirdQuote == -1) thirdQuote = i;
						else if (fourthQuote == -1) { fourthQuote = i; break; }
					}
				}
				
				if (firstQuote != -1 && secondQuote != -1 && thirdQuote != -1 && fourthQuote != -1)
				{
					char cfgName[MAX_CFG_NAME];
					char cfgDisplay[MAX_DISPLAY_NAME];
					
					int nameLen = secondQuote - firstQuote - 1;
					int displayLen = fourthQuote - thirdQuote - 1;
					
					if (nameLen > 0 && nameLen < sizeof(cfgName))
						strcopy(cfgName, nameLen + 1, line[firstQuote + 1]);
					else
						strcopy(cfgName, sizeof(cfgName), "");
						
					if (displayLen > 0 && displayLen < sizeof(cfgDisplay))
						strcopy(cfgDisplay, displayLen + 1, line[thirdQuote + 1]);
					else
						strcopy(cfgDisplay, sizeof(cfgDisplay), cfgName);
					
					if (StrEqual(cfgName, "display"))
						continue;
					
					if (strlen(cfgName) > 0)
					{
						char entry[MAX_CFG_NAME + MAX_DISPLAY_NAME + 2];
						Format(entry, sizeof(entry), "%s|%s", cfgName, cfgDisplay);
						menu.AddItem(entry, cfgDisplay);
					}
				}
			}
			
			delete file;
		}
		
		DeleteFile(exportPath);
	}
	
	delete kv;
	
	if (menu.ItemCount == 0)
	{
		menu.AddItem("", "No CFGs available", ITEMDRAW_DISABLED);
	}
	
	menu.Display(client, MENU_TIME_FOREVER);
}

public int MenuHandler_CFGSelect(Menu menu, MenuAction action, int param1, int param2)
{
	switch (action)
	{
		case MenuAction_Select:
		{
			char entry[MAX_CFG_NAME + MAX_DISPLAY_NAME + 2];
			menu.GetItem(param2, entry, sizeof(entry));
			
			char parts[2][MAX_CFG_NAME];
			ExplodeString(entry, "|", parts, 2, sizeof(parts[]));
			
			char cfgName[MAX_CFG_NAME];
			char cfgDisplay[MAX_DISPLAY_NAME];
			strcopy(cfgName, sizeof(cfgName), parts[0]);
			strcopy(cfgDisplay, sizeof(cfgDisplay), parts[1]);
			
			if (!IsValidCFGName(cfgName))
			{
				LogError("[League CFGs] Attempted to exec invalid CFG name '%s' (client %d)", cfgName, param1);
				PrintToChat(param1, " \x04[League CFGs]\x01 Invalid CFG name: \x05%s", cfgDisplay);
				return 0;
			}
			
			// Execute the config on the server
			ServerCommand("exec %s", cfgName);
			
			PrintToChat(param1, " \x04[League CFGs]\x01 Executed config: \x05%s", cfgDisplay);
		}
		case MenuAction_Cancel:
		{
			if (param2 == MenuCancel_ExitBack)
			{
				// Go back to league selection menu
				DisplayLeagueMenu(param1);
			}
		}
		case MenuAction_End:
		{
			delete menu;
		}
	}
	return 0;
}

/**
 * Validates that a CFG name contains only safe characters
 * (alphanumeric, underscores, hyphens, dots, slashes).
 * This prevents command injection via ServerCommand("exec %s", ...).
 */
bool IsValidCFGName(const char[] name)
{
	int len = strlen(name);
	if (len == 0 || len >= MAX_CFG_NAME)
		return false;
	
	for (int i = 0; i < len; i++)
	{
		char c = name[i];
		if (!IsCharAlpha(c) && !IsCharNumeric(c) && c != '_' && c != '-' && c != '.' && c != '/')
			return false;
	}
	
	return true;
}


