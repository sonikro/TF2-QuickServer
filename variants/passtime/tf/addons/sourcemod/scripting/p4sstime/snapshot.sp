Action Command_GamestateSnapshot(int client, int args)
{
  char   team[4];
  TFTeam ballTeam = GetBallTeam();
  switch (ballTeam)
  {
    case TFTeam_Blue:
    {
      team = "BLU";
    }
    case TFTeam_Red:
    {
      team = "RED";
    }
    case TFTeam_Spectator:
    {
      team = "SPC";
    }
    case TFTeam_Unassigned:
    {
      team = "UNA";
    }
  }
  PrintToChatAll("[PASS] Ball team: %s (%d)", team, ballTeam);
  return Plugin_Handled;
}