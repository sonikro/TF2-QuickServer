import schedule from "node-schedule";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { CheckForTf2Update, EventLogger } from "@tf2qs/core";
import { scheduleTf2UpdateCheckRoutine } from "./Tf2UpdateCheckRoutine";

vi.mock("node-schedule")

describe("Tf2UpdateCheckRoutine", () => {

    const makeSut = () => {
        const scheduleMock = vi.mocked(schedule)
        scheduleMock.scheduleJob.mockClear();

        const dependencies = {
            checkForTf2Update: mock<CheckForTf2Update>(),
            eventLogger: mock<EventLogger>(),
        }
        dependencies.checkForTf2Update.execute.mockResolvedValue({
            updateDetected: false,
            currentVersion: "x",
            workflowTriggered: false,
        });

        return {
            sut: scheduleTf2UpdateCheckRoutine,
            scheduleMock,
            dependencies,
        }
    }

    describe("Scheduling", () => {

        it("should schedule the job to run every five minutes", () => {
            // Given
            const { sut, scheduleMock, dependencies } = makeSut();

            // When
            sut(dependencies);

            // Then
            expect(scheduleMock.scheduleJob).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
        })

    })

    describe("Job Execution", () => {

        it("should call checkForTf2Update.execute", async () => {
            // Given
            const { sut, dependencies, scheduleMock } = makeSut();

            sut(dependencies);

            const scheduledJobCallback = scheduleMock.scheduleJob.mock.calls[0][1] as unknown as () => Promise<void>;

            // When
            await scheduledJobCallback();

            // Then
            expect(dependencies.checkForTf2Update.execute).toHaveBeenCalled();
        })
    })
})
