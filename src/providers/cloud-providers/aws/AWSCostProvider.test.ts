import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { Region } from "../../../core/domain/Region";
import { AWSCostProvider } from "./AWSCostProvider";

vi.mock("../../../telemetry/otel", () => ({
  logger: {
    emit: vi.fn(),
  },
}));

const ceClientMock = mockClient(CostExplorerClient);

describe("AWSCostProvider", () => {
  beforeEach(() => {
    ceClientMock.reset();
    vi.clearAllMocks();
  });

  function makeSut() {
    const clientFactoryMock = vi.fn(() => ({
      ecsClient: {} as any,
      ec2Client: {} as any,
      ceClient: ceClientMock as unknown as CostExplorerClient,
    }));

    const sut = new AWSCostProvider({ clientFactory: clientFactoryMock });

    return {
      sut,
      clientFactory: clientFactoryMock,
      ceClient: ceClientMock,
    };
  }

  it("should fetch cost for a region within date range", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_CHICAGO_1;
    const dateRange = {
      startDate: new Date("2025-10-01"),
      endDate: new Date("2025-10-31"),
    };

    const mockResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Metrics: {
                NetUnblendedCost: {
                  Amount: "150.50",
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result).toEqual({
      currency: "USD",
      value: 150.5,
    });
    expect(ceClient).toHaveReceivedCommandTimes(GetCostAndUsageCommand, 1);
  });

  it("should handle multiple cost groups", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.SA_SAOPAULO_1;
    const dateRange = {
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-09-30"),
    };

    const mockResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Metrics: {
                NetUnblendedCost: {
                  Amount: "100.00",
                  Unit: "USD",
                },
              },
            },
            {
              Metrics: {
                NetUnblendedCost: {
                  Amount: "50.50",
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(150.5);
  });

  it("should handle total cost when no groups present", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.EU_FRANKFURT_1;
    const dateRange = {
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-08-31"),
    };

    const mockResponse = {
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "200.75",
              Unit: "USD",
            },
          },
        },
      ],
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(200.75);
  });

  it("should return zero cost when no results", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.AP_SYDNEY_1;
    const dateRange = {
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-07-31"),
    };

    const mockResponse = {
      ResultsByTime: undefined,
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(0);
  });

  it("should return zero cost when ResultsByTime is empty array", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_EAST_1_BUE_1;
    const dateRange = {
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-06-30"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [],
    });

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(0);
  });

  it("should handle missing Amount field gracefully", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_EAST_1_LIM_1;
    const dateRange = {
      startDate: new Date("2025-05-01"),
      endDate: new Date("2025-05-31"),
    };

    const mockResponse = {
      ResultsByTime: [
        {
          Groups: [
            {
              Metrics: {
                NetUnblendedCost: {
                  Unit: "USD",
                },
              },
            },
          ],
        },
      ],
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(0);
  });

  it("should format date range correctly for AWS API", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.SA_SANTIAGO_1;
    const dateRange = {
      startDate: new Date("2025-10-15"),
      endDate: new Date("2025-10-20"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "50.00",
              Unit: "USD",
            },
          },
        },
      ],
    });

    // When
    await sut.fetchCost({ region, dateRange });

    // Then
    expect(ceClient).toHaveReceivedCommandWith(GetCostAndUsageCommand, {
      TimePeriod: {
        Start: "2025-10-15",
        End: "2025-10-21",
      },
      Granularity: "MONTHLY",
      Metrics: ["NetUnblendedCost"],
      GroupBy: [
        {
          Key: "REGION",
          Type: "DIMENSION",
        },
      ],
      Filter: {
        Dimensions: {
          Key: "REGION",
          Values: [region],
        },
      },
    });
  });

  it("should call clientFactory with us-east-1", async () => {
    // Given
    const { sut, clientFactory, ceClient } = makeSut();
    const region = Region.SA_BOGOTA_1;
    const dateRange = {
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-04-30"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "50.00",
              Unit: "USD",
            },
          },
        },
      ],
    });

    // When
    await sut.fetchCost({ region, dateRange });

    // Then
    expect(clientFactory).toHaveBeenCalledWith("us-east-1");
  });

  it("should include region in filter", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.EU_FRANKFURT_1;
    const dateRange = {
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-03-31"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "100.00",
              Unit: "USD",
            },
          },
        },
      ],
    });

    // When
    await sut.fetchCost({ region, dateRange });

    // Then
    expect(ceClient).toHaveReceivedCommandWith(GetCostAndUsageCommand, {
      TimePeriod: {
        Start: "2025-03-01",
        End: "2025-04-01",
      },
      Granularity: "MONTHLY",
      Metrics: ["NetUnblendedCost"],
      GroupBy: [
        {
          Key: "REGION",
          Type: "DIMENSION",
        },
      ],
      Filter: {
        Dimensions: {
          Key: "REGION",
          Values: [region],
        },
      },
    });
  });

  it("should throw error when AWS API fails", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_CHICAGO_1;
    const dateRange = {
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-02-28"),
    };

    const error = new Error("AWS API Error");
    ceClient.on(GetCostAndUsageCommand).rejects(error);

    // When & Then
    await expect(sut.fetchCost({ region, dateRange })).rejects.toThrow("AWS API Error");
  });

  it.each([
    { region: Region.SA_SAOPAULO_1 },
    { region: Region.SA_SANTIAGO_1 },
    { region: Region.US_CHICAGO_1 },
    { region: Region.EU_FRANKFURT_1 },
    { region: Region.AP_SYDNEY_1 },
  ])("should work with different regions", async ({ region }) => {
    // Given
    const { sut, ceClient } = makeSut();
    const dateRange = {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves({
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "123.45",
              Unit: "USD",
            },
          },
        },
      ],
    });

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.currency).toBe("USD");
    expect(result.value).toBe(123.45);
  });

  it("should sum costs from multiple time periods", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.SA_BOGOTA_1;
    const dateRange = {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    };

    const mockResponse = {
      ResultsByTime: [
        {
          Total: {
            NetUnblendedCost: {
              Amount: "100.00",
              Unit: "USD",
            },
          },
        },
        {
          Total: {
            NetUnblendedCost: {
              Amount: "50.50",
              Unit: "USD",
            },
          },
        },
      ],
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(150.5);
  });
});
