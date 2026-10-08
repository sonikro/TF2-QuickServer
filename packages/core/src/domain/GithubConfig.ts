import config from "config";

export type GithubConfig = {
    repository: string;
    workflowFileName: string;
    appId: number;
}

export const getGithubConfig = () => {
    return config.get<GithubConfig>("github");
}
