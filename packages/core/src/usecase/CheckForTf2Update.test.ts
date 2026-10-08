import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ConfigManager } from "../utils/ConfigManager";
import { SteamUpdateChecker } from "../services/SteamUpdateChecker";
import { Tf2VersionReader } from "../services/Tf2VersionReader";
import { WorkflowDispatcher } from "../services/WorkflowDispatcher";
import { CheckForTf2Update } from "./CheckForTf2Update";

describe("CheckForTf2Update", () => {
    function makeSut() {
        const tf2VersionReader = mock<Tf2VersionReader>();
        const steamUpdateChecker = mock<SteamUpdateChecker>();
        const workflowDispatcher = mock<WorkflowDispatcher>();
        const configManager = mock<ConfigManager>();
        const sut = new CheckForTf2Update({ tf2VersionReader, steamUpdateChecker, workflowDispatcher, configManager });

        configManager.getGithubConfig.mockReturnValue({
            repository: "sonikro/TF2-QuickServer",
            workflowFileName: "check-tf2-update.yaml",
            appId: 440,
        });

        return { sut, tf2VersionReader, steamUpdateChecker, workflowDispatcher, configManager };
    }

    it("Given a current version When Steam reports up to date Then returns no update without dispatching", async () => {
        const { sut, tf2VersionReader, steamUpdateChecker, workflowDispatcher } = makeSut();

        when(tf2VersionReader.getCurrentVersion)
            .calledWith({ repository: "sonikro/TF2-QuickServer" })
            .thenResolve("11087207");
        when(steamUpdateChecker.checkUpdate)
            .calledWith({ appId: 440, currentVersion: "11087207" })
            .thenResolve({ upToDate: true, requiredVersion: "11087207" });

        const result = await sut.execute();

        expect(result).toEqual({ updateDetected: false, currentVersion: "11087207", workflowTriggered: false });
        expect(workflowDispatcher.dispatchWorkflow).not.toHaveBeenCalled();
    });

    it("Given an outdated version When Steam reports a required version Then dispatches the workflow with config values", async () => {
        const { sut, tf2VersionReader, steamUpdateChecker, workflowDispatcher } = makeSut();

        when(tf2VersionReader.getCurrentVersion)
            .calledWith({ repository: "sonikro/TF2-QuickServer" })
            .thenResolve("11087207");
        when(steamUpdateChecker.checkUpdate)
            .calledWith({ appId: 440, currentVersion: "11087207" })
            .thenResolve({ upToDate: false, requiredVersion: "11087210" });

        const result = await sut.execute();

        expect(workflowDispatcher.dispatchWorkflow).toHaveBeenCalledWith({
            repository: "sonikro/TF2-QuickServer",
            workflowFileName: "check-tf2-update.yaml",
        });
        expect(result).toEqual({
            updateDetected: true,
            currentVersion: "11087207",
            requiredVersion: "11087210",
            workflowTriggered: true,
        });
    });

    it.each([
        { caseName: "version reader failure", failingMock: "tf2VersionReader" },
        { caseName: "steam checker failure", failingMock: "steamUpdateChecker" },
        { caseName: "dispatcher failure", failingMock: "workflowDispatcher" },
    ])("Given $caseName When execute runs Then it rejects without swallowing the error", async ({ failingMock }) => {
        const { sut, tf2VersionReader, steamUpdateChecker, workflowDispatcher } = makeSut();

        if (failingMock === "tf2VersionReader") {
            tf2VersionReader.getCurrentVersion.mockRejectedValue(new Error("GitHub API unavailable"));
        } else {
            when(tf2VersionReader.getCurrentVersion)
                .calledWith({ repository: "sonikro/TF2-QuickServer" })
                .thenResolve("11087207");
        }

        if (failingMock === "steamUpdateChecker") {
            steamUpdateChecker.checkUpdate.mockRejectedValue(new Error("Steam API unavailable"));
        } else if (failingMock !== "tf2VersionReader") {
            when(steamUpdateChecker.checkUpdate)
                .calledWith({ appId: 440, currentVersion: "11087207" })
                .thenResolve({ upToDate: false, requiredVersion: "11087210" });
        }

        if (failingMock === "workflowDispatcher") {
            workflowDispatcher.dispatchWorkflow.mockRejectedValue(new Error("Dispatch forbidden"));
        }

        await expect(sut.execute()).rejects.toThrow();
    });
});
