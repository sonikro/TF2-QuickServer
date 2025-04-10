// This file relates to all logging features and will contain the functions for them
public void LogUploaded(bool success, const char[] logid, const char[] url)
{
  if (!success) return;
  moreurl = "https://more.tf/log/";
  StrCat(moreurl, sizeof(moreurl), logid);
  PrintToChatAll("\x0700ffff[PASS] \x0700eb00Type /more or .more to view logs.");
}

void SetLogInfo(int p1, int p2 = 0)
{
  user1 = p1;
  GetClientAbsOrigin(p1, user1position);
  GetClientAuthId(p1, AuthId_Steam3, user1steamid, sizeof(user1steamid));
  if (GetClientTeam(p1) == 2)
    user1team = "Red";
  else if (GetClientTeam(p1) == 3)
    user1team = "Blue";
  else
    user1team = "Spectator";
  if (p2 != 0)
  {
    user2 = p2
      GetClientAbsOrigin(p2, user2position);
    GetClientAuthId(p2, AuthId_Steam3, user2steamid, sizeof(user2steamid));
    if (GetClientTeam(p2) == 2)
      user2team = "Red";
    else if (GetClientTeam(user2) == 3)
      user2team = "Blue";
    else
      user2team = "Spectator";
  }
}