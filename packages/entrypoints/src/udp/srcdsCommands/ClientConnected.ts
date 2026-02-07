import { logger } from '@tf2qs/telemetry';
import { SRCDSCommandParser } from "./SRCDSCommand";

type ClientConnectedArgs = {
  nickname: string;
  ipAddress: string;
  steamId3: string;
};

export const clientConnected: SRCDSCommandParser<ClientConnectedArgs> = (rawString) => {
  // Example: "02/05/2026 - 01:42:17: \"sonikro<5><[U:1:29162964]><>\" connected, address \"169.254.249.16:18930\""
  const match = rawString.match(/"([^<]+)<\d+><\[([^\]]+)\]><>"\s+connected,\s+address\s+"([^:]+):/);
  
  if (!match) {
    return null;
  }

  const [, nickname, steamId3, ipAddress] = match;

  return {
    raw: rawString,
    args: { nickname, ipAddress, steamId3 },
    type: "clientConnected",
    handler: async ({ args, services }) => {
      const { nickname, ipAddress, steamId3 } = args;

      logger.emit({
        severityText: 'INFO',
        body: 'Client connected to server',
        attributes: {
          nickname,
          ipAddress,
          steamId3,
        },
      });

      // Persist connection history
      await services.playerConnectionHistoryRepository.save({
        connectionHistory: {
          steamId3,
          ipAddress,
          nickname,
          timestamp: new Date(),
        },
      });
    },
  };
};
