export interface EventLogger {
    log(args: { eventMessage: string; actorId: string;}): Promise<void>;
}