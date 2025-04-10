#undef REQUIRE_PLUGIN
#include "include/updater.inc"
#define REQUIRE_PLUGIN

#include <tf2_stocks>
#include <sdkhooks>
//#include <dhooks>
#include <clientprefs>
#include <sdktools_functions>

#pragma semicolon 1  // required for logs.tf
#pragma newdecls required

#define VERSION         "2.5.0"

#define GOALSCOLOR      "\x073BC43B"
#define ASSISTSCOLOR    "\x073bc48f"
#define SAVESCOLOR      "\x07ffff00"
#define INTERCEPTSCOLOR "\x07ff00ff"
#define STEALSCOLOR     "\x07ff8000"
#define SPLASHESCOLOR   "\x075bd4b3"

enum
{
  COLOR_FORMAT_LENGTH        = 7,
  MAX_TEAMFORMAT_NAME_LENGTH = COLOR_FORMAT_LENGTH + MAX_NAME_LENGTH,
  MAX_ENTITIES               = 4096,
  GOALIE_DISTANCE            = 200
}

// enum BallState
// {
// 	STATE_OUT_OF_PLAY,
// 	STATE_FREE,
// 	STATE_CARRIED
// };

enum struct enubPlyJackSettings
{
  bool bPlyCoundownCaptionSetting;
  bool bPlyHudTextSetting;
  bool bPlyChatPrintSetting;
  bool bPlySoundSetting;
  // If true: simplify end-of-round chat summaries.
  bool bPlySimpleChatPrintSetting;
  // If true: do *not* print end-of-round summaries in chat.
  bool bPlyDontPrintChatSetting;
}

enum struct enuiPlyRoundStats
{
  int iPlyScores;
  int iPlyAssists;
  int iPlySaves;
  int iPlyIntercepts;
  int iPlySteals;
  int iPlySplashSaves;
  int iPlyPanaceas;
  int iPlyWinStrats;
  int iPlyDeathbombs;
  int iPlyHandoffs;
  int iPlyFirstGrabs;
  int iPlyCatapults;
  int iPlyBlocks;
  int iPlySteal2Saves;
}

enubPlyJackSettings arrbJackAcqSettings[MAXPLAYERS + 1];
enuiPlyRoundStats   arriPlyRoundPassStats[MAXPLAYERS + 1];

float               fBluGoalPos[3], fRedGoalPos[3], fTopSpawnPos[3], fFreeBallPos[3];

ConVar              bEquipStockWeapons;
ConVar              bSwitchDuringRespawn;
ConVar              bStealBlurryOverlay;
// ConVar							trikzEnable, trikzProjCollide, trikzProjDev;
ConVar              bDroppedItemsCollision;
ConVar              bPrintStats;
ConVar              bWinstratKills;
ConVar              bFunStats;
ConVar              bPracticeMode;
ConVar              bVerboseLogs;
ConVar              bMedicArrowsNeutralizeBall;

int                 iPlyWhoGotJack;
// int			plyDirecter;
int                 ibFirstGrabCheck;
int                 eiJack;
int                 eiPassTarget;
int                 ibBallSpawnedLower;
int                 iRoundResetTick;
int                 iWinStratDistance;
int                 eiDeathBomber;
int                 iBallPickedUpTick;
int                 iRedBallTime;
int                 iBluBallTime;
// int  			trikzProjCollideCurVal;
// int  			trikzProjCollideSave = 2;
Menu                mPassMenu;
bool                bWaitingForBallSpawnToRestart;
bool                bHalloweenMode;
bool                bBallLoose;         // Is the ball currently loose (is the passtime_ball entity on the map)?
TFTeam              eLastTickBallTeam;  // in effect, this is "last thrown ball team"
bool                arrbPlyIsDead[MAXPLAYERS + 1];
bool                arrbBlastJumpStatus[MAXPLAYERS + 1];  // true if blast jumping, false if has landed
bool                arrbPanaceaCheck[MAXPLAYERS + 1];
bool                arrbWinStratCheck[MAXPLAYERS + 1];
bool                arrbDeathbombCheck[MAXPLAYERS + 1];
// bool			plyTakenDirectHit[MAXPLAYERS + 1];
Cookie              cookieCountdownCaption, cookieJACKPickupHud, cookieJACKPickupChat, cookieJACKPickupSound, cookieSimpleChatPrint, cookieToggleChatPrint;

// log variables
int                 user1;
char                user1steamid[16];
char                user1team[12];
float               user1position[3];
int                 user2;
char                user2steamid[16];
char                user2team[12];
float               user2position[3];

// stats menu variables
char                moreurl[128];

public Plugin myinfo =
{
  name        = "4v4 PASS Time Extension",
  author      = "https://discord.passtime.tf/",
  description = "The main plugin for 4v4 Competitive PASS Time. This version was forked from https://github.com/blakeplusplus/p4sstime/.`",
  version     = VERSION,
  url         = "https://github.com/prplnorangesoda/p4sstime/releases"
};

