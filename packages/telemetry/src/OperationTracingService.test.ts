import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperationTracingService } from "./OperationTracingService";
import { Region } from "@tf2qs/core";
import { logger, tracer } from "./otel";

vi.mock("./otel", () => ({
    logger: {
        emit: vi.fn()
    },
    tracer: {
        startActiveSpan: vi.fn()
    }
}));

describe("OperationTracingService", () => {
    let service: OperationTracingService;
    let mockSpan: any;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new OperationTracingService();
        
        mockSpan = {
            setAttribute: vi.fn(),
            end: vi.fn()
        };
        
        vi.mocked(tracer.startActiveSpan).mockImplementation((name, callback) => {
            return (callback as any)(mockSpan);
        });
    });

    describe("executeWithTracing", () => {
        it("should execute operation with span", async () => {
            const operation = vi.fn().mockResolvedValue("success");
            
            const result = await service.executeWithTracing("test-op", "entity-123", operation);
            
            expect(tracer.startActiveSpan).toHaveBeenCalledWith("test-op", expect.any(Function));
            expect(mockSpan.setAttribute).toHaveBeenCalledWith("entityId", "entity-123");
            expect(operation).toHaveBeenCalledWith(mockSpan);
            expect(mockSpan.end).toHaveBeenCalled();
            expect(result).toBe("success");
        });

        it("should handle operation errors", async () => {
            const error = new Error("Operation failed");
            const operation = vi.fn().mockRejectedValue(error);
            
            await expect(service.executeWithTracing("test-op", "entity-123", operation))
                .rejects.toThrow("Operation failed");
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "ERROR",
                body: "test-op failed for entity: entity-123",
                attributes: {
                    entityId: "entity-123",
                    error: "Operation failed"
                }
            });
            expect(mockSpan.end).toHaveBeenCalled();
        });

        it("should handle non-Error objects", async () => {
            const operation = vi.fn().mockRejectedValue("string error");
            
            await expect(service.executeWithTracing("test-op", "entity-123", operation))
                .rejects.toBe("string error");
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "ERROR",
                body: "test-op failed for entity: entity-123",
                attributes: {
                    entityId: "entity-123",
                    error: "string error"
                }
            });
        });
    });

    describe("logOperationStart", () => {
        it("should log operation start", () => {
            service.logOperationStart("create", "server-123", Region.US_EAST_1_BUE_1);
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "INFO",
                body: "create for entity: server-123",
                attributes: {
                    entityId: "server-123",
                    region: Region.US_EAST_1_BUE_1
                }
            });
        });

        it("should log with additional attributes", () => {
            service.logOperationStart("create", "server-123", Region.US_EAST_1_BUE_1, { variant: "test" });
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "INFO",
                body: "create for entity: server-123",
                attributes: {
                    entityId: "server-123",
                    region: Region.US_EAST_1_BUE_1,
                    variant: "test"
                }
            });
        });
    });

    describe("logOperationSuccess", () => {
        it("should log operation success", () => {
            service.logOperationSuccess("delete", "server-456", Region.SA_SAOPAULO_1);
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "INFO",
                body: "delete completed successfully for entity: server-456",
                attributes: {
                    entityId: "server-456",
                    region: Region.SA_SAOPAULO_1
                }
            });
        });

        it("should log with additional attributes", () => {
            service.logOperationSuccess("deploy", "server-789", Region.EU_FRANKFURT_1, { duration: 120 });
            
            expect(logger.emit).toHaveBeenCalledWith({
                severityText: "INFO",
                body: "deploy completed successfully for entity: server-789",
                attributes: {
                    entityId: "server-789",
                    region: Region.EU_FRANKFURT_1,
                    duration: 120
                }
            });
        });
    });
});
