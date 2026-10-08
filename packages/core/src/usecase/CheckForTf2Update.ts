import { ConfigManager } from "../utils/ConfigManager";
import { SteamUpdateChecker } from "../services/SteamUpdateChecker";
import { Tf2VersionReader } from "../services/Tf2VersionReader";
import { WorkflowDispatcher } from "../services/WorkflowDispatcher";

export type CheckForTf2UpdateResult = {
    updateDetected: boolean;
    currentVersion: string;
    requiredVersion?: string;
    workflowTriggered: boolean;
};

type CheckForTf2UpdateDependencies = {
    tf2VersionReader: Tf2VersionReader;
    steamUpdateChecker: SteamUpdateChecker;
    workflowDispatcher: WorkflowDispatcher;
    configManager: ConfigManager;
};

export class CheckForTf2Update {
    constructor(private readonly dependencies: CheckForTf2UpdateDependencies) {}

    async execute(): Promise<CheckForTf2UpdateResult> {
        const { tf2VersionReader, steamUpdateChecker, workflowDispatcher, configManager } = this.dependencies;
        const { repository, workflowFileName, appId } = configManager.getGithubConfig();

        const currentVersion = await tf2VersionReader.getCurrentVersion({ repository });
        const { upToDate, requiredVersion } = await steamUpdateChecker.checkUpdate({ appId, currentVersion });

        if (upToDate) {
            return { updateDetected: false, currentVersion, workflowTriggered: false };
        }

        await workflowDispatcher.dispatchWorkflow({ repository, workflowFileName });

        return { updateDetected: true, currentVersion, requiredVersion, workflowTriggered: true };
    }
}