public void OnPluginStart()
{
  /*GameData gamedata = new GameData("p4sstime");
  if (gamedata)
  {
    DHooks_Initialize(gamedata);
    delete gamedata;
  }*/

  cookieCountdownCaption = RegClientCookie("p4ssClientCountdownCaption", "p4sstime's client setting (1/0) for captions for JACK spawn timer", CookieAccess_Public);
  cookieJACKPickupHud    = RegClientCookie("p4ssClientJACKPickupHudText", "p4sstime's client setting (1/0) for HUD text when picking up JACK", CookieAccess_Public);
  cookieJACKPickupChat   = RegClientCookie("p4ssClientJACKPickupChatMsg", "p4sstime's client setting (1/0) for chat msg when picking up JACK", CookieAccess_Public);
  cookieJACKPickupSound  = RegClientCookie("p4ssClientJACKPickupSound", "p4sstime's client setting (1/0) for sound when picking up JACK", CookieAccess_Public);
  cookieSimpleChatPrint  = RegClientCookie("p4ssClientSimpleChatPrint", "p4sstime's client setting (1/0) for simple EoR chat prints", CookieAccess_Public);
  cookieToggleChatPrint  = RegClientCookie("p4ssClientToggleChatPrint", "p4sstime's client setting (1/0) for toggling EoR chat prints", CookieAccess_Public);

  RegConsoleCmd("sm_pt_menu", Command_PassMenu);
  RegConsoleCmd("sm_pt_suicide", Command_PasstimeSuicide);
  RegConsoleCmd("sm_pt_countdowncaption", Command_PasstimeCoundownCaption);
  RegConsoleCmd("sm_pt_jackpickup_hud", Command_PasstimeJackPickupHud);
  RegConsoleCmd("sm_pt_jackpickup_chat", Command_PasstimeJackPickupChat);
  RegConsoleCmd("sm_pt_jackpickup_sound", Command_PasstimeJackPickupSound);
  RegConsoleCmd("sm_pt_simplechatprint", Command_PasstimeSimpleChatPrint);
  RegConsoleCmd("sm_pt_togglechatprint", Command_PasstimeToggleChatPrint);
  RegAdminCmd("sm_ptsnapshot", Command_GamestateSnapshot, ADMFLAG_GENERIC, "Take a snapshot of the plugin's current variable values.");
  RegAdminCmd("sm_ptspawnball", Command_PasstimeSpawnBall, ADMFLAG_CONFIG, "Spawn the ball forcefully, by game starting and tournament restarting.");

  HookEvent("player_spawn", Event_PlayerSpawn);
  HookEvent("post_inventory_application", Event_PlayerResup);
  HookEvent("player_death", Event_PlayerDeath);
  HookEvent("pass_get", Event_PassGet);
  HookEvent("pass_free", Event_PassFree);
  HookEvent("pass_ball_stolen", Event_PassStolen);
  HookEvent("pass_score", Event_PassScore);
  HookEvent("pass_pass_caught", Event_PassCaught);
  HookEvent("pass_ball_blocked", Event_PassBallBlocked);
  HookEvent("rocket_jump", Event_RJ);
  HookEvent("rocket_jump_landed", Event_RJLand);
  HookEvent("sticky_jump", Event_SJ);
  HookEvent("sticky_jump_landed", Event_SJLand);
  HookEvent("teamplay_pre_round_time_left", Event_PregameCountdown);
  HookEvent("teamplay_broadcast_audio", Event_MidgameCountdown);
  HookEvent("teamplay_round_win", Event_TeamWin);
  HookEvent("stats_resetround", Event_RoundReset);
  HookEntityOutput("trigger_catapult", "OnCatapulted", Hook_OnCatapult);
  HookEntityOutput("info_passtime_ball_spawn", "OnSpawnBall", Hook_OnSpawnBall);
  AddCommandListener(OnChangeClass, "joinclass");

  bEquipStockWeapons         = CreateConVar("sm_pt_stock_blocklist", "0", "If 1, disable ability to equip shotgun, stickies, and needles; this is needed as allowlists can't normally block stock weapons.", FCVAR_NOTIFY);
  bSwitchDuringRespawn       = CreateConVar("sm_pt_block_instant_respawn", "0", "If 1, disable class switch ability while dead to instantly respawn.", FCVAR_NOTIFY);
  bStealBlurryOverlay        = CreateConVar("sm_pt_disable_intercept_blur", "1", "If 1, disable blurry screen overlay after intercepting or stealing.", FCVAR_NOTIFY);
  bDroppedItemsCollision     = CreateConVar("sm_pt_disable_jack_drop_item_collision", "1", "If 1, disables the jack colliding with dropped ammo packs or weapons.", FCVAR_NOTIFY);
  bPrintStats                = CreateConVar("sm_pt_print_events", "0", "If 1, enables printing of passtime events to chat both during and after games. Does not affect logging.", FCVAR_NOTIFY);
  bFunStats                  = CreateConVar("sm_pt_print_events_fun", "0", "If sm_pt_print_events is 1, print additional fun stats, like stealing a goal from a teammate.", FCVAR_NOTIFY);
  bPracticeMode              = CreateConVar("sm_pt_practice", "0", "If 1, enables practice mode. When the round timer reaches 5 minutes, add 5 minutes to the timer.", FCVAR_NOTIFY, true, 0.0, true, 1.0);
  bWinstratKills             = CreateConVar("sm_pt_winstrat_kills", "0", "If 1, kills winstratters and prints \"tried to winstrat\" in chat.", FCVAR_NOTIFY);
  bVerboseLogs               = CreateConVar("sm_pt_logs_verbose", "0", "If 1, prints additional information to logs.");
  bMedicArrowsNeutralizeBall = CreateConVar("sm_pt_medic_can_splash", "1", "If 1, allows medic crossbow arrows to neutralize the ball.", FCVAR_NOTIFY);
  // trikzEnable	 = CreateConVar("sm_pt_trikz", "0", "Set 'trikz' mode. 1 adds friendly knockback for airshots, 2 adds friendly knockback for splash damage, 3 adds friendly knockback for everywhere", FCVAR_NOTIFY, true, 0.0, true, 3.0);
  // trikzProjCollide = CreateConVar("sm_pt_trikz_projcollide", "2", "Manually set team projectile collision behavior when trikz is on. 2 always collides, 1 will cause your projectiles to phase through if you are too close (default game behavior), 0 will cause them to never collide.", 0, true, 0.0, true, 2.0);
  // trikzProjDev = CreateConVar("sm_pt_trikz_projcollide_dev", "0", "DONOTUSE; This command is used solely by the plugin to change values. Changing this manually may cause issues.", FCVAR_HIDDEN, true, 0.0, true, 2.0);

  // HookConVarChange(trikzEnable, Hook_OnTrikzChange);
  // HookConVarChange(trikzProjCollide, Hook_OnProjCollideChange);
  // HookConVarChange(trikzProjDev, Hook_OnProjCollideDev);
  HookConVarChange(bPracticeMode, Hook_OnPracticeModeChange);

  /*for (int client = 1; client <= MaxClients; client++)
    if (IsClientInGame(client))
      OnClientPutInServer(client);*/
  for (int i = MaxClients; i > 0; --i)
  {
    if (!AreClientCookiesCached(i))
    {
      continue;
    }
    OnClientCookiesCached(i);
  }

  char sMapNameBuffer[256];
  GetCurrentMap(sMapNameBuffer, 256);
  VerboseLog("Current map buffer -> %s", sMapNameBuffer);
  // check if stadium is the current map in order to set the height lower
  // see OnMapInit
  // this is necessary as OnMapInit is not called when the plugin is ran
  if (StrContains(sMapNameBuffer, "stadium", false) != -1)
  {
    iWinStratDistance = 150;
  }
  else {
    iWinStratDistance = 400;
  }

  int jackIndex = FindEntityByClassname(-1, "passtime_ball");
  if (jackIndex != -1) eiJack = jackIndex;

  if (LibraryExists("updater"))
  {
    OnLibraryAdded("Updater");
  }
}

public void OnLibraryAdded(const char[] name)
{
  if (StrEqual(name, "updater"))
  {
    Updater_AddPlugin(
      "https://raw.githubusercontent.com/prplnorangesoda/p4sstime-plugin/updater/updatefile.txt");
  }
}

//#include <p4sstime/trikz.sp>
#include "p4sstime/snapshot.sp"
#include "p4sstime/logs.sp"
#include "p4sstime/pass_menu.sp"
#include "p4sstime/practice.sp"
#include "p4sstime/anticheat.sp"
#include "p4sstime/convars.sp"
#include "p4sstime/stats_print.sp"
#include "p4sstime/f2stocks.sp"
#include "p4sstime/spawnball.sp"

public void OnMapInit(const char[] mapName)
{
  if (StrContains(mapName, "stadium", false) != -1)  // stadium has much lower top spawner so do this to avoid false positive win strats
    iWinStratDistance = 150;
  else
    iWinStratDistance = 400;
}

