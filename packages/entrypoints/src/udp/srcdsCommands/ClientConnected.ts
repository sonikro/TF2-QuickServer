import { logger } from '@tf2qs/telemetry';
import { SRCDSCommandParser } from "./SRCDSCommand";

type ClientConnectedArgs = {
  nickname: string;
  ipAddress: string;
};

export const clientConnected: SRCDSCommandParser<ClientConnectedArgs> = (rawString) => {
  // Example: Client "sonikro" connected (169.254.249.16:18930).
  const match = rawString.match(/Client "([^"]+)" connected \(([^:]+):(\d+)\)/);
  
  if (!match) {
    return null;
  }

  const [, nickname, ipAddress] = match;

  return {
    raw: rawString,
    args: { nickname, ipAddress },
    type: "clientConnected",
    handler: async ({ args }) => {
      const { nickname, ipAddress } = args;

      logger.emit({
        severityText: 'INFO',
        body: 'Client connected to server',
        attributes: {
          nickname,
          ipAddress,
        },
      });
    },
  };
};
