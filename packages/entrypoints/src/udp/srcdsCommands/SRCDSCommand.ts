import { UDPCommandsServices } from "./UDPCommandServices";

export type SRCDSCommand<TArgs> = {
    type: string;
    raw: string;
    args: TArgs;
    handler: (args: { args: TArgs, password: string, services: UDPCommandsServices }) => Promise<void>;
}

export type SRCDSCommandParser<T> = (rawString: string) => SRCDSCommand<T> | null;