public void OnMapStart()  // getgoallocations
{
  int goal1 = FindEntityByClassname(-1, "func_passtime_goal");
  int goal2 = FindEntityByClassname(goal1, "func_passtime_goal");
  int team1 = GetEntProp(goal1, Prop_Send, "m_iTeamNum");
  if (team1 == 2)
  {
    GetEntPropVector(goal1, Prop_Send, "m_vecOrigin", fBluGoalPos);
    GetEntPropVector(goal2, Prop_Send, "m_vecOrigin", fRedGoalPos);
  }
  else
  {
    GetEntPropVector(goal2, Prop_Send, "m_vecOrigin", fBluGoalPos);
    GetEntPropVector(goal1, Prop_Send, "m_vecOrigin", fRedGoalPos);
  }
}

public void OnMapEnd()
{
  eiJack = 0;
}

public void OnGameFrame()
{
  if (bBallLoose)
  {
    TFTeam ballTeam = GetBallTeam();
    if (ballTeam != eLastTickBallTeam)
    {
      VerboseLog("Ball team changed from %d (%s) to %d (%s)", eLastTickBallTeam, TFTeamToString(eLastTickBallTeam), ballTeam, TFTeamToString(ballTeam));
      float ballPos[3];
      GetEntPropVector(eiJack, Prop_Send, "m_vecOrigin", ballPos);
      float distFromBluGoal = GetVectorDistance(ballPos, fBluGoalPos);
      float distFromRedGoal = GetVectorDistance(ballPos, fRedGoalPos);
      VerboseLog("Loose ball distance from goals: \"blu\" \"%.2f\" \"red\" \"%.2f\"", distFromBluGoal, distFromRedGoal);
      if (bPrintStats.BoolValue && bFunStats.BoolValue)
      {
        if (distFromBluGoal <= 120)
        {
          PrintToAllClientsChat("\x0700ffff[PASS] The ball went neutral %.2fhu\x0700ffff from the goal!", distFromBluGoal - 20);
        }
        else if (distFromRedGoal <= 120)
        {
          PrintToAllClientsChat("\x0700ffff[PASS] The ball went neutral %.2fhu\x0700ffff from the goal!", distFromRedGoal - 20);
        }
      }
    }
    eLastTickBallTeam = ballTeam;
  }
}

public void OnEntityCreated(int eIndex, const char[] eClassname)
{
  // wrap it around and double check cvar
  // bad but avoids an unnecessary string cmp
  if (bVerboseLogs.BoolValue)
  {
    if (StrEqual(eClassname, "tf_projectile_rocket"))
    {
      VerboseLog("tf_projectile_rocket spawned, index: %d", eIndex);
    }
  }
  if (StrEqual(eClassname, "passtime_ball"))
  {
    LogMessage("passtime_ball spawned index \"%d\"", eIndex);
    SetJack(eIndex);
  }
  if (bMedicArrowsNeutralizeBall.BoolValue)
  {
    if (StrEqual(eClassname, "tf_projectile_healing_bolt"))
    {
      LogMessage("%s spawned.", eClassname);
      SDKHookEx(eIndex, SDKHook_StartTouchPost, MedicArrowTouchedSomething);
    }
  }
}

Action PasstimeBallTookDamage(int victim, int& attacker, int& inflictor, float& damage, int& damagetype)
{
  TFTeam ballTeam = eLastTickBallTeam;
  char   classname[128];
  GetEntityClassname(inflictor, classname, sizeof(classname));
  LogToGame("passtime_ball took damage victim '%d' attacker '%d' inflictor '%d' damage '%.2f' damagetype '%d' inflictor classname '%s' ", victim, attacker, inflictor, damage, damagetype, classname);
  TFTeam playerTeam = TF2_GetClientTeam(attacker);

  char   playerName[MAX_NAME_LENGTH];
  GetClientName(attacker, playerName, sizeof(playerName));
  VerboseLog("HEYSPEAKERSLOOKHERE: attacker '%s', attacker team: '%s'", playerName, TFTeamToString(playerTeam));
  VerboseLog("HEYSPEAKERSLOOKHERE: ballteam '%s'", TFTeamToString(ballTeam));
  // so incredibly ugly
  VerboseLog("playerWhoSplashed: %d, playerTeam: %s, ballTeam: %s", attacker, TFTeamToString(playerTeam), TFTeamToString(ballTeam));
  switch (playerTeam)
  {
    case TFTeam_Blue:
    {
      VerboseLog("player team is BLU, checking if in blu goal and if ball is red.");
      if (EntInBluGoalZone(eiJack) && ballTeam == TFTeam_Red)
      {
        VerboseLog("all successful, this is a successful splash");
        char playerNameTeam[MAX_TEAMFORMAT_NAME_LENGTH];
        GetClientName(attacker, playerName, sizeof(playerName));
        FormatPlayerNameWithTeam(attacker, playerNameTeam);
        if (bPrintStats.BoolValue)
        {
          PrintToAllClientsChat("\x0700ffff[PASS] %s\x075bd4b3 splashed the ball to save!", playerNameTeam);
        }
        PrintToSTV("[PASS-TV] %s splashed the ball to save it. Tick: %d", playerName, STVTickCount());
        arriPlyRoundPassStats[attacker].iPlySplashSaves++;
      }
    }
    case TFTeam_Red:
    {
      VerboseLog("player team is RED, checking if in red goal and if ball is blu.");

      if (EntInRedGoalZone(eiJack) && ballTeam == TFTeam_Blue)
      {
        VerboseLog("all successful, this is a successful splash");
        char playerNameTeam[MAX_TEAMFORMAT_NAME_LENGTH];
        GetClientName(attacker, playerName, sizeof(playerName));
        FormatPlayerNameWithTeam(attacker, playerNameTeam);
        if (bPrintStats.BoolValue)
        {
          PrintToAllClientsChat("\x0700ffff[PASS] %s\x075bd4b3 splashed the ball to save!", playerNameTeam);
        }
        PrintToSTV("[PASS-TV] %s splashed the ball to save it. Tick: %d", playerName, STVTickCount());
        arriPlyRoundPassStats[attacker].iPlySplashSaves++;
      }
    }
  }

  return Plugin_Continue;
}

void MedicArrowTouchedSomething(int arrow, int other)
{
  char classname[64];
  GetEntityClassname(other, classname, 64);
  int MedicAttacker = EntRefToEntIndex(GetEntPropEnt(arrow, Prop_Data, "m_hOwnerEntity"));
  if (StrEqual(classname, "passtime_ball"))
  {
    SDKHooks_TakeDamage(other, arrow, MedicAttacker, 50.0, -1, -1, NULL_VECTOR, NULL_VECTOR, false);
  }
  LogMessage("medic arrow from %d touched %s index %d", MedicAttacker, classname, other);
}

