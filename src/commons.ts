import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";
import terminal from "npm:terminal-kit@2.5.1";
import {initOutputCommands} from "./tools.ts";

const term = terminal.terminal;
const ScreenBuffer = terminal.ScreenBuffer;

const DEV = Deno.env.get("BASH_HISTORY_DEV") === "true";

export const bashHistoryFile = path.resolve(os.homedir(), ".bash_history");
export const bashHistoryExtDir = DEV ? path.resolve(".bash_history.ext") : path.resolve(os.homedir(), ".bash_history.ext");

if (!fs.existsSync(bashHistoryExtDir)) {
  fs.mkdirSync(bashHistoryExtDir);
}

export const bashHistoryFavorites = path.resolve(bashHistoryExtDir, "favorites.txt");
export const bashHistoryDirFavorites = path.resolve(bashHistoryExtDir, "dir");

const debugOutFileName = DEV ? "./bash-history.log" : null;

const { getInfo } = initOutputCommands(debugOutFileName);

const cwd = DEV ? path.resolve("dev-environment") : Deno.cwd();

getInfo(true)("================================ START ===================================");
getInfo(true)({ ARGS: Deno.args, bashHistoryFile, bashHistoryFavorites, bashHistoryDirFavorites, bashHistoryExtDir, cwd });

export type SearchFlags = { matchCase: boolean; wordMode: boolean };

export { cwd, fs, getInfo, os, path, term, ScreenBuffer };
