import { logger, tracer } from './otel';
import { Span } from '@opentelemetry/api';
import { Region } from '@tf2qs/core/src/domain';

/**
 * Service for adding standardized tracing and logging to operations across all cloud providers
 */
export class OperationTracingService {
    /**
     * Executes an operation with proper tracing and error handling
     */
    async executeWithTracing<T>(
        operationName: string,
        entityId: string,
        operation: (span: Span) => Promise<T>
    ): Promise<T> {
        return await tracer.startActiveSpan(operationName, async (span: Span) => {
            span.setAttribute('entityId', entityId);
            try {
                return await operation(span);
            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `${operationName} failed for entity: ${entityId}`,
                    attributes: { 
                        entityId, 
                        error: error instanceof Error ? error.message : String(error) 
                    }
                });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Logs operation start
     */
    logOperationStart(operation: string, entityId: string, region: Region, additionalAttrs?: Record<string, any>) {
        logger.emit({
            severityText: 'INFO',
            body: `${operation} for entity: ${entityId}`,
            attributes: { entityId, region, ...additionalAttrs }
        });
    }

    /**
     * Logs operation success
     */
    logOperationSuccess(operation: string, entityId: string, region: Region, additionalAttrs?: Record<string, any>) {
        logger.emit({
            severityText: 'INFO',
            body: `${operation} completed successfully for entity: ${entityId}`,
            attributes: { entityId, region, ...additionalAttrs }
        });
    }
}
