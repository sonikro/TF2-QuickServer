import { logger } from '@tf2qs/telemetry';
import { SRCDSCommandParser } from "./SRCDSCommand";

type LoadingMapArgs = {
  map: string;
};

export const loadingMap: SRCDSCommandParser<LoadingMapArgs> = (rawString) => {
  const match = rawString.match(/Loading map "([^"]+)"/);
  
  if (!match) {
    return null;
  }

  const [, map] = match;

  return {
    raw: rawString,
    args: { map },
    type: "loadingMap",
    handler: async ({ args, services }) => {
      const { map } = args;

      logger.emit({
        severityText: 'INFO',
        body: 'Server loading map',
        attributes: {
          map,
        },
      });

      await services.serverStatusMetricsRepository.save({
        metric: {
          map,
          timestamp: new Date(),
        },
      });
    },
  };
};
