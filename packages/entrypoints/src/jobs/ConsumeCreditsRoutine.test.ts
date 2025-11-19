import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumeCreditsFromRunningServers } from "@tf2qs/core/src/usecase/ConsumeCreditsFromRunningServers";
import { mock } from "vitest-mock-extended";
import { ConfigManager } from "@tf2qs/core/src/utils/ConfigManager";
import { scheduleConsumeCreditsRoutine } from ".";
import schedule from "node-schedule";
import { EventLogger } from "@tf2qs/core/src/services/EventLogger";


vi.mock("node-schedule")

describe("scheduleConsumeCreditsRoutine", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    })
    const createTestEnvironment = () => {
        const consumeCreditsFromRunningServers = mock<ConsumeCreditsFromRunningServers>();
        const configManager = mock<ConfigManager>();
        const eventLogger = mock<EventLogger>();

        return {
            dependencies: {
                consumeCreditsFromRunningServers,
                configManager,
                eventLogger
            }
        }

    }
    it("should schedule the job if credits are enabled", () => {
        const { dependencies } = createTestEnvironment();
        dependencies.configManager.getCreditsConfig.mockReturnValue({
            enabled: true,
        });

        scheduleConsumeCreditsRoutine(dependencies);

        expect(schedule.scheduleJob).toHaveBeenCalledWith('* * * * *', expect.any(Function));

    })

    it("should not schedule the job if credits are disabled", () => {
        const { dependencies } = createTestEnvironment();
        dependencies.configManager.getCreditsConfig.mockReturnValue({
            enabled: false,
        });

        scheduleConsumeCreditsRoutine(dependencies);

        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    })

})