Action Event_RoundReset(Event event, const char[] name, bool dontBroadcast)
{
  for (int i = 0; i < MaxClients + 1; i++)
    ClearLocalStats(i);
  iRedBallTime = 0;
  iBluBallTime = 0;
  bBallLoose   = false;
  if (GetConVarInt(bPracticeMode) == 1)
  {
    SetConVarInt(bPracticeMode, 0);
    PrintToChatAll("\x0700ffff[PASS] Game started; practice mode disabled.");
  }
  bHalloweenMode  = false;
  iRoundResetTick = GetGameTickCount();
  return Plugin_Handled;
}

Action Event_PregameCountdown(Event event, const char[] name, bool dontBroadcast)
{
  int time = event.GetInt("time");
  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x) || !arrbJackAcqSettings[x].bPlyCoundownCaptionSetting) continue;

    if (time == 10)
      PrintToChat(x, "\x0700ffff[PASS] \x07ff000010 seconds...");
    else if (time == 5)
      PrintToChat(x, "\x0700ffff[PASS] \x07ffff005");
    else if (time == 4)
      PrintToChat(x, "\x0700ffff[PASS] \x07ffff004");
    else if (time == 3)
      PrintToChat(x, "\x0700ffff[PASS] \x07ffff003");
    else if (time == 2)
      PrintToChat(x, "\x0700ffff[PASS] \x0700ff002");
    else if (time == 1)
      PrintToChat(x, "\x0700ffff[PASS] \x0700ff001");
  }
  return Plugin_Handled;
}

