// This file relates to all convars and will contain the functions for them

Action Event_PlayerSpawn(Event event, const char[] name, bool dontBroadcast)
{
  int client            = GetClientOfUserId(event.GetInt("userid"));
  arrbPlyIsDead[client] = false;
  RemoveShotty(client);
  if (TF2_GetPlayerClass(client) == TFClass_DemoMan) { QueryClientConVar(client, "m_filter", FilterCheck, false); }

  return Plugin_Handled;
}

Action OnChangeClass(int client, const char[] strCommand, int args)
{
  // class limits; demo = 1, med = 1, soldier = 3
  // essentially we just check every time someone changes class if the class change is possible. i dont like doing it this way but alternative is dhooks :vomit:
  char sChosenClass[12];
  bool demo  = false;
  bool med   = false;
  int  solly = 0;
  GetCmdArg(1, sChosenClass, sizeof(sChosenClass));
  TFClassType class  = TF2_GetClass(sChosenClass);
  TFTeam currentTeam = TF2_GetClientTeam(client);
  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x)) continue;
    if (TF2_GetClientTeam(x) == currentTeam)
    {
      TFClassType classcheck = TF2_GetPlayerClass(x);
      if (classcheck == TFClass_Soldier) solly++;
      else if (classcheck == TFClass_DemoMan) demo = true;
      else if (classcheck == TFClass_Medic) med = true;
    }
  }
  if (arrbPlyIsDead[client] == true && bSwitchDuringRespawn.BoolValue)
  {
    if (class == TFClass_Medic && med) return Plugin_Handled;
    else if (class == TFClass_DemoMan && demo) return Plugin_Handled;
    else if (class == TFClass_Soldier && solly > 2) return Plugin_Handled;
    if (class != TFClass_Unknown && class != TFClass_Pyro && class != TFClass_Heavy && class != TFClass_Engineer && class != TFClass_Spy && class != TFClass_Sniper && class != TFClass_Scout)
    {
      SetEntProp(client, Prop_Send, "m_iDesiredPlayerClass", class);
      PrintCenterText(client, "Class when spawned will be %s.", sChosenClass);
    }
    return Plugin_Handled;
  }
  return Plugin_Continue;
}

public void TF2_OnConditionAdded(int client, TFCond condition)
{
  if (condition == TFCond_PasstimeInterception && bStealBlurryOverlay.BoolValue)
  {
    ClientCommand(client, "r_screenoverlay \"\"");
  }
  if (condition == TFCond_Charging && TF2_GetPlayerClass(client) == TFClass_DemoMan)
  {
    CreateTimer(0.1, MultiCheck, client);
  }
}

Action Event_PlayerResup(Event event, const char[] name, bool dontBroadcast)
{
  int client = GetClientOfUserId(event.GetInt("userid"));
  RemoveShotty(client);

  return Plugin_Handled;
}

Action Command_PasstimeSuicide(int client, int args)
{
  ForcePlayerSuicide(client);
  ReplyToCommand(client, "[PASS] Committed suicide");
  return Plugin_Handled;
}

Action Command_PasstimeCoundownCaption(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlyCoundownCaptionSetting = true;
    else if (value == 0)
      arrbJackAcqSettings[client].bPlyCoundownCaptionSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieCountdownCaption, arrbJackAcqSettings[client].bPlyCoundownCaptionSetting);
      ReplyToCommand(client, "[PASS] JACK spawn timer captions: %s", arrbJackAcqSettings[client].bPlyCoundownCaptionSetting ? "ON" : "OFF");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

Action Command_PasstimeJackPickupHud(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlyHudTextSetting = true;
    else if (value == 0)
      arrbJackAcqSettings[client].bPlyHudTextSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieJACKPickupHud, arrbJackAcqSettings[client].bPlyHudTextSetting);
      ReplyToCommand(client, "[PASS] JACK pickup HUD text: %s", arrbJackAcqSettings[client].bPlyHudTextSetting ? "ON" : "OFF");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

Action Command_PasstimeJackPickupChat(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlyChatPrintSetting = true;
    if (value == 0)
      arrbJackAcqSettings[client].bPlyChatPrintSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieJACKPickupChat, arrbJackAcqSettings[client].bPlyChatPrintSetting);
      ReplyToCommand(client, "[PASS] JACK pickup chat text: %s", arrbJackAcqSettings[client].bPlyChatPrintSetting ? "ON" : "OFF");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

Action Command_PasstimeJackPickupSound(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlySoundSetting = true;
    if (value == 0)
      arrbJackAcqSettings[client].bPlySoundSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieJACKPickupSound, arrbJackAcqSettings[client].bPlySoundSetting);
      ReplyToCommand(client, "[PASS] JACK pickup sound: %s", arrbJackAcqSettings[client].bPlySoundSetting ? "ON" : "OFF");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

void RemoveShotty(int client)
{
  if (bEquipStockWeapons.BoolValue)
  {
    TFClassType class = TF2_GetPlayerClass(client);
    int iWep;
    if (class == TFClass_DemoMan || class == TFClass_Soldier) iWep = GetPlayerWeaponSlot(client, 1);
    else if (class == TFClass_Medic) iWep = GetPlayerWeaponSlot(client, 0);

    if (iWep >= 0)
    {
      char classname[64];
      GetEntityClassname(iWep, classname, sizeof(classname));

      if (StrEqual(classname, "tf_weapon_shotgun_soldier") || StrEqual(classname, "tf_weapon_pipebomblauncher"))
      {
        PrintToChat(client, "\x07ff0000[PASS] Shotgun/Stickies equipped");
        TF2_RemoveWeaponSlot(client, 1);
      }

      if (StrEqual(classname, "tf_weapon_syringegun_medic"))
      {
        PrintToChat(client, "\x07ff0000[PASS] Syringe Gun equipped");
        TF2_RemoveWeaponSlot(client, 0);
      }
    }
  }
}