#if !defined BLU
  #define BLU true
  #define RED false
#endif

enum
{
  MAX_MESSAGE_LENGTH = 192
}

static const char sGoalsLongFormat[]        = "\x073BC43B goals %d";
static const char sAssistsLongFormat[]      = "\x073bc48f assists %d";
static const char sSavesLongFormat[]        = "\x07ffff00 saves %d";
static const char sInterceptsLongFormat[]   = "\x07ff00ff intercepts %d";
static const char sStealsLongFormat[]       = "\x07ff8000 steals %d";
static const char sSplashesLongFormat[]     = "\x075bd4b3 splashes %d";

static const char sGoalsSimpleFormat[]      = "\x073BC43B GLS %d";
static const char sAssistsSimpleFormat[]    = "\x073bc48f AST %d";
static const char sSavesSimpleFormat[]      = "\x07ffff00 SAV %d";
static const char sInterceptsSimpleFormat[] = "\x07ff00ff INT %d";
static const char sStealsSimpleFormat[]     = "\x07ff8000 STL %d";
static const char sSplashesSimpleFormat[]   = "\x075bd4b3 SPL %d";

Action
  Command_PasstimeSimpleChatPrint(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlySimpleChatPrintSetting = true;
    else if (value == 0)
      arrbJackAcqSettings[client].bPlySimpleChatPrintSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieSimpleChatPrint, arrbJackAcqSettings[client].bPlySimpleChatPrintSetting);
      ReplyToCommand(client, "[PASS] Simple round chat summary: %s", arrbJackAcqSettings[client].bPlySimpleChatPrintSetting ? "ON" : "OFF");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

Action Command_PasstimeToggleChatPrint(int client, int args)
{
  int value = 0;
  if (GetCmdArgIntEx(1, value))
  {
    if (value == 1)
      arrbJackAcqSettings[client].bPlyDontPrintChatSetting = true;
    else if (value == 0)
      arrbJackAcqSettings[client].bPlyDontPrintChatSetting = false;
    if (value == 1 || value == 0)
    {
      SetCookieBool(client, cookieToggleChatPrint, arrbJackAcqSettings[client].bPlyDontPrintChatSetting);
      ReplyToCommand(client, "[PASS] Toggle round chat summary: %s", arrbJackAcqSettings[client].bPlyDontPrintChatSetting ? "OFF" : "ON");
    }
  }
  else
    ReplyToCommand(client, "[PASS] Invalid argument");
  return Plugin_Handled;
}

Action Timer_ShowMoreTF(Handle timer, any client)
{
  if (!IsValidClient(client))
    return Plugin_Stop;

  char   num[3];
  Handle Kv = CreateKeyValues("data");
  IntToString(MOTDPANEL_TYPE_URL, num, sizeof(num));
  KvSetString(Kv, "title", "MoreTF");
  KvSetString(Kv, "type", num);
  KvSetString(Kv, "msg", moreurl);
  KvSetNum(Kv, "customsvr", 1);
  ShowVGUIPanel(client, "info", Kv);
  CloseHandle(Kv);

  return Plugin_Stop;
}

// Clear all plugin stats for the specified client.
void ClearLocalStats(int client)
{
  arrbPlyIsDead[client]                         = false;
  arrbBlastJumpStatus[client]                   = false;
  arrbPanaceaCheck[client]                      = false;
  arrbWinStratCheck[client]                     = false;

  arriPlyRoundPassStats[client].iPlyScores      = 0;
  arriPlyRoundPassStats[client].iPlyAssists     = 0;
  arriPlyRoundPassStats[client].iPlySaves       = 0;
  arriPlyRoundPassStats[client].iPlySplashSaves = 0;
  arriPlyRoundPassStats[client].iPlyIntercepts  = 0;
  arriPlyRoundPassStats[client].iPlySteals      = 0;
  arriPlyRoundPassStats[client].iPlyPanaceas    = 0;
  arriPlyRoundPassStats[client].iPlyWinStrats   = 0;
  arriPlyRoundPassStats[client].iPlyDeathbombs  = 0;
  arriPlyRoundPassStats[client].iPlyHandoffs    = 0;
  arriPlyRoundPassStats[client].iPlyFirstGrabs  = 0;
  arriPlyRoundPassStats[client].iPlyCatapults   = 0;
  arriPlyRoundPassStats[client].iPlyBlocks      = 0;
  arriPlyRoundPassStats[client].iPlySteal2Saves = 0;
}

