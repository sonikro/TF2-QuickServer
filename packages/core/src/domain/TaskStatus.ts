export type TaskStatusValue = "pending" | "running" | "completed" | "failed";

export interface TaskStatus {
    taskId: string;
    type: string;
    status: TaskStatusValue;
    result?: unknown;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}
