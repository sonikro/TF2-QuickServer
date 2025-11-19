/**
 * Immutable value object containing task definition configuration
 */
export class TaskDefinitionConfig {
    public readonly family: string;
    public readonly cpu: string;
    public readonly memory: string;
    public readonly networkMode: string;
    public readonly requiresCompatibilities: string[];
    public readonly executionRoleArn: string;
    public readonly taskRoleArn: string;

    constructor(data: {
        family: string;
        cpu: string;
        memory: string;
        networkMode: string;
        requiresCompatibilities: string[];
        executionRoleArn: string;
        taskRoleArn: string;
    }) {
        this.family = data.family;
        this.cpu = data.cpu;
        this.memory = data.memory;
        this.networkMode = data.networkMode;
        this.requiresCompatibilities = data.requiresCompatibilities;
        this.executionRoleArn = data.executionRoleArn;
        this.taskRoleArn = data.taskRoleArn;
    }
}
