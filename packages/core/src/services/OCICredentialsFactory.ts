import { Region } from "../domain";

export type OCICredentials = {
    configFileContent: string;
    privateKeyFileContent: string;
}
export type OCICredentialsFactory = (region: Region) => OCICredentials 