import { describe, expect, it,vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { clientConnected } from "./ClientConnected";
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

describe("clientConnected command parser", () => {
  it("should parse a valid client connected message", () => {
    const rawString = 'Client "sonikro" connected (169.254.249.16:18930).';
    const result = clientConnected(rawString);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("clientConnected");
    expect(result?.args).toEqual({ nickname: "sonikro", ipAddress: "169.254.249.16" });
  });

  it("should return null for non-matching string", () => {
    const rawString = "invalid log line";
    const result = clientConnected(rawString);
    expect(result).toBeNull();
  });

  it("should handle nicknames with special characters", () => {
    const rawString = 'Client "player[TAG]" connected (192.168.1.100:27015).';
    const result = clientConnected(rawString);
    expect(result).not.toBeNull();
    expect(result?.args).toEqual({ nickname: "player[TAG]", ipAddress: "192.168.1.100" });
  });

  describe("handler", () => {
    const rawString = 'Client "sonikro" connected (169.254.249.16:18930).';

    function createTestEnvironment() {
      const services = mockDeep<UDPCommandsServices>();
      const command = clientConnected(rawString);
      const handler = command?.handler;
      return { services, command, handler };
    }

    it("should log client connection information", async () => {
      const { services, command, handler } = createTestEnvironment();
      if (!command || !handler) throw new Error("Command or handler is undefined");

      await handler({
        args: command.args,
        password: "test-password",
        services,
      });

      expect(logger.emit).toHaveBeenCalledWith({
        severityText: "INFO",
        body: `Client connected to server`,
        attributes: {
          nickname: "sonikro",
          ipAddress: "169.254.249.16"
        }
      });

    });
  });
});