Action Event_MidgameCountdown(Event event, const char[] name, bool dontBroadcast)
{
  // if it is halloween, announcer always says 10 seconds, but merasmus says 5-1
  // for pregame, announcer ALWAYS says start

  char sound[128];
  event.GetString("sound", sound, sizeof(sound));
  if (StrEqual(sound, "Passtime.Merasmus.Laugh"))  // if this occurs (which it does during halloween right after ball spawn), assume halloween
    bHalloweenMode = true;
  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x) || !arrbJackAcqSettings[x].bPlyCoundownCaptionSetting) continue;

    if (StrEqual(sound, "Announcer.RoundBegins10seconds"))
      PrintToChat(x, "\x0700ffff[PASS] \x07ff000010 seconds...");
    else if (StrEqual(sound, "Passtime.BallSpawn"))
      PrintToChat(x, "\x0700ffff[PASS] \x0700ff00Ball has spawned!");
    if (bHalloweenMode)
    {
      if (StrEqual(sound, "Merasmus.RoundBegins5seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x07ffff005");
      else if (StrEqual(sound, "Merasmus.RoundBegins4seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x07ffff004");
      else if (StrEqual(sound, "Merasmus.RoundBegins3seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff003");
      else if (StrEqual(sound, "Merasmus.RoundBegins2seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff002");
      else if (StrEqual(sound, "Merasmus.RoundBegins1seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff001");
    }
    else
    {
      if (StrEqual(sound, "Announcer.RoundBegins5seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x07ffff005");
      else if (StrEqual(sound, "Announcer.RoundBegins4seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x07ffff004");
      else if (StrEqual(sound, "Announcer.RoundBegins3seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff003");
      else if (StrEqual(sound, "Announcer.RoundBegins2seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff002");
      else if (StrEqual(sound, "Announcer.RoundBegins1seconds"))
        PrintToChat(x, "\x0700ffff[PASS] \x0700ff001");
    }
  }
  return Plugin_Handled;
}

Action Event_TeamWin(Event event, const char[] name, bool dontBroadcast)
{
  if (!bPrintStats.BoolValue) return Plugin_Handled;
  CreateTimer(0.5, Timer_DisplayStats);
  iPlyWhoGotJack = 0;  // reset this because it's a good idea. doesn't actually fix anything but this shouldn't carry over between rounds
  return Plugin_Handled;
}

int STVTickCount()
{
  int tick;
  tick = GetGameTickCount() - iRoundResetTick;
  return tick;
}

bool IsValidClient(int client, bool blockbots = true)
{
  if (client > 4096) client = EntRefToEntIndex(client);
  if (client <= 0 || client > MaxClients) return false;
  if (!IsClientInGame(client)) return false;
  if (blockbots && IsFakeClient(client)) return false;
  if (GetEntProp(client, Prop_Send, "m_bIsCoaching")) return false;
  return true;
}

/*-------------------------------------------------- Player Events --------------------------------------------------*/
public Action OnClientSayCommand(int client, const char[] command, const char[] sArgs)
{
  if (StrEqual(sArgs, "/more", false) || StrEqual(sArgs, ".more", false))
  {
    CreateTimer(0.1, Timer_ShowMoreTF, client, TIMER_FLAG_NO_MAPCHANGE);
    return Plugin_Handled;
  }
  else if (StrEqual(sArgs, "/pass", false) || StrEqual(sArgs, "/p4ss", false) || StrEqual(sArgs, ".pass", false) || StrEqual(sArgs, ".p4ss", false))
  {
    ShowPassMenu(client);
    return Plugin_Handled;
  }
  return Plugin_Continue;
}

bool TraceEntityFilterPlayer(int entity, int contentsMask)  // taken from mgemod; just going to use this instead of isvalidclient for the below function
{
  return entity > MaxClients || !entity;
}

float DistanceAboveGround(int victim)  // taken from mgemod
{
  float vStart[3];
  float vEnd[3];
  float vAngles[3] = { 90.0, 0.0, 0.0 };
  GetClientAbsOrigin(victim, vStart);
  Handle trace    = TR_TraceRayFilterEx(vStart, vAngles, MASK_PLAYERSOLID, RayType_Infinite, TraceEntityFilterPlayer);

  float  distance = -1.0;
  if (TR_DidHit(trace))
  {
    TR_GetEndPosition(vEnd, trace);
    distance = GetVectorDistance(vStart, vEnd, false);
  }
  else
    LogError("trace error. victim %N(%d)", victim, victim);

  delete trace;
  return distance;
}

Action Event_RJ(Event event, const char[] name, bool dontBroadcast)
{
  int client                  = GetClientOfUserId(event.GetInt("userid"));
  arrbBlastJumpStatus[client] = true;
  return Plugin_Handled;
}

Action Event_RJLand(Event event, const char[] name, bool dontBroadcast)
{
  int client                  = GetClientOfUserId(event.GetInt("userid"));
  arrbBlastJumpStatus[client] = false;
  return Plugin_Handled;
}

Action Event_SJ(Event event, const char[] name, bool dontBroadcast)
{
  int client                  = GetClientOfUserId(event.GetInt("userid"));
  arrbBlastJumpStatus[client] = true;
  return Plugin_Handled;
}

Action Event_SJLand(Event event, const char[] name, bool dontBroadcast)
{
  int client                  = GetClientOfUserId(event.GetInt("userid"));
  arrbBlastJumpStatus[client] = false;
  return Plugin_Handled;
}

// the below function is dr underscore's fix. thanks!
public void TF2_OnConditionRemoved(int client, TFCond condition)
{
  if (condition == TFCond_Ubercharged)
    TF2_RemoveCondition(client, TFCond_UberchargeFading);
}

Action Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast)
{
  int client            = GetClientOfUserId(event.GetInt("userid"));
  arrbPlyIsDead[client] = true;
  if (client == eiPassTarget)
  {
    eiDeathBomber                     = client;
    arrbDeathbombCheck[eiDeathBomber] = true;
  }
  return Plugin_Handled;
}

public void OnClientDisconnect(int client)
{
  ClearLocalStats(client);
}

/*-------------------------------------------------- PASS Events --------------------------------------------------*/
void Hook_OnSpawnBall(const char[] name, int caller, int activator, float delay)
{
  char spawnName[24];
  eiJack             = FindEntityByClassname(-1, "passtime_ball");

  bBallLoose         = true;
  ibBallSpawnedLower = 0;
  if (bDroppedItemsCollision.BoolValue) SetEntityCollisionGroup(eiJack, 4);
  if (bWaitingForBallSpawnToRestart)
  {
    ServerCommand("mp_tournament_restart");
    bWaitingForBallSpawnToRestart = false;
  }
  GetEntPropString(caller, Prop_Data, "m_iName", spawnName, sizeof(spawnName));
  if (StrEqual(spawnName, "passtime_ball_spawn1"))
  {
    LogToGame("passtime_ball spawned from the upper spawnpoint.");
    PrintToSTV("[PASS-TV] passtime_ball spawned from the upper spawnpoint.");
    GetEntPropVector(caller, Prop_Send, "m_vecOrigin", fTopSpawnPos);
  }
  else if (StrEqual(spawnName, "passtime_ball_spawn2"))
  {
    LogToGame("passtime_ball spawned from the lower spawnpoint.");
    PrintToSTV("[PASS-TV] passtime_ball spawned from the lower spawnpoint.");
    ibBallSpawnedLower = 1;
  }
  else if (StrEqual(spawnName, "passtime_ball_spawn3"))
  {
    LogToGame("passtime_ball spawned from the right spawnpoint.");
    PrintToSTV("[PASS-TV] passtime_ball spawned from the right spawnpoint.");
  }
  else if (StrEqual(spawnName, "passtime_ball_spawn4"))
  {
    LogToGame("passtime_ball spawned from the left spawnpoint.");
    PrintToSTV("[PASS-TV] passtime_ball spawned from the left spawnpoint.");
  }
  ibFirstGrabCheck = true;
}

Action Event_PassFree(Event event, const char[] name, bool dontBroadcast)
{
  bBallLoose       = true;
  int    owner     = event.GetInt("owner");
  TFTeam ownerTeam = TF2_GetClientTeam(owner);
  if (ownerTeam == TFTeam_Blue)
  {
    if (iBallPickedUpTick != 0)
    {
      iBluBallTime += GetGameTickCount() - iBallPickedUpTick;
    }
  }
  else if (ownerTeam == TFTeam_Red)
  {
    if (iBallPickedUpTick != 0)
    {
      iRedBallTime += GetGameTickCount() - iBallPickedUpTick;
    }
  }

  if (!arrbPlyIsDead[owner])
  {
    eLastTickBallTeam = ownerTeam;
  }

  arrbDeathbombCheck[eiDeathBomber] = false;  // if anyone at all throws the ball, the deathbomb is automatically false

  if (arrbJackAcqSettings[owner].bPlyHudTextSetting)
  {
    SetHudTextParams(-1.0, 0.22, 3.0, 240, 0, 240, 255);
    ShowHudText(owner, 1, "");
  }
  GetEntPropVector(eiJack, Prop_Data, "m_vecAbsOrigin", fFreeBallPos);
  eiPassTarget = EntRefToEntIndex(GetEntPropEnt(owner, Prop_Send, "m_hPasstimePassTarget"));
  if (!(arrbBlastJumpStatus[owner]))
  {
    arrbPanaceaCheck[owner]  = false;
    arrbWinStratCheck[owner] = false;
  }
  SetLogInfo(owner);
  LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_free\" (position \"%.0f %.0f %.0f\")",
            user1, GetClientUserId(user1), user1steamid, user1team,
            user1position[0], user1position[1], user1position[2]);
  return Plugin_Handled;
}

// When an enemy player blocks a thrown ball without picking it up, via uber or rocket/sticky jumpers
Action Event_PassBallBlocked(Event event, const char[] name, bool dontBroadcast)
{
  int blocker = event.GetInt("blocker");
  int thrower = event.GetInt("owner");
  arriPlyRoundPassStats[blocker].iPlyBlocks++;
  SetLogInfo(blocker, thrower);
  LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_ball_blocked\" against \"%N<%i><%s><%s>\" (thrower_position \"%.0f %.0f %.0f\") (blocker_position \"%.0f %.0f %.0f\")",
            user1, GetClientUserId(user1), user1steamid, user1team,
            user2, GetClientUserId(user2), user2steamid, user2team,
            user1position[0], user1position[1], user1position[2],
            user2position[0], user2position[1], user2position[2]);
  user2 = 0;
  return Plugin_Handled;
}

// When a player gets a neutral ball.
Action Event_PassGet(Event event, const char[] name, bool dontBroadcast)
{
  bBallLoose        = false;
  iBallPickedUpTick = GetGameTickCount();
  VerboseLog("Ball picked up - tick: %d", iBallPickedUpTick);
  iPlyWhoGotJack = event.GetInt("owner");
  float position[3];

  SetLogInfo(iPlyWhoGotJack);
  LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_get\" (firstcontact \"%i\") (position \"%.0f %.0f %.0f\")",
            user1, GetClientUserId(user1), user1steamid, user1team, ibFirstGrabCheck,
            user1position[0], user1position[1], user1position[2]);
  if (ibFirstGrabCheck && arrbBlastJumpStatus[iPlyWhoGotJack])
  {
    arriPlyRoundPassStats[iPlyWhoGotJack].iPlyFirstGrabs++;
    arrbPanaceaCheck[iPlyWhoGotJack] = true;
    GetClientAbsOrigin(iPlyWhoGotJack, position);
    float distanceFromTopSpawner = GetVectorDistance(position, fTopSpawnPos, false);
    LogToGame("Panacea check - Distance from top spawner: %.0f, Cutoff distance for winstrat: %i", distanceFromTopSpawner, iWinStratDistance);
    if (distanceFromTopSpawner < iWinStratDistance)  // may need to be changed
    {
      arrbPanaceaCheck[iPlyWhoGotJack]  = false;
      arrbWinStratCheck[iPlyWhoGotJack] = true;

      if (bWinstratKills.BoolValue)
      {
        arrbWinStratCheck[iPlyWhoGotJack] = false;
        // KILL winstratter
        SDKHooks_TakeDamage(iPlyWhoGotJack, iPlyWhoGotJack, iPlyWhoGotJack, 500.0);
        char winstratterName[MAX_NAME_LENGTH];
        GetClientName(iPlyWhoGotJack, winstratterName, sizeof(winstratterName));
        PrintToAllClientsChat("\x0700ffff[PASS] \x0700ffff%s\x073BC43B tried to \x078aed8awin strat.", winstratterName);
      }
    }
  }
  else
  {
    arrbPanaceaCheck[iPlyWhoGotJack]  = false;
    arrbWinStratCheck[iPlyWhoGotJack] = false;
  }
  ibFirstGrabCheck = false;

  if (arrbJackAcqSettings[iPlyWhoGotJack].bPlyHudTextSetting)
  {
    SetHudTextParams(-1.0, 0.22, 3.0, 240, 0, 240, 255);
    ShowHudText(iPlyWhoGotJack, 1, "YOU HAVE THE JACK");
  }

  if (arrbJackAcqSettings[iPlyWhoGotJack].bPlyChatPrintSetting)
    PrintToChat(iPlyWhoGotJack, "\x07ffff00[PASS]\x0700ff00 YOU HAVE THE JACK!!!");

  if (arrbJackAcqSettings[iPlyWhoGotJack].bPlySoundSetting)
    ClientCommand(iPlyWhoGotJack, "playgamesound Passtime.BallSmack");

  return Plugin_Handled;
}

// When a player catches a ball thrown by another player.
Action Event_PassCaught(Handle event, const char[] name, bool dontBroadcast)
{
  int   thrower        = GetEventInt(event, "passer");
  int   catcher        = GetEventInt(event, "catcher");
  float dist           = GetEventFloat(event, "dist");
  float duration       = GetEventFloat(event, "duration");
  int   intercept      = false;
  int   bSave          = false;
  int   ibHandoffCheck = false;
  iPlyWhoGotJack       = catcher;
  bBallLoose           = false;

  iBallPickedUpTick    = GetGameTickCount();

  VerboseLog("Ball picked up - tick: %d", iBallPickedUpTick);

  char throwerName[MAX_NAME_LENGTH], catcherName[MAX_NAME_LENGTH];
  GetClientName(thrower, throwerName, sizeof(throwerName));
  GetClientName(catcher, catcherName, sizeof(catcherName));
  char throwerNameTeamFormat[MAX_TEAMFORMAT_NAME_LENGTH], catcherNameTeamFormat[MAX_TEAMFORMAT_NAME_LENGTH];
  FormatPlayerNameWithTeam(thrower, throwerNameTeamFormat);
  FormatPlayerNameWithTeam(catcher, catcherNameTeamFormat);

  if (TF2_GetClientTeam(thrower) == TFTeam_Spectator || TF2_GetClientTeam(catcher) == TFTeam_Spectator) return Plugin_Handled;

  if (bFunStats.BoolValue && bPrintStats.BoolValue)
  {
    if (GetClientTeam(thrower) == GetClientTeam(catcher))
    {
      if (PlayerInEnemyGoalieZone(catcher))
      {
        PrintToAllClientsChat("\x0700ffff[PASS] %s \x07ffff00blocked *their teammate* %s\x0700ffff from scoring!", catcherNameTeamFormat, throwerNameTeamFormat);
      }
    }
  }

  if (GetClientTeam(thrower) != GetClientTeam(catcher))
  {
    intercept = true;
    if (PlayerInTeamGoalieZone(catcher))
    {
      bSave = true;
      arriPlyRoundPassStats[catcher].iPlySaves++;
      if (bPrintStats.BoolValue)
      {
        for (int x = 1; x < MaxClients + 1; x++)
        {
          if (!IsValidClient(x) || IsClientSourceTV(x)) continue;
          PrintToChat(x, "\x0700ffff[PASS] %s \x07ffff00blocked %s\x0700ffff from scoring!", catcherNameTeamFormat, throwerNameTeamFormat);
        }
      }
      PrintToSTV("[PASS-TV] %s blocked %s from scoring. Tick: %d", catcherName, throwerName, STVTickCount());
    }
    else
    {
      arriPlyRoundPassStats[catcher].iPlyIntercepts++;
      if (bPrintStats.BoolValue)
      {
        for (int x = 1; x < MaxClients + 1; x++)
        {
          if (!IsValidClient(x) || IsClientSourceTV(x)) continue;
          PrintToChat(x, "\x0700ffff[PASS] %s \x07ff00ffintercepted \x0700ffff%s!", catcherNameTeamFormat, throwerNameTeamFormat);
        }
      }
      PrintToSTV("[PASS-TV] %s intercepted %s. Tick: %d", catcherName, throwerName, STVTickCount());
    }
  }

  if (TF2_GetClientTeam(thrower) == TF2_GetClientTeam(catcher) && eiPassTarget != catcher && !(GetEntityFlags(catcher) & FL_ONGROUND) && DistanceAboveGround(catcher) > 200)  // if on same team and catcher is not locked onto for a pass, also 200 units above ground at least (to ignore just normal non-lock passes)
  {
    if (bPrintStats.BoolValue)
    {
      for (int x = 1; x < MaxClients + 1; x++)
      {
        if (!IsValidClient(x) || IsClientSourceTV(x)) continue;
        PrintToChat(x, "\x0700ffff[PASS] %s \x07ffff00handed off \x0700ffffto %s!", throwerNameTeamFormat, catcherNameTeamFormat);
      }
    }
    PrintToSTV("[PASS-TV] %s handed off to %s. Tick: %d", throwerName, catcherName, STVTickCount());
    ibHandoffCheck = true;
    arriPlyRoundPassStats[thrower].iPlyHandoffs++;
    eiPassTarget = 0;
  }
  SetLogInfo(catcher, thrower);
  LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_pass_caught\" against \"%N<%i><%s><%s>\" (interception \"%i\") (save \"%i\") (handoff \"%i\") (dist \"%.3f\") (duration \"%.3f\") (thrower_position \"%.0f %.0f %.0f\") (catcher_position \"%.0f %.0f %.0f\")",
            user1, GetClientUserId(user1), user1steamid, user1team,
            user2, GetClientUserId(user2), user2steamid, user2team,
            intercept, bSave, ibHandoffCheck, dist, duration,
            user1position[0], user1position[1], user1position[2],
            user2position[0], user2position[1], user2position[2]);
  user2                      = 0;
  arrbPanaceaCheck[thrower]  = false;
  arrbPanaceaCheck[catcher]  = false;
  arrbWinStratCheck[thrower] = false;
  arrbWinStratCheck[catcher] = false;

  return Plugin_Handled;
}

// When a player melee steals the ball from another player.
Action Event_PassStolen(Event event, const char[] name, bool dontBroadcast)
{
  int  thief        = event.GetInt("attacker");
  int  victim       = event.GetInt("victim");
  bool steal2save   = false;
  iPlyWhoGotJack    = thief;

  iBallPickedUpTick = GetGameTickCount();
  VerboseLog("Ball picked up - tick: %d", iBallPickedUpTick);
  if (PlayerInTeamGoalieZone(thief))
  {
    arriPlyRoundPassStats[thief].iPlySteal2Saves++;
    steal2save = true;
  }

  SetLogInfo(thief, victim);
  LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_ball_stolen\" against \"%N<%i><%s><%s>\" (steal defense \"%d\") (thief_position \"%.0f %.0f %.0f\") (victim_position \"%.0f %.0f %.0f\")",
            user1, GetClientUserId(user1), user1steamid, user1team,
            user2, GetClientUserId(user2), user2steamid, user2team,
            steal2save,
            user1position[0], user1position[1], user1position[2],
            user2position[0], user2position[1], user2position[2]);
  user2                     = 0;
  arrbPanaceaCheck[thief]   = false;
  arrbPanaceaCheck[victim]  = false;
  arrbWinStratCheck[thief]  = false;
  arrbWinStratCheck[victim] = false;

  if (arrbJackAcqSettings[victim].bPlyHudTextSetting)
  {
    SetHudTextParams(-1.0, 0.22, 3.0, 240, 0, 240, 255);
    ShowHudText(victim, 1, "");
  }
  if (bPrintStats.BoolValue)
  {
    char thiefName[MAX_NAME_LENGTH], victimName[MAX_NAME_LENGTH];
    GetClientName(thief, thiefName, sizeof(thiefName));
    GetClientName(victim, victimName, sizeof(victimName));
    char thiefNameTeamFormat[MAX_TEAMFORMAT_NAME_LENGTH];
    char victimNameTeamFormat[MAX_TEAMFORMAT_NAME_LENGTH];
    FormatPlayerNameWithTeam(thief, thiefNameTeamFormat);
    FormatPlayerNameWithTeam(victim, victimNameTeamFormat);

    if (PlayerInTeamGoalieZone(thief))
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x07ff8000 defensively stole from\x0700ffff %s!", thiefNameTeamFormat, victimNameTeamFormat);
      PrintToSTV("[PASS-TV] %s defensively stole from %s. Tick: %d", thiefName, victimName, STVTickCount());
    }
    else
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x07ff8000 stole from\x0700ffff %s!", thiefNameTeamFormat, victimNameTeamFormat);
      PrintToSTV("[PASS-TV] %s stole from %s. Tick: %d", thiefName, victimName, STVTickCount());
    }
  }
  arriPlyRoundPassStats[thief].iPlySteals++;
  return Plugin_Handled;
}

