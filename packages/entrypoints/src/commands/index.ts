import { ChatInputCommandInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { CreateServerForUser } from "@tf2qs/core";
import { GetServerStatus } from "@tf2qs/core";
import { GetGuildServers } from "@tf2qs/core";
import { GetUserServers } from "@tf2qs/core";
import { GetUserSchedules } from "@tf2qs/core";
import { CreateScheduledServer } from "@tf2qs/core";
import { CancelScheduledServer } from "@tf2qs/core";
import { BackgroundTaskQueue } from "@tf2qs/core";
import { createServerCommandDefinition, createServerCommandHandlerFactory } from "./CreateServer";
import { getMyServersCommandDefinition, getMyServersCommandHandlerFactory } from "./GetMyServers";
import { getGuildServersCommandDefinition, getGuildServersCommandHandlerFactory } from "./GetGuildServers";
import { terminateServerCommandDefinition, terminateServerHandlerFactory } from "./TerminateServer";
import { setUserDataDefinition, setUserDataHandlerFactory } from "./SetUserData";
import { SetUserData } from "@tf2qs/core";
import { statusCommandDefinition, createStatusCommandHandlerFactory } from "./Status";
import { scheduleCommandDefinition, createScheduleCommandHandlerFactory } from "./Schedule";
import { showSchedulesCommandDefinition, showSchedulesCommandHandlerFactory } from "./ShowSchedules";
import { cancelScheduleCommandDefinition, cancelScheduleCommandHandlerFactory } from "./CancelSchedule";

export type CommandDependencies = {
    createServerForUser: CreateServerForUser;
    setUserData: SetUserData;
    backgroundTaskQueue: BackgroundTaskQueue;
    getServerStatus: GetServerStatus;
    getGuildServers: GetGuildServers;
    getUserServers: GetUserServers;
    getUserSchedules: GetUserSchedules;
    createScheduledServer: CreateScheduledServer;
    cancelScheduledServer: CancelScheduledServer;
}

export function createCommands(dependencies: CommandDependencies) {
    return {
        createServer: {
            name: "create-server",
            definition: createServerCommandDefinition,
            handler: createServerCommandHandlerFactory({
                createServerForUser: dependencies.createServerForUser,
                backgroundTaskQueue: dependencies.backgroundTaskQueue,
            }),
        },
        terminateServer: {
            name: "terminate-servers",
            definition: terminateServerCommandDefinition,
            handler: terminateServerHandlerFactory({
                backgroundTaskQueue: dependencies.backgroundTaskQueue,
            }),
        },
        setUserData: {
            name: "set-user-data",
            definition: setUserDataDefinition,
            handler: setUserDataHandlerFactory({
                setUserData: dependencies.setUserData,
            })
        },
        status: {
            name: "status",
            definition: statusCommandDefinition,
            handler: createStatusCommandHandlerFactory({
                getServerStatus: dependencies.getServerStatus,
            })
        },
        getGuildServers: {
            name: "get-guild-servers",
            definition: getGuildServersCommandDefinition,
            handler: getGuildServersCommandHandlerFactory({
                getGuildServers: dependencies.getGuildServers,
            })
        },
        getMyServers: {
            name: "get-my-servers",
            definition: getMyServersCommandDefinition,
            handler: getMyServersCommandHandlerFactory({
                getUserServers: dependencies.getUserServers,
            })
        },
        schedule: {
            name: "schedule",
            definition: scheduleCommandDefinition,
            handler: createScheduleCommandHandlerFactory({
                createScheduledServer: dependencies.createScheduledServer,
            })
        },
        showSchedules: {
            name: "show-schedules",
            definition: showSchedulesCommandDefinition,
            handler: showSchedulesCommandHandlerFactory({
                getUserSchedules: dependencies.getUserSchedules,
            })
        },
        cancelSchedule: {
            name: "cancel-schedule",
            definition: cancelScheduleCommandDefinition,
            handler: cancelScheduleCommandHandlerFactory({
                cancelScheduledServer: dependencies.cancelScheduledServer,
            })
        }
    } satisfies Record<string, {
        name: string;
        definition: SlashCommandOptionsOnlyBuilder,
        handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }>
}
