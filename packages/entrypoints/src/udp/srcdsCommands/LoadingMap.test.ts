import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { loadingMap } from "./LoadingMap";
import { UDPCommandsServices } from "./UDPCommandServices";
import { logger } from "@tf2qs/telemetry";

vi.mock("@tf2qs/telemetry", async (importActual) => {
  const actual = await importActual<typeof import("@tf2qs/telemetry")>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      emit: vi.fn(),
    },
  };
});

describe("loadingMap command parser", () => {
  it("should parse a valid loading map message", () => {
    const rawString = '02/07/2026 - 17:54:33: Loading map "cp_badlands"';
    const result = loadingMap(rawString);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("loadingMap");
    expect(result?.args).toEqual({ map: "cp_badlands" });
  });

  it("should return null for non-matching string", () => {
    const rawString = 'invalid log line';
    const result = loadingMap(rawString);
    expect(result).toBeNull();
  });

  it("should handle maps with underscores and numbers", () => {
    const rawString = '02/07/2026 - 17:54:33: Loading map "koth_product_final"';
    const result = loadingMap(rawString);
    expect(result).not.toBeNull();
    expect(result?.args).toEqual({ map: "koth_product_final" });
  });

  describe("handler", () => {
    const makeSut = () => {
      const services = mockDeep<UDPCommandsServices>();
      return { services };
    };

    it("should persist the map to the database", async () => {
      const { services } = makeSut();
      const rawString = '02/07/2026 - 17:54:33: Loading map "cp_badlands"';
      const command = loadingMap(rawString);
      
      if (!command || !command.handler) throw new Error("No handler");

      await command.handler({ args: command.args, password: "123", services });

      expect(services.serverStatusMetricsRepository.save).toHaveBeenCalledWith({
        metric: {
          map: "cp_badlands",
          timestamp: expect.any(Date),
        },
      });
    });

    it("should log the loading map event", async () => {
      const { services } = makeSut();
      const rawString = '02/07/2026 - 17:54:33: Loading map "cp_badlands"';
      const command = loadingMap(rawString);
      
      if (!command || !command.handler) throw new Error("No handler");

      await command.handler({ args: command.args, password: "123", services });

      expect(vi.mocked(logger.emit)).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Server loading map',
        attributes: {
          map: "cp_badlands",
        },
      });
    });
  });
});