// When a player scores with the ball.
Action Event_PassScore(Event event, const char[] name, bool dontBroadcast)
{
  int  scorer    = event.GetInt("scorer");
  int  points    = event.GetInt("points");
  int  assistant = event.GetInt("assister");
  char playerName[MAX_NAME_LENGTH], assistantName[MAX_NAME_LENGTH];
  bBallLoose        = false;
  eLastTickBallTeam = TFTeam_Unassigned;

  GetClientName(scorer, playerName, sizeof(playerName));

  if (ibBallSpawnedLower)
    arrbPanaceaCheck[scorer] = false;

  float fScoredBallPos[3];
  GetEntPropVector(eiJack, Prop_Send, "m_vecOrigin", fScoredBallPos);
  float dist = GetVectorDistance(fFreeBallPos, fScoredBallPos, false);

  if (arrbDeathbombCheck[eiDeathBomber])
  {
    SetLogInfo(eiDeathBomber);
    LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_score\" (points \"%i\") (panacea \"%d\") (win strat \"%d\") (deathbomb \"%d\") (dist \"%.0f\") (position \"%.0f %.0f %.0f\")",
              user1, GetClientUserId(user1), user1steamid, user1team,
              points, arrbPanaceaCheck[scorer], arrbWinStratCheck[scorer], arrbDeathbombCheck[eiDeathBomber], dist,
              user1position[0], user1position[1], user1position[2]);
    arriPlyRoundPassStats[eiDeathBomber].iPlyScores++;
    arriPlyRoundPassStats[eiDeathBomber].iPlyDeathbombs++;

    GetClientName(scorer, assistantName, sizeof(assistantName));
    SetLogInfo(scorer);
    LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_score_assist\" (position \"%.0f %.0f %.0f\")",
              user1, GetClientUserId(user1), user1steamid, user1team,
              user1position[0], user1position[1], user1position[2]);
    arriPlyRoundPassStats[scorer].iPlyAssists++;
  }
  else
  {
    SetLogInfo(scorer);
    LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_score\" (points \"%i\") (panacea \"%d\") (win strat \"%d\") (deathbomb \"%d\") (dist \"%.0f\") (position \"%.0f %.0f %.0f\")",
              user1, GetClientUserId(user1), user1steamid, user1team,
              points, arrbPanaceaCheck[scorer], arrbWinStratCheck[scorer], arrbDeathbombCheck[eiDeathBomber], dist,
              user1position[0], user1position[1], user1position[2]);
    arriPlyRoundPassStats[scorer].iPlyScores++;

    if (assistant > 0)
    {
      GetClientName(assistant, assistantName, sizeof(assistantName));
      SetLogInfo(assistant);
      LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_score_assist\" (position \"%.0f %.0f %.0f\")",
                user1, GetClientUserId(user1), user1steamid, user1team,
                user1position[0], user1position[1], user1position[2]);
      arriPlyRoundPassStats[assistant].iPlyAssists++;
    }
  }

  if (arrbPanaceaCheck[scorer] && TF2_GetPlayerClass(scorer) != TFClass_Medic)
    arriPlyRoundPassStats[scorer].iPlyPanaceas++;
  else if (arrbWinStratCheck[scorer])
    arriPlyRoundPassStats[scorer].iPlyWinStrats++;

  if (bPrintStats.BoolValue)
  {
    char playerNameTeamFormatted[MAX_TEAMFORMAT_NAME_LENGTH], assistantNameTeamFormatted[MAX_TEAMFORMAT_NAME_LENGTH];
    FormatPlayerNameWithTeam(scorer, playerNameTeamFormatted);
    if (arrbPanaceaCheck[scorer] && TF2_GetPlayerClass(scorer) != TFClass_Medic)
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a \x074df74dPanacea!", playerNameTeamFormatted);
      PrintToSTV("[PASS-TV] %s scored a Panacea. Tick: %d", playerName, STVTickCount());
    }
    else if (arrbWinStratCheck[scorer])
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a \x078aed8awin strat!", playerNameTeamFormatted);
      PrintToSTV("[PASS-TV] %s scored a win strat. Tick: %d", playerName, STVTickCount());
    }
    else if (arrbDeathbombCheck[eiDeathBomber])
    {
      // if we take too long to print, a race condition happens
      // prevent that race condition
      int deathBomber = eiDeathBomber;
      GetClientName(deathBomber, playerName, sizeof(playerName));
      FormatPlayerNameWithTeam(deathBomber, playerNameTeamFormatted);
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a \x0797e043deathbomb!", playerNameTeamFormatted);
      PrintToSTV("[PASS-TV] %s scored a deathbomb. Tick: %d", playerName, STVTickCount());
    }
    else if (dist > 1600)
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a goal from a distance of %.0fhu!", playerNameTeamFormatted, dist);
      PrintToSTV("[PASS-TV] %s scored a goal from distance of %.0fhu. Tick: %d", playerName, dist, STVTickCount());
    }
    else if (assistant > 0)
    {
      FormatPlayerNameWithTeam(assistant, assistantNameTeamFormatted);
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a goal \x0700ffffassisted by %s!", playerNameTeamFormatted, assistantNameTeamFormatted);
      PrintToSTV("[PASS-TV] %s scored a goal assisted by %s. Tick: %d", playerName, assistantName, STVTickCount());
    }
    else
    {
      PrintToAllClientsChat("\x0700ffff[PASS] %s\x073BC43B scored a goal!", playerNameTeamFormatted);
      PrintToSTV("[PASS-TV] %s scored a goal. Tick: %d", playerName, STVTickCount());
    }
  }
  arrbPanaceaCheck[scorer]  = false;
  arrbWinStratCheck[scorer] = false;  // reset these cuz its good idea

  return Plugin_Handled;
}

