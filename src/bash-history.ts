import {readFileSync, toggleStringInArray, toPathString, toPrintableString, writeFileSync} from "./tools.ts";
import {InputLine} from "./input-line.ts";
import {bashHistoryFavorites, bashHistoryFile, bashHistoryDirFavorites, fs, getInfo, SearchFlags, term, path, cwd} from "./commons.ts";
import {OptionFlagDefinition, Screen} from "./screen.ts";
import {Suggestions} from "./suggestions.ts";
import {writeAllSync} from "https://deno.land/std/io/write_all.ts";
import {execSync } from "node:child_process";

const info = getInfo(true);

const loadTextLines = (filename: string) => readFileSync(filename).trim().split("\n").map((line) => toPrintableString(line.trim()));
const writeTextLines = (filename: string, lines: string[]) => writeFileSync(filename, lines.join("\n") + "\n");

const uniqLines = (lines: string[]): string[] => {
  const workLines = [...lines];
  workLines.reverse();
  const result: string[] = [];
  const cache: { [item: string]: true } = {};
  workLines.forEach((line) => {
    if (line.length && !cache[line]) {
      cache[line] = true;
      result.push(line);
    }
  });
  result.reverse();
  return result;
};

// BASH LINES
const historyLines = uniqLines(loadTextLines(bashHistoryFile));
writeTextLines(bashHistoryFile, historyLines);

// FAVORITES

let favoriteLines: string[] = [];
if (fs.existsSync(bashHistoryFavorites)) {
  favoriteLines = uniqLines(loadTextLines(bashHistoryFavorites));
}

const toggleFavorite = (line: string) =>{
  info({toggleFavorite: line});
  if (!line.trim().length){
    return;
  }
  toggleStringInArray(favoriteLines, line);
  info("...writeTextLines", bashHistoryFavorites);
  writeTextLines(bashHistoryFavorites, favoriteLines);
}

const dirFavoriteFile = path.resolve(bashHistoryDirFavorites, toPathString(cwd));
let dirFavoriteLines: string[] = [];
if (fs.existsSync(dirFavoriteFile)) {
  dirFavoriteLines = uniqLines(loadTextLines(dirFavoriteFile));
}
info({dirFavoriteFile});

const toggleDirFavorite = (line: string) =>{
  info({toggleDirFavorite: line});
  if (!line.trim().length){
    return;
  }
  toggleStringInArray(dirFavoriteLines, line);
  if (!fs.existsSync(bashHistoryDirFavorites)){
    fs.mkdirSync(bashHistoryDirFavorites, { recursive: true });
  }
  info("...writeTextLines", bashHistoryFavorites);
  writeTextLines(dirFavoriteFile, dirFavoriteLines);
}


const searchFlags: SearchFlags = {
  matchCase: false,
  wordMode: true,
};
const searchFlagDefinition: OptionFlagDefinition[] = [
  { name: "match-case", key: "F6", property: "matchCase" },
  { name: "word-mode", key: "F7", property: "wordMode" },
];

const inputLine = new InputLine(Deno.args[0] || "");
inputLine.info();

const rows = term.height - 3;

const suggestions = new Suggestions(inputLine, searchFlags, rows, historyLines, favoriteLines, dirFavoriteLines);

// ========================================================
// ========================================================


const screen = new Screen(inputLine, suggestions, searchFlagDefinition, searchFlags, rows);
screen.startSession((key) => {
  if (key === "BACKSPACE") {
    inputLine.backspace();
    inputLine.info();
  }
  if (key === "DELETE") {
    inputLine.delete();
    inputLine.info();
  }
  if (key === "LEFT") {
    inputLine.moveCursor(-1);
  }
  if (key === "RIGHT") {
    inputLine.moveCursor(1);
  }
  if (key === "UP") {
    screen.moveCursor(-1);
  }
  if (key === "DOWN") {
    screen.moveCursor(1);
  }
  if (key === "ENTER") {
    screen.stop();
     writeAllSync(Deno.stderr, new TextEncoder().encode(inputLine.inputString));
    // execSync(`READLINE_LINE="${inputLine.inputString}"`, { stdio: 'inherit', shell: '/bin/bash' });
    // // ; READLINE_POINT=${inputLine.inputString.length}'
  }

  if (key === "F4") {
    toggleFavorite(inputLine.inputString);
    suggestions.reflagSuggestions();
    screen.updateSuggestions();
  }
  if (key === "F5") {
    toggleDirFavorite(inputLine.inputString)
    suggestions.reflagSuggestions();
    screen.updateSuggestions();
  }


  const optionFlag = searchFlagDefinition.find((o) => o.key === key);
  if (optionFlag) {
    (searchFlags as any)[optionFlag.property] = !(searchFlags as any)[optionFlag.property];
    screen.printHeader();
    screen.setCursor();
    suggestions.update();
  }
  if (key.length === 1) {
    inputLine.inputChar(key);
  }
});

//     if (name === 'TAB' && selectionCursorPosition >= 0) {
//         inputString = suggestionLines[selectionCursorPosition];
//         inputCursorPosition = inputString.length;
//         selectionCursorPosition = -1;
//         afterType();
//     }
//     if (name === 'ENTER') {
//         const line = activateLine();
//         saveState(line, 'ENTER');
//         tearDownScreen();
//         term.grabInput(false).then(()=>{
//             term.processExit(0);
//         });
//     }
//
