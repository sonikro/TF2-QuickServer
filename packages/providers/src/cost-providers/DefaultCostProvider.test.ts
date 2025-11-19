import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { Region } from "@tf2qs/core/src/domain/Region";
import { CostProvider } from "@tf2qs/core/src/services/CostProvider";
import { DefaultCostProvider } from "./DefaultCostProvider";

describe("DefaultCostProvider", () => {
  function makeSut() {
    const oracleCostProviderMock = mock<CostProvider>();
    const awsCostProviderMock = mock<CostProvider>();
    
    const sut = new DefaultCostProvider({
      oracleCostProvider: oracleCostProviderMock,
      awsCostProvider: awsCostProviderMock,
    });

    return {
      sut,
      oracleCostProvider: oracleCostProviderMock,
      awsCostProvider: awsCostProviderMock,
    };
  }
  it.each([
    { region: Region.SA_SAOPAULO_1 },
    { region: Region.SA_SANTIAGO_1 },
    { region: Region.SA_BOGOTA_1 },
  ])("should use OracleCostProvider for Oracle region $region", async ({ region }) => {
    // Given
    const { sut, oracleCostProvider } = makeSut();
    const dateRange = {
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-09-30"),
    };

    const expectedCost = { currency: "USD", value: 100.00 };
    when(oracleCostProvider.fetchCost).calledWith({ region, dateRange }).thenResolve(expectedCost);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result).toEqual(expectedCost);
    expect(oracleCostProvider.fetchCost).toHaveBeenCalledWith({ region, dateRange });
  });

  it.each([
    { region: Region.US_EAST_1_BUE_1 },
    { region: Region.US_EAST_1_LIM_1 },
  ])("should use AWsCostProvider for AWS region $region", async ({ region }) => {
    // Given
    const { sut, awsCostProvider } = makeSut();
    const dateRange = {
      startDate: new Date("2025-08-01"),
      endDate: new Date("2025-08-31"),
    };

    const expectedCost = { currency: "USD", value: 200.00 };
    when(awsCostProvider.fetchCost).calledWith({ region, dateRange }).thenResolve(expectedCost);

    // When
    const result = await sut.fetchCost({ region, dateRange });

    // Then
    expect(result).toEqual(expectedCost);
    expect(awsCostProvider.fetchCost).toHaveBeenCalledWith({ region, dateRange });
  });



  it("should propagate Oracle provider errors", async () => {
    // Given
    const { sut, oracleCostProvider } = makeSut();
    const region = Region.SA_SAOPAULO_1;
    const dateRange = {
      startDate: new Date("2025-05-01"),
      endDate: new Date("2025-05-31"),
    };

    const error = new Error("Oracle API Error");
    when(oracleCostProvider.fetchCost).calledWith({ region, dateRange }).thenReject(error);

    // When & Then
    await expect(sut.fetchCost({ region, dateRange })).rejects.toThrow("Oracle API Error");
  });

  it("should propagate AWS provider errors", async () => {
    // Given
    const { sut, awsCostProvider } = makeSut();
    const region = Region.US_EAST_1_LIM_1;
    const dateRange = {
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-04-30"),
    };

    const error = new Error("AWS API Error");
    when(awsCostProvider.fetchCost).calledWith({ region, dateRange }).thenReject(error);

    // When & Then
    await expect(sut.fetchCost({ region, dateRange })).rejects.toThrow("AWS API Error");
  });

});
