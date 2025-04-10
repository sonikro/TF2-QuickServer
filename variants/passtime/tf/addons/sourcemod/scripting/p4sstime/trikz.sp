// This file relates to the planned "trikz" mode

/*public OnClientPutInServer(client)
{
  //SDKHook(client, SDKHook_OnTakeDamage, Event_OnTakeDamage);
}

// following classnames are taken from here: https://developer.valvesoftware.com/w/index.php?title=Category:Point_Entities&pagefrom=Prop+glass+futbol#mw-pages
public void OnEntityCreated(int entity, const char[] classname)
{
  //DHooks_OnEntityCreated(entity, classname);
  if (StrEqual(classname, "tf_projectile_rocket") || StrEqual(classname, "tf_projectile_pipe"))
    SDKHook(entity, SDKHook_Touch, OnProjectileTouch);
}

void OnProjectileTouch(int entity, int other) // direct hit detector, taken from MGEMod
{
  plyDirecter = other;
  if (other > 0 && other <= MaxClients)
  {
    plyTakenDirectHit[plyDirecter] = true;
  }
}

void Hook_OnProjCollideChange(ConVar convar, const char[] oldValue, const char[] newValue)
{
  if (newValue[0] == '0')
    trikzProjCollideSave = 0;
  if (newValue[0] == '1')
    trikzProjCollideSave = 1;
  if (newValue[0] == '2')
    trikzProjCollideSave = 2;
}

void Hook_OnProjCollideDev(ConVar convar, const char[] oldValue, const char[] newValue)
{
  if(FindConVar("sm_projectiles_ignore_teammates") != null)
    SetConVarInt(FindConVar("sm_projectiles_ignore_teammates"), 0);
  if (newValue[0] == '0')
    trikzProjCollideCurVal = 0;
  if (newValue[0] == '1')
    trikzProjCollideCurVal = 1;
  if (newValue[0] == '2')
    trikzProjCollideCurVal = 2;
}

int ProjCollideValue()
{
  return trikzProjCollideCurVal;
}

void Hook_OnTrikzChange(ConVar convar, const char[] oldValue, const char[] newValue)
{
  if (newValue[0] == '0')
    SetConVarInt(FindConVar("mp_friendlyfire"), 0);
  if (newValue[0] == '1' || newValue[0] == '2' || newValue[0] == '3')
    SetConVarInt(FindConVar("mp_friendlyfire"), 1);
}

bool TraceEntityFilterPlayer(int entity, int contentsMask) // taken from mgemod; just going to use this instead of isvalidclient for the below function
{
  return entity > MaxClients || !entity;
}

float DistanceAboveGround(int victim) // taken from mgemod
{
  float vStart[3];
  float vEnd[3];
  float vAngles[3] =  { 90.0, 0.0, 0.0 };
  GetClientAbsOrigin(victim, vStart);
  Handle trace = TR_TraceRayFilterEx(vStart, vAngles, MASK_PLAYERSOLID, RayType_Infinite, TraceEntityFilterPlayer);

  float distance = -1.0;
  if (TR_DidHit(trace))
  {
    TR_GetEndPosition(vEnd, trace);
    distance = GetVectorDistance(vStart, vEnd, false);
  } else {
    LogError("trace error. victim %N(%d)", victim, victim);
  }

  delete trace;
  return distance;
}

Action Event_OnTakeDamage(int victim, int& attacker, int& inflictor, float& damage, int& damagetype, int& weapon, float damageForce[3], float damagePosition[3], int damagecustom)
{
  char victimName[MAX_NAME_LENGTH], attackerName[MAX_NAME_LENGTH];
  char steamid_victim[16];
  char team_victim[12];
  GetClientName(victim, victimName, sizeof(victimName));
  GetClientAuthId(victim, AuthId_Steam3, steamid_victim, sizeof(steamid_victim));
  if (victim != attacker && !(GetEntityFlags(victim) & FL_ONGROUND) && DistanceAboveGround(victim) > 200 && plyTakenDirectHit[victim] && GetEntProp(victim, Prop_Send, "m_bHasPasstimeBall") == 1 && TF2_GetClientTeam(victim) != TF2_GetClientTeam(attacker))
  {
    char steamid_attacker[16];
    char team_attacker[12];
    GetClientName(attacker, attackerName, sizeof(attackerName));
    GetClientAuthId(attacker, AuthId_Steam3, steamid_attacker, sizeof(steamid_attacker));
    if (bPrintStats.BoolValue)
      PrintToChatAll("\x0700ffff[PASS] %s \x07ffff00airshot \x0700ffffball carrier %s!", attackerName, victimName);
    LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_carrier_airshot\" against \"%N<%i><%s><%s>\"", attacker, GetClientUserId(attacker), steamid_attacker, team_attacker, victim, GetClientUserId(victim), steamid_victim, team_victim);
  }
  if (trikzEnable.IntValue == 0 || attacker <= 0 || !IsClientInGame(attacker) || !IsValidClient(victim)) // should not damage
  {
    SetConVarInt(trikzProjDev, 0); // reset
    return Plugin_Continue;	// end function early if attacker or victim is not legit player in game
  }
  if (trikzEnable.IntValue == 1 && TF2_GetClientTeam(victim) == TF2_GetClientTeam(attacker) && victim != attacker && !(GetEntityFlags(victim) & FL_ONGROUND) && plyTakenDirectHit[victim])
  {
    SetConVarInt(trikzProjDev, trikzProjCollideSave);
    TF2_AddCondition(victim, TFCond_PasstimeInterception, 0.05 , 0);
    if (DistanceAboveGround(victim) > 200)
    {
      char steamid_attacker[16];
      char team_attacker[12];
      GetClientName(attacker, attackerName, sizeof(attackerName));
      GetClientAuthId(attacker, AuthId_Steam3, steamid_attacker, sizeof(steamid_attacker));
      if (bPrintStats.BoolValue)
        PrintToChatAll("\x0700ffff[PASS] %s \x07ffff00airshot \x0700ffff%s!", attackerName, victimName);
      LogToGame("\"%N<%i><%s><%s>\" triggered \"pass_friendly_airshot\" against \"%N<%i><%s><%s>\"", attacker, GetClientUserId(attacker), steamid_attacker, team_attacker, victim, GetClientUserId(victim), steamid_victim, team_victim);
    }
    plyTakenDirectHit[victim] = false;
    return Plugin_Changed;
  }
  else if (trikzEnable.IntValue == 1 && TF2_GetClientTeam(victim) == TF2_GetClientTeam(attacker) && victim != attacker) // should not damage
  {
    SetConVarInt(trikzProjDev, 0); // never collide
    damage = 0.0;
    return Plugin_Changed;
  }
  if (trikzEnable.IntValue == 2 && TF2_GetClientTeam(victim) == TF2_GetClientTeam(attacker) && victim != attacker && !(GetEntityFlags(victim) & FL_ONGROUND))
  {
    SetConVarInt(trikzProjDev, trikzProjCollideSave);
    TF2_AddCondition(victim, TFCond_PasstimeInterception, 0.05 , 0);
    return Plugin_Changed;
  }
  else if (trikzEnable.IntValue == 2 && TF2_GetClientTeam(victim) == TF2_GetClientTeam(attacker) && victim != attacker) // should not damage
  {
    SetConVarInt(trikzProjDev, 0); // never collide
    damage = 0.0;
    return Plugin_Changed;
  }
  if (trikzEnable.IntValue == 3 && TF2_GetClientTeam(victim) == TF2_GetClientTeam(attacker) && victim != attacker)
  {
    SetConVarInt(trikzProjDev, trikzProjCollideSave);
    TF2_AddCondition(victim, TFCond_PasstimeInterception, 0.05 , 0);
    return Plugin_Changed;
  }
  return Plugin_Continue;
}

Handle g_hook_CBaseProjectile_CanCollideWithTeammates;

void DHooks_Initialize(GameData gamedata)
{
  g_dynamicHookIds = new ArrayList();

  g_dhook_CBaseProjectile_CanCollideWithTeammates = DHooks_AddDynamicHook(gamedata, "CBaseProjectile::CanCollideWithTeammates");
}

void DHooks_OnEntityCreated(int entity, const char[] classname)
{
  if (strncmp(classname, "tf_projectile_", 14) != 0 && ProjCollideValue() != 1) // if 1, just use default tf2 behavior
  {
    // Fixes projectiles sometimes not colliding with teammates
    DHookToggleEntityListener(ListenType_Created, WhenEntityCreated, true);
  }
}

static MRESReturn Hook_CBaseProjectile_CanCollideWithTeammates(int self, Handle ret) {
    if (ProjCollideValue() == 0) // never collide projectiles with teammates
  {
    ret.Value = false;
    return MRES_Supercede;
  }
  if (ProjCollideValue() == 2) // Always make projectiles collide with teammates
  {
    ret.Value = true;
    return MRES_Supercede;
  }
  return MRES_Ignored;
}
*/