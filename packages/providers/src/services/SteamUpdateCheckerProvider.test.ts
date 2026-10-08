import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SteamUpdateCheckerProvider } from "./SteamUpdateCheckerProvider";

describe("SteamUpdateCheckerProvider", () => {
    const server = setupServer();
    const steamUrl = "https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/";

    function makeSut() {
        return { sut: new SteamUpdateCheckerProvider() };
    }

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("Given a current version When Steam reports up to date Then returns upToDate true", async () => {
        server.use(
            http.get(steamUrl, () =>
                HttpResponse.json({ response: { success: true, up_to_date: true, required_version: "11087207" } })
            )
        );
        const { sut } = makeSut();

        const result = await sut.checkUpdate({ appId: 440, currentVersion: "11087207" });

        expect(result).toEqual({ upToDate: true, requiredVersion: "11087207" });
    });

    it("Given an outdated version When Steam reports not up to date Then returns the required version", async () => {
        server.use(
            http.get(steamUrl, () =>
                HttpResponse.json({ response: { success: true, up_to_date: false, required_version: "11087210" } })
            )
        );
        const { sut } = makeSut();

        const result = await sut.checkUpdate({ appId: 440, currentVersion: "11087207" });

        expect(result).toEqual({ upToDate: false, requiredVersion: "11087210" });
    });

    it("Given string flags When Steam returns string booleans Then parses them like the workflow jq check", async () => {
        server.use(
            http.get(steamUrl, () =>
                HttpResponse.json({ response: { success: true, up_to_date: "false", required_version: "11087210" } })
            )
        );
        const { sut } = makeSut();

        const result = await sut.checkUpdate({ appId: 440, currentVersion: "11087207" });

        expect(result).toEqual({ upToDate: false, requiredVersion: "11087210" });
    });

    it("Given a Steam HTTP error When checking Then throws a descriptive error", async () => {
        server.use(http.get(steamUrl, () => new HttpResponse(null, { status: 500 })));
        const { sut } = makeSut();

        await expect(sut.checkUpdate({ appId: 440, currentVersion: "11087207" })).rejects.toThrow(
            "Steam UpToDateCheck request failed with status 500"
        );
    });

    it("Given an invalid JSON body When checking Then throws a descriptive error", async () => {
        server.use(http.get(steamUrl, () => new HttpResponse("not-json{{{", { status: 200 })));
        const { sut } = makeSut();

        await expect(sut.checkUpdate({ appId: 440, currentVersion: "11087207" })).rejects.toThrow(
            "Steam UpToDateCheck response is not valid JSON"
        );
    });

    it("Given success false When checking Then throws a descriptive error", async () => {
        server.use(
            http.get(steamUrl, () =>
                HttpResponse.json({ response: { success: false, up_to_date: false, required_version: "11087210" } })
            )
        );
        const { sut } = makeSut();

        await expect(sut.checkUpdate({ appId: 440, currentVersion: "11087207" })).rejects.toThrow(
            "Steam UpToDateCheck request was not successful"
        );
    });
});
