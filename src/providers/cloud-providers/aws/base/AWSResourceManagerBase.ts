import { logger, tracer } from '../../../../telemetry/otel';
import { Span } from '@opentelemetry/api';
import { Region } from '../../../../core/domain';
import { ConfigManager } from '../../../../core/utils/ConfigManager';
import { AWSClients } from '../../../services/defaultAWSServiceFactory';

/**
 * Base class for AWS resource managers providing common patterns
 */
export abstract class AWSResourceManagerBase {
    constructor(
        protected readonly configManager: ConfigManager,
        protected readonly awsClientFactory: (rootRegion: string) => AWSClients
    ) {}

    /**
     * Executes an operation with proper tracing and error handling
     */
    protected async executeWithTracing<T>(
        operationName: string,
        serverId: string,
        operation: (span: Span) => Promise<T>
    ): Promise<T> {
        return await tracer.startActiveSpan(operationName, async (span: Span) => {
            span.setAttribute('serverId', serverId);
            try {
                return await operation(span);
            } catch (error) {
                logger.emit({
                    severityText: 'ERROR',
                    body: `${operationName} failed for server: ${serverId}`,
                    attributes: { 
                        serverId, 
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
     * Gets AWS configuration for a region
     */
    protected getAWSRegionConfig(region: Region) {
        const awsConfig = this.configManager.getAWSConfig();
        const awsRegionConfig = awsConfig.regions[region];

        if (!awsRegionConfig) {
            throw new Error(`Region ${region} is not configured in AWS config`);
        }

        return awsRegionConfig;
    }

    /**
     * Gets AWS clients for a region
     */
    protected getAWSClients(region: Region): AWSClients {
        const awsRegionConfig = this.getAWSRegionConfig(region);
        return this.awsClientFactory(awsRegionConfig.rootRegion);
    }

    /**
     * Logs operation start
     */
    protected logOperationStart(operation: string, serverId: string, region: Region, additionalAttrs?: Record<string, any>) {
        logger.emit({
            severityText: 'INFO',
            body: `${operation} for server: ${serverId}`,
            attributes: { serverId, region, ...additionalAttrs }
        });
    }

    /**
     * Logs operation success
     */
    protected logOperationSuccess(operation: string, serverId: string, region: Region, additionalAttrs?: Record<string, any>) {
        logger.emit({
            severityText: 'INFO',
            body: `${operation} completed successfully for server: ${serverId}`,
            attributes: { serverId, region, ...additionalAttrs }
        });
    }
}
