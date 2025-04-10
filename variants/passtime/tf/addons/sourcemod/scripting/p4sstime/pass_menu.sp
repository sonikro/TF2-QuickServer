// This file relates to all menu features for player-specific settings and will contain the functions for them
bool GetCookieBool(int client, Cookie cookie)
{
  char value[11];
  cookie.Get(client, value, sizeof(value));

  if (!value[0])
    return false;

  // if it's not empty, it's true unless explicitly "0"
  return !StrEqual(value, "0");
}

void SetCookieBool(int client, Cookie cookie, bool state)
{
  if (AreClientCookiesCached(client))
  {
    char value[11];
    FormatEx(value, sizeof(value), "%d", state);
    cookie.Set(client, value);
  }
}

public OnClientCookiesCached(int client)
{
  arrbJackAcqSettings[client].bPlyCoundownCaptionSetting = GetCookieBool(client, cookieCountdownCaption);
  arrbJackAcqSettings[client].bPlyHudTextSetting         = GetCookieBool(client, cookieJACKPickupHud);
  arrbJackAcqSettings[client].bPlyChatPrintSetting       = GetCookieBool(client, cookieJACKPickupChat);
  arrbJackAcqSettings[client].bPlySoundSetting           = GetCookieBool(client, cookieJACKPickupSound);
  arrbJackAcqSettings[client].bPlySimpleChatPrintSetting = GetCookieBool(client, cookieSimpleChatPrint);
  arrbJackAcqSettings[client].bPlyDontPrintChatSetting   = GetCookieBool(client, cookieToggleChatPrint);
}

Action Command_PassMenu(int client, int args)
{
  if (IsValidClient(client))
    ShowPassMenu(client);
  return Plugin_Handled;
}

void ShowPassMenu(int client)
{
  mPassMenu = new Menu(PassMenuHandler);
  mPassMenu.SetTitle("P4SS Menu");

  char buffer[2048];

  FormatEx(buffer, sizeof(buffer), "%s: %s", "JACK spawn timer captions", arrbJackAcqSettings[client].bPlyCoundownCaptionSetting ? "ON" : "OFF");
  mPassMenu.AddItem("countdowncaption", buffer);
  FormatEx(buffer, sizeof(buffer), "%s: %s", "JACK pickup HUD text", arrbJackAcqSettings[client].bPlyHudTextSetting ? "ON" : "OFF");
  mPassMenu.AddItem("jackpickuphud", buffer);
  FormatEx(buffer, sizeof(buffer), "%s: %s", "JACK pickup chat text", arrbJackAcqSettings[client].bPlyChatPrintSetting ? "ON" : "OFF");
  mPassMenu.AddItem("jackpickupchat", buffer);
  FormatEx(buffer, sizeof(buffer), "%s: %s", "JACK pickup sound", arrbJackAcqSettings[client].bPlySoundSetting ? "ON" : "OFF");
  mPassMenu.AddItem("jackpickupsound", buffer);
  FormatEx(buffer, sizeof(buffer), "%s: %s", "Simple chat round summary", arrbJackAcqSettings[client].bPlySimpleChatPrintSetting ? "ON" : "OFF");
  mPassMenu.AddItem("simpleprint", buffer);
  FormatEx(buffer, sizeof(buffer), "%s: %s", "Toggle chat round summary", arrbJackAcqSettings[client].bPlyDontPrintChatSetting ? "OFF" : "ON");
  mPassMenu.AddItem("toggleprint", buffer);

  mPassMenu.Display(client, MENU_TIME_FOREVER);
}

int PassMenuHandler(Menu menu, MenuAction action, int param1, int param2)
{
  if (action == MenuAction_Select)
  {
    char info[32], display[255];
    mPassMenu.GetItem(param2, info, sizeof(info), _, display, sizeof(display));
    if (StrEqual(info, "countdowncaption"))
    {
      arrbJackAcqSettings[param1].bPlyCoundownCaptionSetting = !arrbJackAcqSettings[param1].bPlyCoundownCaptionSetting;
      SetCookieBool(param1, cookieCountdownCaption, arrbJackAcqSettings[param1].bPlyCoundownCaptionSetting);
      ShowPassMenu(param1);
    }
    if (StrEqual(info, "jackpickuphud"))
    {
      arrbJackAcqSettings[param1].bPlyHudTextSetting = !arrbJackAcqSettings[param1].bPlyHudTextSetting;
      SetCookieBool(param1, cookieJACKPickupHud, arrbJackAcqSettings[param1].bPlyHudTextSetting);
      ShowPassMenu(param1);
    }
    else if (StrEqual(info, "jackpickupchat"))
    {
      arrbJackAcqSettings[param1].bPlyChatPrintSetting = !arrbJackAcqSettings[param1].bPlyChatPrintSetting;
      SetCookieBool(param1, cookieJACKPickupChat, arrbJackAcqSettings[param1].bPlyChatPrintSetting);
      ShowPassMenu(param1);
    }
    else if (StrEqual(info, "jackpickupsound"))
    {
      arrbJackAcqSettings[param1].bPlySoundSetting = !arrbJackAcqSettings[param1].bPlySoundSetting;
      SetCookieBool(param1, cookieJACKPickupSound, arrbJackAcqSettings[param1].bPlySoundSetting);
      ShowPassMenu(param1);
    }
    else if (StrEqual(info, "simpleprint"))
    {
      arrbJackAcqSettings[param1].bPlySimpleChatPrintSetting = !arrbJackAcqSettings[param1].bPlySimpleChatPrintSetting;
      SetCookieBool(param1, cookieSimpleChatPrint, arrbJackAcqSettings[param1].bPlySimpleChatPrintSetting);
      ShowPassMenu(param1);
    }
    else if (StrEqual(info, "toggleprint"))
    {
      arrbJackAcqSettings[param1].bPlyDontPrintChatSetting = !arrbJackAcqSettings[param1].bPlyDontPrintChatSetting;
      SetCookieBool(param1, cookieToggleChatPrint, arrbJackAcqSettings[param1].bPlyDontPrintChatSetting);
      ShowPassMenu(param1);
    }
  }
  return 0;  // just do this to get rid of warning
}