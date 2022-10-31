import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {terminal as term} from 'terminal-kit';

const actualCwd = process.cwd();
const actualLine = process.argv[2] || '';

const localHistoryFile = path.resolve(os.homedir(), '.bash_history');
const localHistoryFileCleanupLookBack = 3;

const rows = term.height < 12 ? 6 : 10;


const bashHistorySateFile = path.resolve(os.homedir(), '.bash-history.state');
const customModuleFileName = '.bash-history.js';
const debugOutFileName = 'bash-history.log';


// ---- init debug output in file
const DEBUG = process.env.BASH_HISTORY_DEBUG === 'true';
const info = (...message: any[]) => {
  if (DEBUG) {
    fs.appendFileSync(debugOutFileName, JSON.stringify(message) + '\n', 'utf-8');
  }
};


// ---- load and cleanup users history
let historyLines = fs.readFileSync(localHistoryFile, 'utf-8').split('\n');
historyLines = historyLines.map((line, i) => historyLines.slice(i + 1, i + 1 + localHistoryFileCleanupLookBack).some(l => l.trim() === line.trim()) ? null : line).filter(line => line !== null);
fs.writeFileSync(localHistoryFile, historyLines.join('\n'), 'utf-8');
historyLines.map(line => line.trim()).filter(line => line.length && !line.startsWith('#'));
historyLines.reverse();

// ---- load and save state
let bashHelperState = {
  favorites: [],
  dirCommands: {},
};
info('load state:', bashHelperState);

