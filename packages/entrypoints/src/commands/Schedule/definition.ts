import { SlashCommandBuilder } from "discord.js";
import { getRegions, getRegionDisplayName } from "@tf2qs/core";
import { SCHEDULE_TIMEZONES } from "@tf2qs/core";

export const scheduleCommandDefinition = new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Schedules a server to be created and ready at a specific time')
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region to deploy the server')
            .addChoices(getRegions().map(region => ({
                name: getRegionDisplayName(region),
                value: region
            })))
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('time')
            .setDescription('Ready time, 24h HH:mm (e.g. 21:30)')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('timezone')
            .setDescription('Your timezone')
            .addChoices(SCHEDULE_TIMEZONES.map(tz => ({ name: tz, value: tz })))
            .setRequired(true)
    );
