import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { GithubTf2VersionReaderProvider } from "./GithubTf2VersionReaderProvider";

describe("GithubTf2VersionReaderProvider", () => {
    const server = setupServer();

    function makeSut() {
        return { sut: new GithubTf2VersionReaderProvider({ token: "test-token" }) };
    }

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("Given a stored version When reading Then returns the decoded trimmed version", async () => {
        const encoded = Buffer.from("11087207\n", "utf8").toString("base64");
        server.use(
            http.get("https://api.github.com/repos/sonikro/TF2-QuickServer/contents/tf2version.txt", () =>
                HttpResponse.json({ content: `${encoded.substring(0, 8)}\n${encoded.substring(8)}`, encoding: "base64" })
            )
        );
        const { sut } = makeSut();

        const result = await sut.getCurrentVersion({ repository: "sonikro/TF2-QuickServer" });

        expect(result).toBe("11087207");
    });

    it("Given a non-base64 encoding When reading Then throws a descriptive error", async () => {
        server.use(
            http.get("https://api.github.com/repos/sonikro/TF2-QuickServer/contents/tf2version.txt", () =>
                HttpResponse.json({ content: "11087207", encoding: "none" })
            )
        );
        const { sut } = makeSut();

        await expect(sut.getCurrentVersion({ repository: "sonikro/TF2-QuickServer" })).rejects.toThrow(
            "expected base64-encoded content"
        );
    });

    it("Given a missing file When reading Then throws a descriptive error", async () => {
        server.use(
            http.get("https://api.github.com/repos/sonikro/TF2-QuickServer/contents/tf2version.txt", () =>
                new HttpResponse(null, { status: 404 })
            )
        );
        const { sut } = makeSut();

        await expect(sut.getCurrentVersion({ repository: "sonikro/TF2-QuickServer" })).rejects.toThrow(
            "GitHub API responded with status 404"
        );
    });
});
