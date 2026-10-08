import { Tf2VersionReader } from "@tf2qs/core";

export class GithubTf2VersionReaderProvider implements Tf2VersionReader {
    constructor(private readonly dependencies: { token: string }) {}

    async getCurrentVersion(params: { repository: string }): Promise<string> {
        const { repository } = params;
        const response = await fetch(`https://api.github.com/repos/${repository}/contents/tf2version.txt`, {
            headers: {
                Authorization: `Bearer ${this.dependencies.token}`,
                Accept: "application/vnd.github+json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to read tf2version.txt from ${repository}: GitHub API responded with status ${response.status}`);
        }

        const body = (await response.json()) as { content?: unknown; encoding?: unknown };
        if (typeof body.content !== "string" || body.content.length === 0) {
            throw new Error(`Failed to read tf2version.txt from ${repository}: response content is missing`);
        }

        if (body.encoding !== "base64") {
            throw new Error(`Failed to read tf2version.txt from ${repository}: expected base64-encoded content`);
        }

        return Buffer.from(body.content.replace(/\s/g, ""), "base64").toString("utf8").trim();
    }
}
