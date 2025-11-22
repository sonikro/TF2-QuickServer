import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { ConfigManager } from "@tf2qs/core";
import schedule from "node-schedule";
import { TerminateServersWithoutCredit } from "@tf2qs/core";
import { scheduleTerminateServersWithoutCreditRoutine } from "./TerminateServersWithoutCreditRoutine";
import { EventLogger } from "@tf2qs/core";

vi.mock("node-schedule");

describe("scheduleTerminateServersWithoutCreditRoutine", () => {

    beforeEach(() => {
        vi.clearAllMocks();
    })
    const createTestEnvironment = () => {
        const terminateServersWithoutCredit = mock<TerminateServersWithoutCredit>();
        const configManager = mock<ConfigManager>();
        const eventLogger = mock<EventLogger>();


        return {
            dependencies: {
                terminateServersWithoutCredit,
                configManager,
                eventLogger
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