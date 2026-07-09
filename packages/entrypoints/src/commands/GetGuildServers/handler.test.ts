import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { GetGuildServers, Server, Region } from "@tf2qs/core";
import { getGuildServersCommandHandlerFactory } from "./handler";
import Chance from "chance";

const chance = new Chance();

describe("GetGuildServers Command Handler", () => {
    const makeSut = () => {
        const getGuildServers = mock<GetGuildServers>();
        const handler = getGuildServersCommandHandlerFactory({ getGuildServers });
        return { handler, getGuildServers };
    };

    it("should reply with error when invoked in DMs (no guildId)", async () => {
        // Given
        const { handler } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        interaction.guildId = null as any;

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('only available within a Discord server'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should display message when guild has no active servers", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve([]);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '📭 No active servers found for this Discord guild.',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should display an ASCII table with all server details", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: "1.2.3.4",
                hostPort: 27015,
                tvIp: "5.6.7.8",
                tvPort: 27020,
                rconPassword: "rcon-secret",
                rconAddress: "1.2.3.4",
                hostPassword: "sv-pass",
                tvPassword: "tv-pass",
                status: "ready",
                guildId
            }
        ];

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('🖥️ **Active Servers for this Guild'),
            flags: MessageFlags.Ephemeral
        });
        // Verify the compact format has a header explaining columns
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('`ID` | `Region` | `Address` | `TV` | `SV Pass` | `TV Pass` | `RCON Pass`'),
            flags: MessageFlags.Ephemeral
        });
        // Verify data values appear without per-line labels (no TV:/SV: prefixes)
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('1.2.3.4:27015 | 5.6.7.8:27020 | sv-pass | tv-pass | rcon-secret'),
            flags: MessageFlags.Ephemeral
        });
        // Verify actual data values appear
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('1.2.3.4'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('27015'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('São Paulo'),
            flags: MessageFlags.Ephemeral
        });
        // Region should appear as second field after server ID
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('` | São Paulo |'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should display multiple servers when guild has more than one", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        const servers: Server[] = [
            {
                serverId: chance.guid(),
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: "1.2.3.4",
                hostPort: 27015,
                tvIp: "5.6.7.8",
                tvPort: 27020,
                rconPassword: "rcon1",
                rconAddress: "1.2.3.4",
                hostPassword: "sv1",
                tvPassword: "tv1",
                status: "ready",
                guildId
            },
            {
                serverId: chance.guid(),
                region: Region.US_CHICAGO_1,
                variant: "casual",
                hostIp: "9.10.11.12",
                hostPort: 27015,
                tvIp: "13.14.15.16",
                tvPort: 27020,
                rconPassword: "rcon2",
                rconAddress: "9.10.11.12",
                hostPassword: "sv2",
                tvPassword: "tv2",
                status: "ready",
                guildId
            }
        ];

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('1.2.3.4'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('9.10.11.12'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('São Paulo'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('Chicago'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should warn when there are too many servers to display", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        // Generate enough servers with long fields to exceed 2000 chars
        const servers: Server[] = Array.from({ length: 15 }, () => ({
            serverId: chance.guid(),
            region: Region.SA_SAOPAULO_1,
            variant: "standard-competitive",
            hostIp: chance.ip(),
            hostPort: 27015,
            tvIp: chance.ip(),
            tvPort: 27020,
            rconPassword: chance.string({ length: 30 }),
            rconAddress: chance.ip(),
            hostPassword: chance.string({ length: 30 }),
            tvPassword: chance.string({ length: 30 }),
            status: "ready",
            guildId
        }));

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('too many to display'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with error when use case throws a UserError", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenReject(Object.assign(new Error('Something went wrong'), { name: 'UserError' }));

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'Something went wrong',
            flags: MessageFlags.Ephemeral
        });
    });

    it("should reply with generic message on unexpected error", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenReject(new Error('Database connection failed'));

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('unexpected error occurred'),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should ensure message is ephemeral for privacy", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

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
                rconAddress: chance.ip(),
                hostPassword: chance.word(),
                tvPassword: chance.word(),
                status: "ready",
                guildId
            }
        ];

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.any(String),
            flags: MessageFlags.Ephemeral
        });
    });

    it("should show first 8 characters of server ID", async () => {
        // Given
        const { handler, getGuildServers } = makeSut();
        const interaction = mock<ChatInputCommandInteraction>();
        const guildId = chance.guid();
        interaction.guildId = guildId;

        const serverId = "abcdefghijklmnop";
        const servers: Server[] = [
            {
                serverId,
                region: Region.SA_SAOPAULO_1,
                variant: "standard-competitive",
                hostIp: chance.ip(),
                hostPort: 27015,
                tvIp: chance.ip(),
                tvPort: 27020,
                rconPassword: chance.word(),
                rconAddress: chance.ip(),
                hostPassword: chance.word(),
                tvPassword: chance.word(),
                status: "ready",
                guildId
            }
        ];

        when(getGuildServers.execute)
            .calledWith({ guildId })
            .thenResolve(servers);

        // When
        await handler(interaction);

        // Then
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('abcdefgh'),
            flags: MessageFlags.Ephemeral
        });
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.not.stringContaining('abcdefghijklmnop'),
            flags: MessageFlags.Ephemeral
        });
    });
});
