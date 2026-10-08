export interface WorkflowDispatcher {
    dispatchWorkflow(params: {
        repository: string;
        workflowFileName: string;
    }): Promise<void>;
}
