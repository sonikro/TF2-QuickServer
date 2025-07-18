import { say } from "./Say";
import { SRCDSCommand, SRCDSCommandParser } from "./SRCDSCommand";
import { userEnteredGame } from "./UserEnteredGame";

export const commands: SRCDSCommandParser<any>[] = [
    userEnteredGame,
    say,
]

export function parseSRCDSCommand(rawString: string): SRCDSCommand<any> | null {
    for (const cmd of commands) {
        const result = cmd(rawString);
        if (result) {
            return result
        }
    }
    return null;
}