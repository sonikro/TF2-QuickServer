import type { Knex } from "knex";
import config from "config";

export async function up(knex: Knex): Promise<void> {
    const variants = config.get<Record<string, any>>('variants');
    const defaultVariant = variants['default'];
    
    for (const [variantName, variantData] of Object.entries(variants)) {
        if (variantName === 'default') continue;
        if (variantName === 'standard-competitive' && !variantData.guildId) continue;
        
        const guildId = variantData.guildId;
        if (!guildId) continue;
        
        await knex('guild_variants').insert({
            guild_id: guildId,
            variant_name: variantName,
            display_name: variantData.displayName || null,
            hostname: variantData.hostname || null,
            default_cfgs: variantData.defaultCfgs ? JSON.stringify(variantData.defaultCfgs) : null,
            admins: variantData.admins ? JSON.stringify(variantData.admins) : null,
            image: variantData.image || null,
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex('guild_variants').del();
}
