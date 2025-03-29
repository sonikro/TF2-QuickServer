import { SlashCommandBuilder } from "discord.js";

export const createServerCommandDefinition = new SlashCommandBuilder()
    .setName('create-server')
    .setDescription('Deploys a new TF2 server in the selected region with a specific variant')
    .addStringOption(option =>
        option.setName('region')
            .setDescription('Region to deploy the server')
            .addChoices([
                { name: "US - N. Virginia", value: "us-east-1" },
                { name: "US - Ohio", value: "us-east-2" },
                { name: "US - N. California", value: "us-west-1" },
                { name: "US - Oregon", value: "us-west-2" },
                { name: "CA - Central", value: "ca-central-1" },
                { name: "CA - Calgary", value: "ca-west-1" },
                { name: "CN - Beijing ", value: "cn-north-1" },
                { name: "EU - Frankfurt", value: "eu-central-1" },
                { name: "EU - Zurich", value: "eu-central-2" },
                { name: "EU - Ireland", value: "eu-west-1" },
                { name: "EU - London", value: "eu-west-2" },
                { name: "EU - Paris", value: "eu-west-3" },
                { name: "EU - Milan", value: "eu-south-1" },
                { name: "EU - Spain", value: "eu-south-2" },
                { name: "EU - Stockholm", value: "eu-north-1" },
                { name: "AP - Hong Kong", value: "ap-east-1" },
                { name: "AP - Mumbai", value: "ap-south-1" },
                { name: "AP - Tokyo", value: "ap-northeast-1" },
                { name: "AP - Seoul", value: "ap-northeast-2" },
                { name: "AP - Osaka", value: "ap-northeast-3" },
                { name: "AP - Singapore", value: "ap-southeast-1" },
                { name: "AP - Sydney", value: "ap-southeast-2" },
                { name: "AP - Melbourne", value: "ap-southeast-4" },
                { name: "SA - São Paulo", value: "sa-east-1" },
                { name: "AF - Cape Town", value: "af-south-1" }
            ])
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('variant_name')
            .setDescription('Variant of the TF2 server (6v6, 9v9, etc.)')
            .addChoices([
                { name: "Standard Competitive", value: "standard-competitive" }
            ])
            .setRequired(true)
    )
