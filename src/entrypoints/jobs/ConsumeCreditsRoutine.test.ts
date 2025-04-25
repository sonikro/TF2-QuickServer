import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumeCreditsFromRunningServers } from "../../core/usecase/ConsumeCreditsFromRunningServers";
import { mock } from "vitest-mock-extended";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { scheduleConsumeCreditsRoutine } from ".";
import schedule from "node-schedule";


vi.mock("node-schedule")

describe("scheduleConsumeCreditsRoutine", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    })
    const createTestEnvironment = () => {
        const consumeCreditsFromRunningServers = mock<ConsumeCreditsFromRunningServers>();
        const configManager = mock<ConfigManager>();

        return {
            dependencies: {
                consumeCreditsFromRunningServers,
                configManager
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