// Checks if a player is close enough to their team's goal to count as a goalie.
bool PlayerInTeamGoalieZone(int client)
{
  int   team = GetClientTeam(client);
  float position[3];
  GetClientAbsOrigin(client, position);

  if (team == view_as<int>(TFTeam_Blue))
  {
    float distance = GetVectorDistance(position, fBluGoalPos, false);
    if (distance < GOALIE_DISTANCE) return true;
  }

  if (team == view_as<int>(TFTeam_Red))
  {
    float distance = GetVectorDistance(position, fRedGoalPos, false);
    if (distance < GOALIE_DISTANCE) return true;
  }
  return false;
}

bool EntInRedGoalZone(int entIndex)
{
  float position[3];
  GetEntPropVector(entIndex, Prop_Send, "m_vecOrigin", position);
  return PosInRedGoalZone(position);
}

bool EntInBluGoalZone(int entIndex)
{
  float position[3];
  GetEntPropVector(entIndex, Prop_Send, "m_vecOrigin", position);
  return PosInBluGoalZone(position);
}

bool PosInRedGoalZone(float position[3])
{
  float dist = GetVectorDistance(position, fRedGoalPos);
  if (dist < GOALIE_DISTANCE) return true;
  return false;
}

bool PosInBluGoalZone(float position[3])
{
  float dist = GetVectorDistance(position, fBluGoalPos);
  if (dist < GOALIE_DISTANCE) return true;
  return false;
}

