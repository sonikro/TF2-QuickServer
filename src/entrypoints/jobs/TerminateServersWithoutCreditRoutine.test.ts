import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ConfigManager } from "../../core/utils/ConfigManager";
import schedule from "node-schedule";
import { TerminateServersWithoutCredit } from "../../core/usecase/TerminateServersWithoutCredit";
import { scheduleTerminateServersWithoutCreditRoutine } from "./TerminateServersWithoutCreditRoutine";

vi.mock("node-schedule");

describe("scheduleTerminateServersWithoutCreditRoutine", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    })
    const createTestEnvironment = () => {
        const terminateServersWithoutCredit = mock<TerminateServersWithoutCredit>();
        const configManager = mock<ConfigManager>();

        return {
            dependencies: {
                terminateServersWithoutCredit,
                configManager
            }
        };
    };

    it("should schedule the job if termination is enabled", () => {
        const { dependencies } = createTestEnvironment();
        dependencies.configManager.getCreditsConfig.mockReturnValue({
            enabled: true,
        });

        scheduleTerminateServersWithoutCreditRoutine(dependencies);

        expect(schedule.scheduleJob).toHaveBeenCalledWith('* * * * *', expect.any(Function));
    });

    it("should not schedule the job if termination is disabled", () => {
        const { dependencies } = createTestEnvironment();
        dependencies.configManager.getCreditsConfig.mockReturnValue({
            enabled: false,
        });

        scheduleTerminateServersWithoutCreditRoutine(dependencies);

        expect(schedule.scheduleJob).not.toHaveBeenCalled();
    });

});