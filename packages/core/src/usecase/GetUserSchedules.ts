import { ScheduledServer } from "../domain";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";

type GetUserSchedulesParams = {
    userId: string;
}

export class GetUserSchedules {
    constructor(private readonly dependencies: {
        scheduledServerRepository: ScheduledServerRepository;
    }) { }

    async execute(params: GetUserSchedulesParams): Promise<ScheduledServer[]> {
        const { scheduledServerRepository } = this.dependencies;
        const { userId } = params;

        return scheduledServerRepository.findActiveByUserId(userId);
    }
}
