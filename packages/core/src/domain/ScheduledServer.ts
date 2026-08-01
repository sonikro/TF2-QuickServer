import { Region } from "./Region";
import { Variant } from "./Variant";

export type ScheduledServerStatus = "scheduled" | "creating" | "created" | "failed" | "cancelled";

export interface ScheduledServer {
    id: string;
    userId: string;          // Discord user id (creator)
    guildId?: string | null; // guild the /schedule command ran in
    region: Region;
    variant: Variant;
    scheduledAt: Date;       // user's expected ready time, UTC
    triggerAt: Date;         // scheduledAt - leadMinutes, UTC (computed at creation)
    status: ScheduledServerStatus;
    serverId?: string | null;
    timezone: string;        // IANA tz chosen by user
    createdAt: Date;
    updatedAt: Date;
}
