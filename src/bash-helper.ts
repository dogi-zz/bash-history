import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {terminal as term} from 'terminal-kit';

const actualCwd = process.cwd();
const actualLine = process.argv[2] || '';

const historyFile = path.resolve(os.homedir(), '.bash_history');
let historyLines = fs.readFileSync(historyFile, 'utf-8').split('\n');
historyLines = historyLines.map((line, i) => historyLines.slice(i + 1, i + 3).some(l => l === line) ? null : line).filter(line => line !== null);
fs.writeFileSync(historyFile, historyLines.join('\n'), 'utf-8');
historyLines.map(line => line.trim()).filter(line => line.length && !line.startsWith('#'));
historyLines.reverse();


const bashHelperFile = path.resolve(os.homedir(), '.bash-helper.state');
let bashHelperState = {
  favorites: [],
  dirCommands: {},
};

const loadFile = () => {
  if (fs.existsSync(bashHelperFile)) {
    try {
      bashHelperState = JSON.parse(fs.readFileSync(bashHelperFile, 'utf-8').split('\n').slice(3).join('\n'));
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(e);
    }
  }
};

const saveFile = (line: string, enter: boolean) => {
  fs.writeFileSync(bashHelperFile, `${line}\n${line.length}\n${enter ? 'ENTER' : 'TAB'}\n${JSON.stringify(bashHelperState, null, 3)}`, 'utf-8');
};

loadFile();
saveFile(actualLine, false);


const searchFlags = {
  ignoreCase: false,
  wordMode: true,
};

const headerString = () => {
  return `Bash-Helper - (F4 fav) (F5 dir) (F6 match-case [${searchFlags.ignoreCase ? ' ' : 'X'}]) (F7 word-mode [${searchFlags.wordMode ? 'X' : ' '}])`;
};


const rows = term.height < 12 ? 6 : 10;

const suggestions: [string, { f: boolean, d: boolean }][] = [];
const suggestionLines: string[] = [];

const extraModules: { getSuggestions: (str: string, cwd: string) => string[] }[] = [];
[process.cwd(), os.homedir()].forEach(dir => {
  if (fs.existsSync(path.resolve(dir, '.bash-helper.js'))) {
    extraModules.push(require(path.resolve(dir, '.bash-helper.js')));
  }
});

const testLine = (str: string, inputString: string) => {
  if (suggestions.length < rows) {
    if (!suggestionLines.includes(inputString)) {
      const [searchString, searchLine] = searchFlags.ignoreCase ? [str.toLowerCase(), inputString.toLowerCase()] : [str, inputString];
      const searchArray = searchFlags.wordMode ? searchString.split(' ').filter(s => s.length) : [searchString];
      if (!searchArray.length || searchArray.every(word => searchLine.indexOf(word) >= 0)) {
        return true;
      }
    }
  }
  return false;
};

const getMarkedText = (str, inputString) => {
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


const addLine = (line: string, flags: { f: boolean, d: boolean }) => {
  suggestions.push([line, flags]);
  suggestionLines.push(line);
};


const calculateSuggestions = (str: string, cwd: string) => {
  suggestions.splice(0);
  suggestionLines.splice(0);

  for (const line of (bashHelperState.dirCommands[actualCwd] || [])) {
    if (testLine(str, line)) {
      addLine(line, {f: bashHelperState.favorites.includes(line), d: true});
    }
    if (suggestions.length === rows) {
      return;
    }
  }

  for (const line of bashHelperState.favorites) {
    if (testLine(str, line)) {
      addLine(line, {f: true, d: (bashHelperState.dirCommands[actualCwd] || []).includes(line)});
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
            addLine(line, {f: false, d: false});
          }
          if (suggestions.length === rows) {
            return;
          }
        })
      } catch (e) {
        // console.error(e);
      }
    }
  }

  for (const line of historyLines) {
    if (testLine(str, line)) {
      addLine(line, {f: false, d: false});
    }
    if (suggestions.length === rows) {
      return;
    }
  }

};

const printHeaderLine = () => {
  term.column(0).defaultColor(headerString().substring(0, term.width));
};

const initScreen = () => {
  printHeaderLine();
  term.down(1).column(0).cyan('> \n');
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
  const markedText = getMarkedText(t, inputString);
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


initScreen();

let inputString = actualLine;
let inputCursorPosition = -1;

const printSuggestionList = () => {
  for (let i = 0; i < rows - 1; i++) {
    term.down(1);
    printSuggestionLine(i + 1, suggestions[i]?.[0] || '', suggestions[i]?.[1], i === inputCursorPosition);
  }
  term.up(rows - 1).column(3 + inputString.length);
};

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

const toggleFav = (favArray: string[], input: string) => {
  const favIndex = favArray.indexOf(input);
  if (input.length && favIndex >= 0) {
    favArray.splice(favIndex, 1);
  } else {
    favArray.push(input);
  }
  saveFile(input, false);
};

term.grabInput();
term.on('key', (name, matches, data) => {
  if (name?.length === 1) {
    inputString += name;
    inputCursorPosition = -1;
    afterInput();
  }

  if (name === 'F4') {
    toggleFav(bashHelperState.favorites, inputString);
    afterFlags();
  }

  if (name === 'F5') {
    bashHelperState.dirCommands[actualCwd] = bashHelperState.dirCommands[actualCwd] || [];
    toggleFav(bashHelperState.dirCommands[actualCwd], inputString);
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


  if (name === 'BACKSPACE' && inputString.length) {
    inputString = inputString.substring(0, inputString.length - 1);
    inputCursorPosition = 0;
    afterInput();
  }
  if (name === 'DOWN' && suggestions.length) {
    inputCursorPosition = Math.min(inputCursorPosition + 1, suggestions.length - 1, rows - 1);
    printSuggestionList();
  }
  if (name === 'UP' && suggestions.length) {
    inputCursorPosition = Math.max(inputCursorPosition - 1, -1);
    printSuggestionList();
  }

  const activateLine = () => {
    const inputLine = inputCursorPosition < 0 ? inputString : suggestions[inputCursorPosition][0];
    const favIndex = bashHelperState.favorites.indexOf(inputLine);
    if (inputLine.length && favIndex >= 0) {
      bashHelperState.favorites.splice(favIndex, 1);
      bashHelperState.favorites.unshift(inputLine);
    }
    return inputLine;
  };

  if (name === 'ENTER') {
    const line = activateLine();
    saveFile(line, true);
    tearDownScreen();
    process.exit(0);
  }
  if (name === 'TAB') {
    const line = activateLine();
    saveFile(line, false);
    tearDownScreen();
    process.exit(0);
  }
  if (name === 'CTRL_C') {
    tearDownScreen();
    process.exit(1);
  }

});

