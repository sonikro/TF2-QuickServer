import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { createServerCommandHandlerFactory } from "./CreateServer";
import { CommandDependencies, createCommands } from "./index";
import { terminateServerHandlerFactory } from "./TerminateServer";

vi.mock("./CreateServer", () => ({
    createServerCommandHandlerFactory: vi.fn(),
    createServerCommandDefinition: {},
}));

vi.mock("./TerminateServer", () => ({
    terminateServerHandlerFactory: vi.fn(),
    terminateServerCommandDefinition: {},
}));

describe("createCommands", () => {
    it("should return commands with correct structure and dependencies", () => {
        const dependencies: CommandDependencies = mock<CommandDependencies>();

        const mockCreateServerHandler = vi.fn();
        const mockTerminateServerHandler = vi.fn();

        vi.mocked(createServerCommandHandlerFactory).mockReturnValue(mockCreateServerHandler);
        vi.mocked(terminateServerHandlerFactory).mockReturnValue(mockTerminateServerHandler);

        const commands = createCommands(dependencies);

        expect(commands).toHaveProperty("createServer");
        expect(commands.createServer.name).toBe("create-server");
        expect(commands.createServer.definition).toBeDefined();
        expect(commands.createServer.handler).toBe(mockCreateServerHandler);

        expect(commands).toHaveProperty("terminateServer");
        expect(commands.terminateServer.name).toBe("terminate-server");
        expect(commands.terminateServer.definition).toBeDefined();
        expect(commands.terminateServer.handler).toBe(mockTerminateServerHandler);

        expect(createServerCommandHandlerFactory).toHaveBeenCalledWith(dependencies);
        expect(terminateServerHandlerFactory).toHaveBeenCalledWith(dependencies);
    });
});