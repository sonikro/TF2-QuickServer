export interface ServerActivity {
    serverId: string;
    emptySince: Date | null;
    lastCheckedAt: Date | null;
}