const loadState = () => {
  if (fs.existsSync(bashHistorySateFile)) {
    try {
      const bashHistorySateFileLines = fs.readFileSync(bashHistorySateFile, 'utf-8').split('\n');
      while (bashHistorySateFileLines[0] !== '{') {
        bashHistorySateFileLines.shift();
      }
      bashHelperState = JSON.parse(bashHistorySateFileLines.join('\n'));
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }
};

const saveState = (line: string, exitCode) => {
  const extraInfo = [line, line.length, exitCode];
  fs.writeFileSync(bashHistorySateFile, `${extraInfo.join('\n')}\n${JSON.stringify(bashHelperState, null, 3)}`, 'utf-8');
};

loadState();
saveState(actualLine, 'NOP');


// ---- init input method

let inputString = actualLine;
let inputCursorPosition = inputString.length;
let selectionCursorPosition = -1;

const searchFlags = {
  ignoreCase: false,
  wordMode: true,
};

const headerString = () => {
  return `bash-history - (F4 fav) (F5 dir) (F6 match-case [${searchFlags.ignoreCase ? ' ' : 'X'}]) (F7 word-mode [${searchFlags.wordMode ? 'X' : ' '}])`;
};

// ---- suggestion handling

const suggestions: [string, { f: boolean, d: boolean }][] = [];
const suggestionLines: string[] = [];

const extraModules: { getSuggestions: (str: string, cwd: string) => string[] }[] = [];
[process.cwd(), os.homedir()].forEach(dir => {
  if (fs.existsSync(path.resolve(dir, customModuleFileName))) {
    extraModules.push(require(path.resolve(dir, customModuleFileName)));
  }
});

const testLine = (str: string, lineToTest: string) => {
  if (suggestions.length < rows) {
    if (!suggestionLines.includes(lineToTest)) {
      const [searchString, searchLine] = searchFlags.ignoreCase ? [str.toLowerCase(), lineToTest.toLowerCase()] : [str, lineToTest];
      const searchArray = searchFlags.wordMode ? searchString.split(' ').filter(s => s.length) : [searchString];
      if (!searchArray.length || searchArray.every(word => searchLine.indexOf(word) >= 0)) {
        return true;
      }
    }
  }
  return false;
};

const getMarkedText = (str) => {
  const [searchString, searchLine] = searchFlags.ignoreCase ? [str.toLowerCase(), inputString.toLowerCase()] : [str, inputString];
  const searchArray = searchFlags.wordMode ? searchLine.split(' ').filter(s => s.length) : [searchLine];
  const result = [];
  let markPos = 0;
  while (markPos < str.length) {
    let [w, i] = [null, str.length];
    searchArray.forEach(word => {
      const idx = searchString.indexOf(word, markPos);
      if (idx >= 0 && idx < i) {
        i = idx;
        w = word;
      }
    });
    if (w && w.length) {
      if (i > markPos) {
        result.push([str.substring(markPos, i), false]);
      }
      result.push([str.substring(i, i + w.length), true]);
      markPos = i + w.length;
    } else {
      result.push([str.substring(markPos), false]);
      markPos = str.length;
    }
  }
  return result;
};


const addLineToSuggestions = (line: string, flags: { f: boolean, d: boolean }) => {
  const trimLine = (line || '').trim();
  if (trimLine.length && !suggestionLines.includes(trimLine)) {
    suggestions.push([trimLine, flags]);
    suggestionLines.push(trimLine);
  }
};


const calculateSuggestions = (str: string, cwd: string) => {
  suggestions.splice(0);
  suggestionLines.splice(0);

  for (const line of (bashHelperState.dirCommands[actualCwd] || [])) {
    if (testLine(str, line)) {
      addLineToSuggestions(line, {f: bashHelperState.favorites.includes(line), d: true});
    }
    if (suggestions.length === rows) {
      return;
    }
  }

  for (const line of bashHelperState.favorites) {
    if (testLine(str, line)) {
      addLineToSuggestions(line, {f: true, d: (bashHelperState.dirCommands[actualCwd] || []).includes(line)});
    }
    if (suggestions.length === rows) {
      return;
    }
  }

  for (const module of extraModules) {
    if (module.getSuggestions) {
      try {
        const suggestions = module.getSuggestions(str, cwd);
        suggestions.forEach(line => {
          if (testLine(str, line)) {
            addLineToSuggestions(line, {f: false, d: false});
          }
          if (suggestions.length === rows) {
            return;
          }
        });
      } catch (e) {
        // console.error(e);
      }
    }
  }

  for (const line of historyLines) {
    if (testLine(str, line)) {
      addLineToSuggestions(line, {f: false, d: false});
    }
    if (suggestions.length === rows) {
      return;
    }
  }

};

// ---- Print and Update screen

const printHeaderLine = () => {
  term.column(0).defaultColor(headerString().substring(0, term.width));
};

const initScreen = () => {
  console.info(headerString().substring(0, term.width));
  term.column(0).cyan('> \n');
  for (let i = 1; i < rows; i++) {
    term.cyan('. \n');
  }
  term.up(rows).column(2);
};

const tearDownScreen = () => {
  term.down(rows).column(0);
  for (let i = 0; i < rows; i++) {
    term.up(1).column(0).eraseLineAfter();
  }
  term.up(1).column(0).eraseLineAfter();
};

const padRight = (text: string, len: number) => {
  let padText = text;
  while (padText.length < len) {
    padText = `${padText} `;
  }
  return (padText.length > len) ? [padText.substring((padText.length - len) + 3), '...'] : [padText, ''];
};


const printInputLine = (text: string) => {
  const [t, o] = padRight(text, term.width - 3);
  term.column(3).gray(o).brightWhite().underline(t);
};


const printSuggestionLine = (num: number, text: string, sFlags: { f: boolean, d: boolean }, actualEntry: boolean) => {
  if (sFlags?.d || sFlags?.f) {
    term.bold();
  }
  if (actualEntry) {
    term.bgGray();
  }
  const flags = sFlags ? ['[', sFlags.f ? 'F' : ' ', sFlags.d ? 'D' : ' ', ']'].join('') : '    ';

  term.column(1).cyan(text.length ? `${num}` : '.');

  const [t, o] = padRight(text, term.width - 3 - flags.length);
  const markedText = getMarkedText(t);
  term.column(3).gray(o);
  markedText.forEach(([s, m]) => {
    if (m) {
      term.cyan(s);
    } else {
      term.brightWhite(s);
    }
  });
  term.column(term.width - flags.length).white(flags);

  term.styleReset();
  term.bgDefaultColor();
};

const printSuggestionList = () => {
  for (let i = 0; i < rows - 1; i++) {
    term.down(1);
    printSuggestionLine(i + 1, suggestions[i]?.[0] || '', suggestions[i]?.[1], i === selectionCursorPosition);
  }
  term.up(rows - 1).column(3 + inputCursorPosition);
};

initScreen();

// --- actions

const toggleFav = (favArray: string[]) => {
  const input = selectionCursorPosition < 0 ? inputString.trim() : suggestionLines[selectionCursorPosition];
  const inputSuggestionLine = selectionCursorPosition >= 0 ? suggestionLines[selectionCursorPosition] : null;
  info('toggleFav', input);
  if (!input.length){
    return;
  }
  const favIndex = favArray.indexOf(input);
  if (input.length && favIndex >= 0) {
    favArray.splice(favIndex, 1);
  } else if (!favArray.includes(input)) {
    favArray.push(input);
  }
  saveState(input, 'NOP');

  calculateSuggestions(inputString, actualCwd);
  printInputLine(inputString);
  if (inputSuggestionLine) {
    selectionCursorPosition = Math.min(suggestionLines.indexOf(inputSuggestionLine), rows - 1);
  }
  printSuggestionList();
};


// --- input handling

const afterInput = () => {
  printInputLine(inputString);
  calculateSuggestions(inputString, actualCwd);
  printSuggestionList();
};
afterInput();

const afterFlags = () => {
  term.up(1);
  printHeaderLine();
  term.down(1);
  afterInput();
};

const afterType = () => {
  selectionCursorPosition = -1;
  afterInput();
};

term.grabInput(true);
term.on('key', (name, matches, data) => {
  if (name.length > 1) {
    info('Key', name);
  }

  if (name?.length === 1) {
    const parts = [inputString.substring(0, inputCursorPosition), inputString.substring(inputCursorPosition)];
    inputString = `${parts[0]}${name}${parts[1]}`;
    inputCursorPosition++;
    afterType();
  }
  if (name === 'BACKSPACE' && inputString.length) {
    const parts = [inputString.substring(0, inputCursorPosition), inputString.substring(inputCursorPosition)];
    if (parts[0].length) {
      inputString = `${parts[0].substring(0, parts[0].length - 1)}${parts[1]}`;
    }
    inputCursorPosition -= 1;
    afterType();
  }
  if (name === 'DELETE' && inputString.length) {
    const parts = [inputString.substring(0, inputCursorPosition), inputString.substring(inputCursorPosition)];
    if (parts[1].length) {
      inputString = `${parts[0]}${parts[1].substring(1)}`;
    }
    afterType();
  }

  if (name === 'DOWN' && suggestions.length) {
    selectionCursorPosition = Math.min(selectionCursorPosition + 1, suggestions.length - 1, rows - 1);
    printSuggestionList();
  }
  if (name === 'UP' && suggestions.length) {
    selectionCursorPosition = Math.max(selectionCursorPosition - 1, -1);
    printSuggestionList();
  }
  if (name === 'LEFT') {
    inputCursorPosition = Math.max(0, inputCursorPosition - 1);
    afterType();
  }
  if (name === 'RIGHT') {
    inputCursorPosition = Math.min(inputString.length, inputCursorPosition + 1);
    afterType();
  }


  if (name === 'F4') {
    toggleFav(bashHelperState.favorites);
    afterFlags();
  }

  if (name === 'F5') {
    bashHelperState.dirCommands[actualCwd] = bashHelperState.dirCommands[actualCwd] || [];
    toggleFav(bashHelperState.dirCommands[actualCwd]);
    afterFlags();
  }

  if (name === 'F6') {
    searchFlags.ignoreCase = !searchFlags.ignoreCase;
    afterFlags();
  }
  if (name === 'F7') {
    searchFlags.wordMode = !searchFlags.wordMode;
    afterFlags();
  }

  if (name === 'TAB' && selectionCursorPosition >= 0) {
    inputString = suggestionLines[selectionCursorPosition];
    inputCursorPosition = inputString.length;
    selectionCursorPosition = -1;
    afterType();
  }


  const activateLine = () => {
    const inputLine = selectionCursorPosition < 0 ? inputString : suggestions[selectionCursorPosition][0];
    const favIndex = bashHelperState.favorites.indexOf(inputLine);
    if (inputLine.length && favIndex >= 0) {
      bashHelperState.favorites.splice(favIndex, 1);
      bashHelperState.favorites.unshift(inputLine);
    }
    return inputLine;
  };

  if (name === 'ENTER') {
    const line = activateLine();
    saveState(line, 'ENTER');
    tearDownScreen();
    term.grabInput(false).then(()=>{
      term.processExit(0);
    });
  }

  if (name === 'CTRL_C') {
    tearDownScreen();
    term.grabInput(false).then(()=>{
      term.processExit(1);
    });
  }

});

