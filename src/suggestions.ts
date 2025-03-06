import {getInfo, SearchFlags} from "./commons.ts";
import {Subject} from "npm:rxjs@7.8.1";
import {InputLine} from "./input-line.ts";

const info = getInfo(true);

export type MarketText = { t: string; m: boolean };
export type Suggestion = { printLine: MarketText[]; trimLine: string; f: boolean; d: boolean };

export class Suggestions {
  private foundSuggestions: Suggestion[] = [];
  private suggestionLines: string[] = [];

  public suggestionLinesSubject = new Subject<Suggestion[]>();

  private calculateTimeout: any;

  public constructor(
    private inputLine: InputLine,
    private searchFlags: SearchFlags,
    private maxRows: number,
    public bashHistoryLines: string[],
    public favoriteLines: string[],
    public dirFavoriteLines: string[],
  ) {
    inputLine.inputSubject.subscribe((inputLine) => {
      clearTimeout(this.calculateTimeout);
      this.calculateTimeout = setTimeout(() => this.calculateSuggestions(inputLine), 10);
    });
  }

  public update() {
    clearTimeout(this.calculateTimeout);
    this.calculateTimeout = setTimeout(() => this.calculateSuggestions(this.inputLine.inputString), 10);
  }

  public testLine(str: string, lineToTest: string): boolean {
    if (this.foundSuggestions.length > this.maxRows) return false;
    if (this.suggestionLines.includes(lineToTest)) return false;
    const [searchString, searchLine] = !this.searchFlags.matchCase ? [str.toLowerCase(), lineToTest.toLowerCase()] : [str, lineToTest];
    const searchArray = this.searchFlags.wordMode ? searchString.split(" ").filter((s) => s.length) : [searchString];
    if (!searchArray.length || searchArray.every((word) => searchLine.indexOf(word) >= 0)) {
      return true;
    }
    return false;
  }

  public getMarkedText(line: string, inputString: string): MarketText[] {
    const [searchString, searchLine] = !this.searchFlags.matchCase ? [line.toLowerCase(), inputString.toLowerCase()] : [line, inputString];
    const searchArray = this.searchFlags.wordMode ? searchLine.split(" ").filter((s) => s.length) : [searchLine];
    const result: MarketText[] = [];
    let restLine = searchString;
    while (restLine.length) {
      let foundWord: string | null = null;
      let foundWordIndex = 0;
      for (const word of searchArray) {
        if (!word.length) {
          continue;
        }
        const idx = restLine.lastIndexOf(word);
        if (idx >= 0 && idx > foundWordIndex) {
          foundWordIndex = idx;
          foundWord = word;
        }
      }
      if (foundWord) {
        const restIndex = foundWordIndex + foundWord.length;
        const restText = restLine.substring(foundWordIndex + foundWord.length);
        if (restText.length) {
          result.unshift({ t: line.substring(restIndex, restIndex + restText.length), m: false });
        }
        result.unshift({ t: line.substring(foundWordIndex, foundWordIndex + foundWord.length), m: true });
      } else {
        result.unshift({ t: line.substring(0, restLine.length), m: false });
        break;
      }
      restLine = restLine.substring(0, foundWordIndex);
    }
    return result;
  }

  public addLineToSuggestions(line: string, inputLine: string, flags: { f: boolean; d: boolean }) {
    const trimLine = (line || "").trim();
    if (trimLine.length && !this.suggestionLines.includes(trimLine)) {
      this.foundSuggestions.push({ printLine: this.getMarkedText(line, inputLine), trimLine, ...flags });
      this.suggestionLines.push(trimLine);
    }
  }

  public calculateSuggestions(inputLine: string) {
    this.foundSuggestions = [];
    this.suggestionLines = [];
    info(this.searchFlags);
    //     for (const line of (bashHelperState.dirCommands[actualCwd] || [])) {
    //         if (testLine(str, line)) {
    //             addLineToSuggestions(line, {f: bashHelperState.favorites.includes(line), d: true});
    //         }
    //         if (suggestions.length === rows) {
    //             return;
    //         }
    //     }
    //
    //     for (const line of bashHelperState.favorites) {
    //         if (testLine(str, line)) {
    //             addLineToSuggestions(line, {f: true, d: (bashHelperState.dirCommands[actualCwd] || []).includes(line)});
    //         }
    //         if (suggestions.length === rows) {
    //             return;
    //         }
    //     }
    //
    //     for (const module of extraModules) {
    //         if (module.getSuggestions) {
    //             try {
    //                 const suggestions = module.getSuggestions(str, cwd);
    //                 suggestions.forEach(line => {
    //                     if (testLine(str, line)) {
    //                         addLineToSuggestions(line, {f: false, d: false});
    //                     }
    //                     if (suggestions.length === rows) {
    //                         return;
    //                     }
    //                 });
    //             } catch (e) {
    //                 // console.error(e);
    //             }
    //         }
    //     }
    //
    const allLines = [
      ...this.dirFavoriteLines,
      ...this.favoriteLines,
      ...this.bashHistoryLines,
    ];
    for (const line of allLines) {
      if (this.testLine(inputLine, line)) {
        this.addLineToSuggestions(line, inputLine, {
          f: this.favoriteLines.includes(line.trim()),
          d: this.dirFavoriteLines.includes(line.trim()),
        });
      }
      if (this.foundSuggestions.length === this.maxRows) {
        break;
      }
    }
    this.suggestionLinesSubject.next(this.foundSuggestions);
  }

  public reflagSuggestions(){
    this.foundSuggestions.forEach(suggestion => {
      suggestion.f = this.favoriteLines.includes(suggestion.trimLine);
      suggestion.d = this.dirFavoriteLines.includes(suggestion.trimLine);
    })
  }
}
