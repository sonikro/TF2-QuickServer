import { ECSClient, ExecuteCommandCommand } from "@aws-sdk/client-ecs";
import pLimit from "p-limit";
import { ssm } from "ssm-session";
import * as util from "util";
import WebSocket from "ws";

/**
 * The `ECSCommandExecutor` class provides functionality to execute commands on ECS containers
 * within a specified task using AWS ECS ExecuteCommand API. It ensures that commands are executed
 * sequentially to comply with the global nature of Session Manager sessions.
 */
export class ECSCommandExecutor {
    private static instance: ECSCommandExecutor | null = null;
    private limit: ReturnType<typeof pLimit>;

    private constructor() {
        this.limit = pLimit(1); // Session Manager sessions are global, so we can't run them in parallel
    }

    /**
     * Singleton factory method to get the single instance of ECSCommandExecutor.
     */
    public static getInstance(): ECSCommandExecutor {
        if (!ECSCommandExecutor.instance) {
            ECSCommandExecutor.instance = new ECSCommandExecutor();
        }
        return ECSCommandExecutor.instance;
    }

    /**
     * Executes a command on a specified ECS container within a task and returns the STDOUT output of that command
     *
     * @example
     * ```ts
     * const ecsCommandExecutor = ECSCommandExecutor.getInstance();
     * const output = await ecsCommandExecutor.runCommand({
     *    ecsClient: new ECSClient({}),
     *    taskArn: "arn:aws:ecs:region:account-id:task/task-id",
     *    cluster: "cluster-name",
     *    containerName: "container-name",
     *    command: "echo Hello World",
     * });
     * console.log(output); // Hello World
     * ```
     */
    public async runCommand(params: {
        ecsClient: ECSClient;
        taskArn: string;
        cluster: string;
        containerName?: string;
        command: string;
    }): Promise<string> {
        return this.limit(() => this.executeCommand(params));
    }

    private async executeCommand(params: {
        ecsClient: ECSClient;
        taskArn: string;
        cluster: string;
        containerName?: string;
        command: string;
    }): Promise<string> {
        const { ecsClient, taskArn, cluster, containerName, command } = params;

        const executeCommandResponse = await ecsClient.send(
            new ExecuteCommandCommand({
                cluster,
                container: containerName,
                command,
                interactive: true,
                task: taskArn,
            })
        );

        const { streamUrl, tokenValue } = executeCommandResponse.session!;

        const textDecoder = new util.TextDecoder();
        const termOptions = {
            rows: 34,
            cols: 197,
        };

        const connection = new WebSocket(streamUrl!);
        const messages: string[] = []; // Array to store all messages

        return await new Promise<string>((resolve, reject) => {
            connection.onopen = () => {
                ssm.init(connection, {
                    token: tokenValue,
                    termOptions: termOptions,
                });
            };

            connection.onerror = (error) => {
                reject(new Error(`WebSocket error: ${error}`));
            };

            connection.onmessage = (event) => {
                const agentMessage = ssm.decode(event.data);
                ssm.sendACK(connection, agentMessage);
                if (agentMessage.payloadType === 1) {
                    const decodedMessage = textDecoder.decode(agentMessage.payload);
                    messages.push(decodedMessage); // Collect the message
                } else if (agentMessage.payloadType === 17) {
                    ssm.sendInitMessage(connection, termOptions);
                }
            };

            connection.onclose = () => {
                resolve(messages.join("")); // Resolve with concatenated messages
            };
        });
    }
}