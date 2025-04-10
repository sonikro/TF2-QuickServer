Action Command_PasstimeSpawnBall(int client, int args)
{
  char name[MAX_NAME_LENGTH];
  PrintToAllClientsChat("%d", client);
  if (client == 0) name = "CONSOLE";
  else GetClientName(client, name, sizeof(name));

  PrintToAllClientsChat("\x0700ffff[PASS] \x07ffffff%s: Spawning the ball for practice...", name);
  PrintToAllClientsChat("\x0700ffff[PASS] \x07ffff00THE GAME IS \x07ff0000NOT \x07ffff00STARTING!");
  PrintToAllClientsChat("\x0700ffff[PASS] \x07ffff00THE GAME IS \x07ff0000NOT \x07ffff00STARTING!");
  bWaitingForBallSpawnToRestart = true;
  ServerCommand("mp_restartgame_immediate 1");
  return Plugin_Handled;
}