// this is really fucking sloppy but shrug
Action Timer_DisplayStats(Handle timer)
{
  int redTeam[16], bluTeam[16];
  int redAmount, bluAmount = 0;
  // calculate possession time
  int totalPossessionTime = iBluBallTime + iRedBallTime;

#if defined(VERBOSE)
  LogToGame("BluBallTime: %d, RedBallTime: %d, totalPossessionTime = %d", iBluBallTime, iRedBallTime, totalPossessionTime);
#endif
  float bluBallPossessionPercent;
  float redBallPossessionPercent;

  if (iBluBallTime == 0)
    bluBallPossessionPercent = 0.0;
  else
    bluBallPossessionPercent = (float(iBluBallTime) / float(totalPossessionTime));

  if (iRedBallTime == 0)
    redBallPossessionPercent = 0.0;
  else
    redBallPossessionPercent = (float(iRedBallTime) / float(totalPossessionTime));

  // example values:
  // red% = 54.53% (0.5453) 5453
  // blu% = 45.47% (0.4547) 4547
  int redTest = RoundToFloor(redBallPossessionPercent * 10000);
  int bluTest = RoundToFloor(bluBallPossessionPercent * 10000);
  // clean it up for spectators so the value adds up to a clean 100%
  if (redTest + bluTest != 10000)
  {
    redBallPossessionPercent += 0.0001
  }

  // for display
  redBallPossessionPercent *= 100;
  bluBallPossessionPercent *= 100;
  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x)) continue;

    if (TF2_GetClientTeam(x) == TFTeam_Red)
    {
      redTeam[redAmount] = x;
      redAmount++;
    }

    else if (TF2_GetClientTeam(x) == TFTeam_Blue) {
      bluTeam[bluAmount] = x;
      bluAmount++;
    }
  }
  // thanks rose! -lucy
  char arrStrRedTeamStats[MAXPLAYERS + 1][MAX_MESSAGE_LENGTH];
  char arrStrBluTeamStats[MAXPLAYERS + 1][MAX_MESSAGE_LENGTH];
  char arrStrRedSimpleStats[MAXPLAYERS + 1][MAX_MESSAGE_LENGTH];
  char arrStrBluSimpleStats[MAXPLAYERS + 1][MAX_MESSAGE_LENGTH];

  char arrStrConsoleStatsRed[MAXPLAYERS + 1][7][MAX_MESSAGE_LENGTH];
  char arrStrConsoleStatsBlu[MAXPLAYERS + 1][7][MAX_MESSAGE_LENGTH];

  GetTeamStatsArrStr(arrStrRedTeamStats, redTeam, redAmount);
  GetTeamStatsArrStr(arrStrBluTeamStats, bluTeam, bluAmount);

  GetTeamStatsArrStr(arrStrRedSimpleStats, redTeam, redAmount, true);
  GetTeamStatsArrStr(arrStrBluSimpleStats, bluTeam, bluAmount, true);

  GetConsoleStatsArrStr(arrStrConsoleStatsRed, redTeam, redAmount, RED);
  GetConsoleStatsArrStr(arrStrConsoleStatsBlu, bluTeam, bluAmount, BLU);

  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x)) continue;
    if (arrbJackAcqSettings[x].bPlyDontPrintChatSetting) continue;

    LogToGame("Printing for client: %d", x);

    bool isStv               = IsClientSourceTV(x);
    bool shouldPrintBluFirst = (TF2_GetClientTeam(x) == TFTeam_Red);

    // smelly!
    if (arrbJackAcqSettings[x].bPlySimpleChatPrintSetting)
    {
      if (shouldPrintBluFirst)
      {
        PrintMultiline(x, arrStrBluSimpleStats, sizeof(arrStrBluSimpleStats));
        PrintMultiline(x, arrStrRedSimpleStats, sizeof(arrStrRedSimpleStats));
      }
      else
      {
        PrintMultiline(x, arrStrRedSimpleStats, sizeof(arrStrRedSimpleStats));
        PrintMultiline(x, arrStrBluSimpleStats, sizeof(arrStrBluSimpleStats));
      }
    }
    else
    {
      if (shouldPrintBluFirst)
      {
        PrintMultiline(x, arrStrBluTeamStats, sizeof(arrStrBluTeamStats));
        PrintMultiline(x, arrStrRedTeamStats, sizeof(arrStrRedTeamStats));
      }
      else
      {
        PrintMultiline(x, arrStrRedTeamStats, sizeof(arrStrRedTeamStats));
        PrintMultiline(x, arrStrBluTeamStats, sizeof(arrStrBluTeamStats));
      }
    }

    PrintToChat(x, "\x0700ffff[PASS] \x07C43F3BRED \x073BC43Bpossession: %.2f%%, \x074EA6C1BLU \x073BC43Bpossession: %.2f%%", redBallPossessionPercent, bluBallPossessionPercent);
    if (isStv)
    {
      PrintToChat(x, "[PASS-TV] BLU possession time in ticks: %d", iRedBallTime);
      PrintToChat(x, "[PASS-TV] RED possession time in ticks: %d", iBluBallTime);
    }
    else
    {
      Print3DMultilineToConsole(x, arrStrConsoleStatsBlu, sizeof(arrStrConsoleStatsBlu), sizeof(arrStrConsoleStatsBlu[]));
      Print3DMultilineToConsole(x, arrStrConsoleStatsRed, sizeof(arrStrConsoleStatsRed), sizeof(arrStrConsoleStatsRed[]));
    }
  }

  for (int i = 0; i < MaxClients + 1; i++)
    ClearLocalStats(i);

  return Plugin_Stop;
}

