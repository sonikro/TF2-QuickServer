import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { Region } from "@tf2qs/core/src/domain/Region";
import { AWSCostProvider } from "./AWSCostProvider";

vi.mock("@tf2qs/telemetry/src/otel", () => ({
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

  it.each([
    {
      description: "with single group",
      region: Region.US_EAST_1_BUE_1,
      mockResponse: {
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
      },
      expectedValue: 150.5,
    },
    {
      description: "with multiple groups",
      region: Region.US_EAST_1_LIM_1,
      mockResponse: {
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
      },
      expectedValue: 150.5,
    },
    {
      description: "with total instead of groups",
      region: Region.US_EAST_1_BUE_1,
      mockResponse: {
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
      },
      expectedValue: 200.75,
    },
    {
      description: "with multiple time periods",
      region: Region.US_EAST_1_LIM_1,
      mockResponse: {
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
      },
      expectedValue: 150.5,
    },
  ])(
    "should fetch cost $description",
    async ({ region, mockResponse, expectedValue }) => {
      // Given
      const { sut, ceClient } = makeSut();
      const dateRange = {
        startDate: new Date("2025-10-01"),
        endDate: new Date("2025-10-31"),
      };

      ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

      // When
      const result = await sut.fetchCost({ region, dateRange });

      // Then
      expect(result.currency).toBe("USD");
      expect(result.value).toBe(expectedValue);
      expect(ceClient).toHaveReceivedCommandTimes(GetCostAndUsageCommand, 1);
    }
  );

  it.each([
    {
      description: "when no results",
      mockResponse: { ResultsByTime: undefined },
    },
    {
      description: "when ResultsByTime is empty",
      mockResponse: { ResultsByTime: [] },
    },
    {
      description: "when Amount field is missing",
      mockResponse: {
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
      },
    },
  ])("should return zero cost $description", async ({ mockResponse }) => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_EAST_1_BUE_1;
    const dateRange = {
      startDate: new Date("2025-10-01"),
      endDate: new Date("2025-10-31"),
    };

    ceClient.on(GetCostAndUsageCommand).resolves(mockResponse);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result.value).toBe(0);
  });

  it("should format date range and filter correctly for AWS API", async () => {
    // Given
    const { sut, ceClient, clientFactory } = makeSut();
    const region = Region.US_EAST_1_BUE_1;
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
    expect(clientFactory).toHaveBeenCalledWith("us-east-1");
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

  it("should throw error when AWS API fails", async () => {
    // Given
    const { sut, ceClient } = makeSut();
    const region = Region.US_EAST_1_LIM_1;
    const dateRange = {
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-02-28"),
    };

    const error = new Error("AWS API Error");
    ceClient.on(GetCostAndUsageCommand).rejects(error);

    // When & Then
    await expect(sut.fetchCost({ region, dateRange })).rejects.toThrow("AWS API Error");
  });
});
