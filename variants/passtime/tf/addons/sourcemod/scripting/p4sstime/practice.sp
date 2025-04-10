// This file relates to all features for practice mode and will contain the functions for them
void Hook_OnPracticeModeChange(ConVar convar, const char[] oldValue, const char[] newValue)
{
  if (bPracticeMode.BoolValue)
  {
    int entityTimer = FindEntityByClassname(-1, "team_round_timer");
    SetVariantInt(300);
    AcceptEntityInput(entityTimer, "AddTime");
    CreateTimer(300.0, AddFiveMinutes, _, TIMER_REPEAT);  // 5 minutes
  }
}

Action AddFiveMinutes(Handle timer)
{
  if (bPracticeMode.BoolValue)
  {
    int entityTimer = FindEntityByClassname(-1, "team_round_timer");
    SetVariantInt(300);
    AcceptEntityInput(entityTimer, "AddTime");
    return Plugin_Continue;
  }
  else return Plugin_Stop;
}