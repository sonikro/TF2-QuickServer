import { ScheduledServer, ScheduledServerStatus } from "../domain";

export interface ScheduledServerRepository {
    create(schedule: ScheduledServer): Promise<void>;
    findById(id: string): Promise<ScheduledServer | null>;
    findActiveByUserId(userId: string): Promise<ScheduledServer[]>; // status IN ('scheduled','creating') ordered by scheduledAt ASC
    findDue(now: Date): Promise<ScheduledServer[]>; // status='scheduled' AND triggerAt <= now
    findStuckCreating(before: Date): Promise<ScheduledServer[]>; // status='creating' AND updatedAt <= before
    claimForProcessing(id: string, now: Date): Promise<boolean>; // atomic 'scheduled'->'creating'; false if already claimed
    markStatus(id: string, status: ScheduledServerStatus, serverId?: string, now?: Date): Promise<void>;
    cancel(id: string, now: Date): Promise<boolean>; // 'scheduled'->'cancelled'; false if no longer cancellable
}
