import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetUserServers, Server, Region } from "@tf2qs/core";
import { getMyServersCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("GetMyServers Command Handler", () => {
    const makeSut = () => {
        const getUserServers = mock<GetUserServers>();
        const handler = getMyServersCommandHandlerFactory({ getUserServers });
        return { handler, getUserServers };
    };

    it("should display message when user has no servers", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve([]);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '📭 You do not have any active servers at the moment.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should display all user servers with their details", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: "1.2.3.4",
                hostPort: 27015,
                tvIp: "1.2.3.4",
                tvPort: 27020,
                rconPassword: "rcon123",
                rconAddress: "1.2.3.4:27015",
                hostPassword: "server123",
                tvPassword: "tv123",
                status: "ready",
                createdBy: userId
            }
        ];

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('🖥️ **Your Active Servers:**'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('São Paulo'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('standard-competitive'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('SDR Connect'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('Direct Connect'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('TV Connect'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('rcon_address'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('rcon_password'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should include server status in the output", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.US_CHICAGO_1,
                variant: "standard-competitive",
                hostIp: chance.ip(),
                hostPort: 27015,
                tvIp: chance.ip(),
                tvPort: 27020,
                rconPassword: chance.word(),
                rconAddress: `${chance.ip()}:27015`,
                status: "ready",
                createdBy: userId
            }
        ];

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('ready'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should not display connection details for pending servers", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.US_CHICAGO_1,
                variant: "standard-competitive",
                hostIp: chance.ip(),
                hostPort: 27015,
                tvIp: chance.ip(),
                tvPort: 27020,
                rconPassword: chance.word(),
                rconAddress: `${chance.ip()}:27015`,
                status: "pending",
                createdBy: userId
            }
        ];

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('pending'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('Server details will be available once the server is ready'),
            flags: MessageFlags.Ephemeral
        });
        const replyContent = (interaction.reply as any).mock.calls[0][0].content;
        expect(replyContent).not.toContain('connect');
        expect(replyContent).not.toContain('RCON');
    });

    it("should display multiple servers when user has more than one", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: chance.ip(),
                hostPort: 27015,
                tvIp: chance.ip(),
                tvPort: 27020,
                rconPassword: chance.word(),
                rconAddress: `${chance.ip()}:27015`,
                status: "ready",
                createdBy: userId
            },
            {
                serverId: chance.guid(),
                region: Region.US_CHICAGO_1,
                variant: "standard-competitive",
                hostIp: chance.ip(),
                hostPort: 27015,
                tvIp: chance.ip(),
                tvPort: 27020,
                rconPassword: chance.word(),
                rconAddress: `${chance.ip()}:27015`,
                status: "ready",
                createdBy: userId
            }
        ];

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('**Server 1**'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('**Server 2**'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should warn when content is too long to display", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = Array.from({ length: 20 }, () => ({
            serverId: chance.guid(),
            region: Region.SA_SAOPAULO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.string({ length: 50 }),
            rconAddress: `${chance.ip()}:27015`,
            hostPassword: chance.string({ length: 50 }),
            tvPassword: chance.string({ length: 50 }),
            status: "ready",
            createdBy: userId
        }));

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '⚠️ You have too many servers to display all details at once. Please terminate some servers and try again.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should ensure message is ephemeral for privacy", async () => {
        // Given
        const { handler, getUserServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const userId = chance.guid();
        interaction.user.id = userId;

        const servers: Server[] = [{
            serverId: chance.guid(),
            region: Region.SA_SAOPAULO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.word(),
            rconAddress: `${chance.ip()}:27015`,
            status: "ready",
            createdBy: userId
        }];

        when(getUserServers.execute)
            .calledWith({ userId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                flags: MessageFlags.Ephemeral
            })
        );
    });
});
