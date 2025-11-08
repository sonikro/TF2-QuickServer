import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import { Region } from '../../../core/domain/Region';
import { OracleConfig } from '../../../core/domain/OracleConfig';
import { ConfigManager } from '../../../core/utils/ConfigManager';
import { OracleCostProvider } from './OracleCostProvider';
import { models, UsageapiClient, requests } from 'oci-usageapi';
import { logger } from '../../../telemetry/otel';

vi.mock('../../../telemetry/otel', async () => {
  const actual = await vi.importActual('../../../telemetry/otel');
  return {
    ...actual,
    logger: {
      emit: vi.fn(),
    },
  };
});

describe('OracleCostProvider', () => {
  const makeSut = () => {
    const configManager = mock<ConfigManager>();
    const usageClient = mock<UsageapiClient>();
    const ociClientFactory = vi.fn((region: Region) => ({
      usageClient,
    }));

    const sut = new OracleCostProvider({
      ociClientFactory,
      configManager,
    });

    return {
      sut,
      configManager,
      usageClient,
      ociClientFactory,
    };
  };

  describe('fetchCost', () => {
    it('should fetch cost data successfully', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummary: models.UsageSummary = {
        tenantId: 'ocid1.compartment.oc1..test123',
        timeUsageStarted: startDate,
        timeUsageEnded: endDate,
        region: region,
        computedAmount: 150.5,
        currency: 'USD',
      };

      const response = {
        usageAggregation: {
          items: [usageSummary],
        },
        opcRequestId: 'test-request-id',
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 150.5,
      });
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: 'INFO',
          body: 'Successfully fetched cost data from Oracle Cloud',
          attributes: expect.objectContaining({
            region,
            totalCost: 150.5,
            currency: 'USD',
            dateRangeStart: startDate.toISOString(),
            dateRangeEnd: endDate.toISOString(),
          }),
        })
      );
    });

    it('should sum multiple cost summaries for the same region', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummaries: models.UsageSummary[] = [
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: region,
          computedAmount: 100,
          currency: 'USD',
        },
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: region,
          computedAmount: 75.5,
          currency: 'USD',
        },
      ];

      const response = {
        usageAggregation: {
          items: usageSummaries,
        },
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 175.5,
      });
    });

    it('should filter summaries by region', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummaries: models.UsageSummary[] = [
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: region,
          computedAmount: 100,
          currency: 'USD',
        },
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: Region.US_CHICAGO_1,
          computedAmount: 50,
          currency: 'USD',
        },
      ];

      const response = {
        usageAggregation: {
          items: usageSummaries,
        },
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 100,
      });
    });

    it('should handle zero cost', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummary: models.UsageSummary = {
        tenantId: 'ocid1.compartment.oc1..test123',
        timeUsageStarted: startDate,
        timeUsageEnded: endDate,
        region: region,
        computedAmount: 0,
        currency: 'USD',
      };

      const response = {
        usageAggregation: {
          items: [usageSummary],
        },
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 0,
      });
    });

    it('should handle null computedAmount by treating as zero', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummary: models.UsageSummary = {
        tenantId: 'ocid1.compartment.oc1..test123',
        timeUsageStarted: startDate,
        timeUsageEnded: endDate,
        region: region,
        computedAmount: undefined,
        currency: 'USD',
      };

      const response = {
        usageAggregation: {
          items: [usageSummary],
        },
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 0,
      });
    });

    it('should use last non-empty currency from summaries', async () => {
      // Given
      const { sut, configManager, usageClient } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {
          [region]: {
            compartment_id: 'ocid1.compartment.oc1..test123',
            availability_domain: 'AD-1',
            subnet_id: 'subnet123',
            nsg_id: 'nsg123',
            vnc_id: 'vnc123',
            secret_id: 'secret123',
          },
        },
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      const usageSummaries: models.UsageSummary[] = [
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: region,
          computedAmount: 100,
          currency: 'USD',
        },
        {
          tenantId: 'ocid1.compartment.oc1..test123',
          timeUsageStarted: startDate,
          timeUsageEnded: endDate,
          region: region,
          computedAmount: 50,
          currency: '   ',
        },
      ];

      const response = {
        usageAggregation: {
          items: usageSummaries,
        },
      };

      when(usageClient.requestSummarizedUsages)
        .calledWith({
          requestSummarizedUsagesDetails: {
            tenantId: 'ocid1.compartment.oc1..test123',
            timeUsageStarted: startDate,
            timeUsageEnded: endDate,
            granularity: models.RequestSummarizedUsagesDetails.Granularity.Monthly,
            queryType: models.RequestSummarizedUsagesDetails.QueryType.Cost,
            groupBy: ['region'],
          },
        })
        .thenResolve(response as Awaited<ReturnType<typeof usageClient.requestSummarizedUsages>>);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result).toEqual({
        currency: 'USD',
        value: 150,
      });
    });

    it('should throw error when region is not configured', async () => {
      // Given
      const { sut, configManager } = makeSut();
      const region = Region.SA_SAOPAULO_1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const dateRange = { startDate, endDate };

      const oracleConfig: OracleConfig = {
        regions: {},
      };

      when(configManager.getOracleConfig).calledWith().thenReturn(oracleConfig);

      // When & Then
      await expect(sut.fetchCost({ region, dateRange })).rejects.toThrow(
        `Region ${region} is not configured in Oracle config`
      );
      expect(logger.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: 'ERROR',
          body: `Failed to fetch cost data from Oracle Cloud for region ${region}`,
        })
      );
    });

  });
});
