export type TaskStatusValue = "pending" | "running" | "completed" | "failed";

export interface TaskStatus {
    taskId: string;
    type: string;
    status: TaskStatusValue;
    ownerId?: string;
    result?: unknown;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}