// Checks if a player is close enough to the *enemy* team's goal to count as a blocker.
// For fun.
bool PlayerInEnemyGoalieZone(int client)
{
  int   team = GetClientTeam(client);
  float position[3];
  GetClientAbsOrigin(client, position);

  if (team == view_as<int>(TFTeam_Blue))
  {
    float distance = GetVectorDistance(position, fRedGoalPos, false);
    if (distance < 100) return true;
  }

  if (team == view_as<int>(TFTeam_Red))
  {
    float distance = GetVectorDistance(position, fBluGoalPos, false);
    if (distance < 100) return true;
  }
  return false;
}

void Hook_OnCatapult(const char[] output, int caller, int activator, float delay)
{
  char catapultName[15];
  GetEntPropString(caller, Prop_Data, "m_iName", catapultName, sizeof(catapultName));
  if (activator == eiJack && iPlyWhoGotJack != 0)
  {
    if (StrEqual(catapultName, "red_catapult1") || StrEqual(catapultName, "red_catapult2") || StrEqual(catapultName, "blu_catapult1") || StrEqual(catapultName, "blu_catapult2") && IsClientConnected(iPlyWhoGotJack))
    {
      SetLogInfo(iPlyWhoGotJack);
      LogToGame("\"%N<%i><%s><%s>\" triggered \"%s\" with the jack (position \"%.0f %.0f %.0f\")",
                user1, GetClientUserId(user1), user1steamid, user1team,
                catapultName, user1position[0], user1position[1], user1position[2]);
      arriPlyRoundPassStats[iPlyWhoGotJack].iPlyCatapults++;
      PrintToSTV("[PASS-TV] %N triggered \"%s\" with the jack. Tick: %d", user1, catapultName, STVTickCount());
    }
  }
}

// outputString must be of size MAX_NAME_LENGTH + 7 or greater.
void FormatPlayerNameWithTeam(int player, char[] outputString)
{
  char playerName[MAX_NAME_LENGTH];
  GetClientName(player, playerName, sizeof(playerName));
  if (TF2_GetClientTeam(player) == TFTeam_Blue)
  {
    Format(outputString, MAX_NAME_LENGTH + 7, "\x074EA6C1%s", playerName);
  }
  else {
    Format(outputString, MAX_NAME_LENGTH + 7, "\x07C43F3B%s", playerName);
  }
}

// Prints the following message to all valid clients, EXCLUDING STV!
void PrintToAllClientsChat(const char[] format, any...)
{
  // this should be a sane max string size value?
  char stringBuffer[1024];
  VFormat(stringBuffer, 1024, format, 2);
  VerboseLog("Printing this message to all clients: %s", stringBuffer);
  for (int x = 1; x < MaxClients + 1; x++)
  {
    if (!IsValidClient(x) || IsClientSourceTV(x)) continue;
    PrintToChat(x, stringBuffer);
  }
}

// 0: TEAM_UNASSIGNED
// 1: spectator
// 2: TF_TEAM_RED
// 3: TF_TEAM_BLU
stock TFTeam GetBallTeam()
{
  if (eiJack == 0 || !IsValidEntity(eiJack))
  {
    LogStackTrace("Ball entity invalid, returning Unassigned");
    return TFTeam_Unassigned;
  }
  int team = GetEntProp(eiJack, Prop_Send, "m_iTeamNum");
  switch (team)
  {
    case 0:
      return TFTeam_Unassigned;
    case 1:
      return TFTeam_Spectator;
    case 2:
      return TFTeam_Red;
    case 3:
      return TFTeam_Blue;
    default:
      return TFTeam_Unassigned;
  }
}

// Utility function
stock void VerboseLog(const char[] format, any...)
{
  if (bVerboseLogs.BoolValue)
  {
    int len             = strlen(format) + 255;
    // sensible value for max log size?
    char[] MessageToLog = new char[len];
    VFormat(MessageToLog, len, format, 2);
    LogMessage("[VERBOSE] %s", MessageToLog);
  }
}

stock char[] TFTeamToString(TFTeam input)
{
  char string[4];
  switch (input)
  {
    case TFTeam_Blue:
    {
      string = "BLU";
    }
    case TFTeam_Red:
    {
      string = "RED";
    }
    case TFTeam_Spectator:
    {
      string = "SPC";
    }
    case TFTeam_Unassigned:
    {
      string = "UNA";
    }
  }
  return string;
}

void SetJack(int eIndex)
{
  if (!SDKHookEx(eIndex, SDKHook_OnTakeDamage, PasstimeBallTookDamage))
  {
    LogError("Could not hook passtime_ball. Splash detection will not work.");
  }
  eiJack = eIndex;
}