import schedule from "node-schedule";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { EventLogger, ExecuteScheduledServers } from "@tf2qs/core";
import { scheduleScheduledServerCreationRoutine } from "./ScheduledServerCreationRoutine";

vi.mock("node-schedule")

describe("ScheduledServerCreationRoutine", () => {

    const makeSut = () => {
        const scheduleMock = vi.mocked(schedule)

        const dependencies = {
            executeScheduledServers: mock<ExecuteScheduledServers>(),
            eventLogger: mock<EventLogger>(),
        }

        return {
            sut: scheduleScheduledServerCreationRoutine,
            scheduleMock,
            dependencies,
        }
    }

    describe("Scheduling", () => {

        it("should schedule the job to run every minute", () => {
            // Given
            const { sut, scheduleMock, dependencies } = makeSut();

            // When
            sut(dependencies);

            // Then
            expect(scheduleMock.scheduleJob).toHaveBeenCalledWith("* * * * *", expect.any(Function));
        })

    })

    describe("Job Execution", () => {
        // Given
        const { sut, dependencies, scheduleMock } = makeSut();

        sut(dependencies);

        const scheduledJobCallback = scheduleMock.scheduleJob.mock.calls[0][1];
        scheduledJobCallback(new Date());

        it("should call executeScheduledServers.execute", () => {
            expect(dependencies.executeScheduledServers.execute).toHaveBeenCalled();
        })
    })
})
