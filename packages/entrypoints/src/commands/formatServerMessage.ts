import { Server, getRegionDisplayName } from "@tf2qs/core";

export function formatServerMessage(server: Server, index?: number): string {
    const regionName = getRegionDisplayName(server.region);
    const serverNumber = index !== undefined ? `**Server ${index + 1}** (${regionName})` : `**${regionName}**`;
    
    let details = `${serverNumber}\n` +
        `🆔 **Server ID:** \`${server.serverId}\`\n` +
        `🌍 **Region:** \`${regionName}\`\n` +
        `🎮 **Variant:** \`${server.variant}\`\n`;
    
    if (server.status) {
        details += `📡 **Status:** ${server.status}\n`;
    }
    
    details += `\n**CONNECT Addresses:**\n` +
        `- **SDR Connect:**\n` +
        `\`\`\`\nconnect ${server.hostIp}:${server.hostPort};${server.hostPassword ? `password ${server.hostPassword}` : ''}\n\`\`\`\n` +
        `- **Direct Connect:**\n` +
        `\`\`\`\nconnect ${server.rconAddress}:27015;${server.hostPassword ? `password ${server.hostPassword}` : ''}\n\`\`\`\n` +
        `- **TV Connect:**\n` +
        `\`\`\`\nconnect ${server.tvIp}:${server.tvPort};${server.tvPassword ? `password ${server.tvPassword}` : ''}\n\`\`\`\n` +
        `⚠️ **Warning:** If you are connecting from the SDR IP, use the following RCON commands in the console:\n` +
        `\`\`\`\nrcon_address ${server.rconAddress}\nrcon_password ${server.rconPassword}\n\`\`\`\n`;
    
    return details;
}
