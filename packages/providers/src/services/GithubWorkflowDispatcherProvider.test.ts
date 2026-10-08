import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { GithubWorkflowDispatcherProvider } from "./GithubWorkflowDispatcherProvider";

describe("GithubWorkflowDispatcherProvider", () => {
    const server = setupServer();
    const dispatchUrl =
        "https://api.github.com/repos/sonikro/TF2-QuickServer/actions/workflows/check-tf2-update.yaml/dispatches";

    function makeSut() {
        return { sut: new GithubWorkflowDispatcherProvider({ token: "test-token" }) };
    }

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("Given valid credentials When dispatching Then resolves without error", async () => {
        server.use(http.post(dispatchUrl, () => new HttpResponse(null, { status: 204 })));
        const { sut } = makeSut();

        await expect(
            sut.dispatchWorkflow({ repository: "sonikro/TF2-QuickServer", workflowFileName: "check-tf2-update.yaml" })
        ).resolves.toBeUndefined();
    });

    it("Given insufficient permissions When dispatching Then throws with status and body excerpt", async () => {
        server.use(http.post(dispatchUrl, () => new HttpResponse("Bad credentials", { status: 403 })));
        const { sut } = makeSut();

        await expect(
            sut.dispatchWorkflow({ repository: "sonikro/TF2-QuickServer", workflowFileName: "check-tf2-update.yaml" })
        ).rejects.toThrow("GitHub API responded with status 403");
    });

    it("Given a dispatch When called Then sends ref main in the request body", async () => {
        const capturedBodies: unknown[] = [];
        server.use(
            http.post(dispatchUrl, async ({ request }) => {
                capturedBodies.push(await request.json());
                return new HttpResponse(null, { status: 204 });
            })
        );
        const { sut } = makeSut();

        await sut.dispatchWorkflow({
            repository: "sonikro/TF2-QuickServer",
            workflowFileName: "check-tf2-update.yaml",
        });

        expect(capturedBodies).toEqual([{ ref: "main" }]);
    });

    it("Given a dispatch When called Then sends the Bearer token", async () => {
        const capturedAuthorization: string[] = [];
        server.use(
            http.post(dispatchUrl, ({ request }) => {
                capturedAuthorization.push(request.headers.get("authorization") ?? "");
                return new HttpResponse(null, { status: 204 });
            })
        );
        const { sut } = makeSut();

        await sut.dispatchWorkflow({
            repository: "sonikro/TF2-QuickServer",
            workflowFileName: "check-tf2-update.yaml",
        });

        expect(capturedAuthorization).toEqual(["Bearer test-token"]);
    });
});
