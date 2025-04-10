// This file relates to all anticheat features and will contain the functions for them
void TurnBindCheck(int client)
{
  SetLogInfo(client);
  if (GetClientButtons(client) & IN_LEFT)
  {
    LogToGame("\"%N<%i><%s><%s>\" used \"+left\" as Demoman (position \"%.0f %.0f %.0f\")",
              user1, GetClientUserId(user1), user1steamid, user1team,
              user1position[0], user1position[1], user1position[2]);
  }
  if (GetClientButtons(client) & IN_RIGHT)
  {
    LogToGame("\"%N<%i><%s><%s>\" used \"+right\" as Demoman (position \"%.0f %.0f %.0f\")",
              user1, GetClientUserId(user1), user1steamid, user1team,
              user1position[0], user1position[1], user1position[2]);
  }
}

void FilterCheck(QueryCookie cookie, int client, ConVarQueryResult result, const char[] cvarName, const char[] cvarValue, any value)
{
  if (!StrEqual(cvarValue, "0") && !value)
  {
    SetLogInfo(client);
    LogToGame("\"%N<%i><%s><%s>\" spawned as Demoman with m_filter on",
              user1, GetClientUserId(user1), user1steamid, user1team);
  }
  else if (!StrEqual(cvarValue, "0") && value)
  {
    SetLogInfo(client);
    LogToGame("\"%N<%i><%s><%s>\" charged as Demoman with m_filter on",
              user1, GetClientUserId(user1), user1steamid, user1team);
  }
}

Action MultiCheck(Handle timer, any client)
{
  QueryClientConVar(client, "m_filter", FilterCheck, true);
  TurnBindCheck(client);  // would prefer to check every tick but im too lazy to implement. this should be good enough for our purposes tho
  return Plugin_Handled;
}