void GetTeamStatsArrStr(char buf[MAXPLAYERS + 1][MAX_MESSAGE_LENGTH], int[] teamMembers, int len, bool isSimple = false)
{
  for (int i = 0; i < len; i++)
  {
    char playerNameTeamFormatted[MAX_NAME_LENGTH + 7];
    FormatPlayerNameWithTeam(teamMembers[i], playerNameTeamFormatted);
    char stats[MAX_MESSAGE_LENGTH];
    AssembleColoredStatsString(stats, sizeof(stats), teamMembers[i], isSimple);
    char out[MAX_MESSAGE_LENGTH];
    Format(out, sizeof(out), "\x0700ffff[PASS] %s:%s", playerNameTeamFormatted, stats);
    buf[i] = out;
  }
}

// awkward indentation as "%d" takes up two spaces but it ends up being effectively single digit
static const char consoleFormatBlank[]    = "//                                                                        //";
static const char consoleFormatTitleBlu[] = "//   BLU | %s";
static const char consoleFormatTitleRed[] = "//   RED | %s";
static const char consoleFormat1[]        = "//   %d goals, %d assists, %d saves, %d intercepts, %d steals                  //";
static const char consoleFormat2[]        = "//   %d Panaceas, %d win strats, %d deathbombs, %d handoffs                   //";
static const char consoleFormat3[]        = "//   %d first grabs, %d catapults, %d blocks, %d steal2saves                  //";
static const char consoleFormat4[]        = "//   %d splash saves                                                       //";

// a player takes up 7 lines
// this is a sad amount of arguments
// three dimensional array structure:
// dimension 1: a player
// dimension 2: their stat strings

