// this entire file is from f2stocks.inc available here: https://github.com/F2/F2s-sourcemod-plugins/blob/master/includes/f2stocks.inc
// i just didn't need the whole include file so i didnt see any reason in including it all

int        PrintToSTV_iLastStvClient;  // Cached STV client id
stock void PrintToSTV(const char[] format, any...)
{
  int stv = FindSTV();
  if (stv < 1)
    return;

  char buffer[512];
  VFormat(buffer, sizeof(buffer), format, 2);
  PrintToChat(stv, "%s", buffer);
}

stock int FindSTV()
{
  if (!(PrintToSTV_iLastStvClient >= 1 && PrintToSTV_iLastStvClient <= MaxClients && IsClientConnected(PrintToSTV_iLastStvClient) && IsClientInGame(PrintToSTV_iLastStvClient) && IsClientSourceTV(PrintToSTV_iLastStvClient)))
  {
    PrintToSTV_iLastStvClient = -1;

    for (int client = 1; client <= MaxClients; client++)
    {
      if (IsClientConnected(client) && IsClientInGame(client) && IsClientSourceTV(client))
      {
        PrintToSTV_iLastStvClient = client;
        break;
      }
    }
  }

  return PrintToSTV_iLastStvClient;
}