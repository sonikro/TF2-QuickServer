import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { toBrlCents } from "@tf2qs/core";
import { BcbPtaxProvider } from "./bcb_ptax_provider";

describe("BcbPtaxProvider", () => {
    const server = setupServer();

    function makeSut(overrides: { cacheTtlMs?: number } = {}) {
        const requests: string[] = [];
        const sut = new BcbPtaxProvider({ cacheTtlMs: overrides.cacheTtlMs });
        return { sut, requests };
    }

    function usePtaxHandler(requests: string[], quotesByDay: Record<string, number>) {
        server.use(
            http.get(/olinda\.bcb\.gov\.br.*CotacaoMoedaDia/, ({ request }) => {
                requests.push(request.url);
                const day = (new URL(request.url).searchParams.get("@dataCotacao") ?? "").replace(/'/g, "");
                const rate = day ? quotesByDay[day] : undefined;
                if (rate === undefined) {
                    return HttpResponse.json({ value: [] });
                }
                return HttpResponse.json({ value: [{ cotacaoVenda: rate, dataHoraCotacao: "2026-10-06 13:00:00.000" }] });
            })
        );
    }

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("Given a PTAX quote for the date When converting Then returns the venda rate", async () => {
        // Given
        const { sut, requests } = makeSut();
        usePtaxHandler(requests, { "10-06-2026": 5.4321 });

        // When
        const result = await sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // Then
        expect(result.rate).toBe(5.4321);
        expect(result.source).toBe("PTAX");
        expect(result.quotedAt).toBeInstanceOf(Date);
        expect(toBrlCents({ amount: 10, fxRate: result.rate })).toBe(5432);
        expect(requests).toHaveLength(1);
    });

    it("Given no quote on the date When converting Then falls back to the previous business day", async () => {
        // Given
        const { sut, requests } = makeSut();
        usePtaxHandler(requests, { "10-05-2026": 5.5 });

        // When
        const result = await sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // Then
        expect(result.rate).toBe(5.5);
        expect(result.source).toBe("PTAX");
        expect(requests).toHaveLength(2);
        expect(requests[0]).toContain("10-06-2026");
        expect(requests[1]).toContain("10-05-2026");
    });

    it("Given no quotes for seven days When converting Then throws", async () => {
        // Given
        const { sut, requests } = makeSut();
        usePtaxHandler(requests, {});

        // When
        const attempt = sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // Then
        await expect(attempt).rejects.toThrow("last 7 days");
        expect(requests).toHaveLength(7);
    });

    it("Given a cached quote When converting again Then performs no new request", async () => {
        // Given
        const { sut, requests } = makeSut();
        usePtaxHandler(requests, { "10-06-2026": 5.4321 });
        await sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // When
        const result = await sut.getBrlPerUsd({ date: new Date("2026-10-06T18:00:00.000Z") });

        // Then
        expect(result.rate).toBe(5.4321);
        expect(requests).toHaveLength(1);
    });

    it("Given a zero cache TTL When converting twice Then requests both times", async () => {
        // Given
        const { sut, requests } = makeSut({ cacheTtlMs: 0 });
        usePtaxHandler(requests, { "10-06-2026": 5.4321 });

        // When
        await sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });
        await sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // Then
        expect(requests).toHaveLength(2);
    });

    it("Given a PTAX server error When converting Then throws a descriptive error", async () => {
        // Given
        const { sut } = makeSut();
        server.use(
            http.get(/olinda\.bcb\.gov\.br.*CotacaoMoedaDia/, () => new HttpResponse(null, { status: 500 }))
        );

        // When
        const attempt = sut.getBrlPerUsd({ date: new Date("2026-10-06T12:00:00.000Z") });

        // Then
        await expect(attempt).rejects.toThrow("status 500");
    });
});