void              GetConsoleStatsArrStr(char buf[MAXPLAYERS + 1][7][MAX_MESSAGE_LENGTH], int[] teamMembers, int teamAmount, bool isBlu)
{
  for (int i = 0; i < teamAmount; i++)
  {
    char              playerName[MAX_NAME_LENGTH];
    int               player = teamMembers[i];
    enuiPlyRoundStats stats;
    stats = arriPlyRoundPassStats[player];
    GetClientName(player, playerName, sizeof(playerName));
    Format(buf[i][0], MAX_MESSAGE_LENGTH, consoleFormatBlank);
    if (isBlu)
    {
      Format(buf[i][1], MAX_MESSAGE_LENGTH, consoleFormatTitleBlu, playerName);
    }
    else
    {
      Format(buf[i][1], MAX_MESSAGE_LENGTH, consoleFormatTitleRed, playerName);
    }
    Format(buf[i][2], MAX_MESSAGE_LENGTH, consoleFormat1, stats.iPlyScores, stats.iPlyAssists, stats.iPlySaves, stats.iPlyIntercepts, stats.iPlySteals);
    Format(buf[i][3], MAX_MESSAGE_LENGTH, consoleFormat2, stats.iPlyPanaceas, stats.iPlyWinStrats, stats.iPlyDeathbombs, stats.iPlyHandoffs);
    Format(buf[i][4], MAX_MESSAGE_LENGTH, consoleFormat3, stats.iPlyFirstGrabs, stats.iPlyCatapults, stats.iPlyBlocks, stats.iPlySteal2Saves);
    Format(buf[i][5], MAX_MESSAGE_LENGTH, consoleFormat4, stats.iPlySplashSaves);
    Format(buf[i][6], MAX_MESSAGE_LENGTH, consoleFormatBlank);
  }
}

void PrintMultiline(int client, char[][] lines, int len)
{
  for (int i = 0; i < len; i++)
  {
    if (!StrEqual(lines[i], ""))
    {
      PrintToChat(client, lines[i]);
    }
  }
  return;
}

void Print3DMultilineToConsole(int client, char[][][] lines, int length, int height)
{
  for (int i = 0; i < length; i++)
  {
    for (int j = 0; j < height; j++)
    {
      if (!StrEqual(lines[i][j], ""))
      {
        PrintToConsole(client, lines[i][j]);
      }
    }
  }
}

/**
 * @param simplified whether to use the simplified 3 letter abbreviations (true) or long names (false)
 */
static void
  AssembleColoredStatsString(char[] buf, int maxLength, int client, bool simplified = false)
{
  VerboseLog("Assembling stats for client: %d", client);
  char sGoals[48];
  char sAssists[48];
  char sSaves[48];
  char sIntercepts[48];
  char sSteals[48];
  char sSplashes[48];
  if (simplified)
  {
    Format(sGoals, sizeof(sGoals), sGoalsSimpleFormat, arriPlyRoundPassStats[client].iPlyScores);
    Format(sAssists, sizeof(sAssists), sAssistsSimpleFormat, arriPlyRoundPassStats[client].iPlyAssists);
    Format(sSaves, sizeof(sSaves), sSavesSimpleFormat, arriPlyRoundPassStats[client].iPlySaves);
    Format(sIntercepts, sizeof(sIntercepts), sInterceptsSimpleFormat, arriPlyRoundPassStats[client].iPlyIntercepts);
    Format(sSteals, sizeof(sSteals), sStealsSimpleFormat, arriPlyRoundPassStats[client].iPlySteals);
    Format(sSplashes, sizeof(sSplashes), sSplashesSimpleFormat, arriPlyRoundPassStats[client].iPlySplashSaves);
  }
  else
  {
    Format(sGoals, sizeof(sGoals), sGoalsLongFormat, arriPlyRoundPassStats[client].iPlyScores);
    Format(sAssists, sizeof(sAssists), sAssistsLongFormat, arriPlyRoundPassStats[client].iPlyAssists);
    Format(sSaves, sizeof(sSaves), sSavesLongFormat, arriPlyRoundPassStats[client].iPlySaves);
    Format(sIntercepts, sizeof(sIntercepts), sInterceptsLongFormat, arriPlyRoundPassStats[client].iPlyIntercepts);
    Format(sSteals, sizeof(sSteals), sStealsLongFormat, arriPlyRoundPassStats[client].iPlySteals);
    Format(sSplashes, sizeof(sSplashes), sSplashesLongFormat, arriPlyRoundPassStats[client].iPlySplashSaves);
  }

  Format(buf, maxLength, "%s,%s,%s,%s,%s,%s", sGoals, sAssists, sSaves, sIntercepts, sSteals, sSplashes);
}
