import { WorkflowDispatcher } from "@tf2qs/core";

export class GithubWorkflowDispatcherProvider implements WorkflowDispatcher {
    constructor(private readonly dependencies: { token: string }) {}

    async dispatchWorkflow(params: { repository: string; workflowFileName: string }): Promise<void> {
        const { repository, workflowFileName } = params;
        const response = await fetch(
            `https://api.github.com/repos/${repository}/actions/workflows/${workflowFileName}/dispatches`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.dependencies.token}`,
                    Accept: "application/vnd.github+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ref: "main" }),
            }
        );

        if (!response.ok) {
            const excerpt = (await response.text()).slice(0, 500);
            throw new Error(
                `Failed to dispatch workflow ${workflowFileName} in ${repository}: GitHub API responded with status ${response.status} ${excerpt}`
            );
        }
    }
}
