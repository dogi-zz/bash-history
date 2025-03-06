import {getInfo, term} from "./commons.ts";
import {InputLine} from "./input-line.ts";
import {Suggestion, Suggestions} from "./suggestions.ts";

const info = getInfo(true);

const padText = (len: number, char: string) => {
  let result = "";
  while (result.length < len) {
    result += char?.length ? char : " ";
  }
  return result;
};

export type OptionFlagDefinition = { name: string; property: string; key: string };

export class Screen {
  private printedRows: number = 0;
  private printedColumns: number = 0;

  private suggestionSize: number = 0;

  private actualSuggestions: Suggestion[] = [];
  private cursorPostion: number = -1;

  public constructor(
    private inputLine: InputLine,
    private suggestions: Suggestions,
    private optionFlagDefinition: OptionFlagDefinition[],
    private optionFlags: { [name: string]: boolean },
    private maxRows: number,
  ) {
  }

  public startSession(onKey: (name: string) => void) {
    info("Screen.startSession");
    this.initScreen();
    term.grabInput(true);
    term.on("key", (name: string, matches: string[], data: { isCharacter: boolean; codepoint?: number; code: number }) => {
      if (name.length > 1) {
        info("Key", name);
      }
      if (name === "CTRL_C") {
        this.stop();
        return;
      }
      onKey(name);
    });
    this.inputLine.inputSubject.subscribe((inputLine) => {
      this.printInputLine(inputLine);
    });
    this.suggestions.suggestionLinesSubject.subscribe((suggestions) => {
      this.cursorPostion = -1;
      this.actualSuggestions = suggestions;
      this.printSuggestions(suggestions);
    });
  }

  public moveCursor(amount: number) {
    this.cursorPostion += amount;
    this.cursorPostion = Math.min(this.cursorPostion, this.suggestionSize - 1);
    this.cursorPostion = Math.max(this.cursorPostion, -1);
    this.printSuggestions(this.actualSuggestions);
    if (this.cursorPostion >= 0) {
      this.inputLine.setString(this.actualSuggestions[this.cursorPostion].trimLine);
      this.printInputLine(this.inputLine.inputString);
    }
  }

  public updateSuggestions() {
    this.printSuggestions(this.actualSuggestions);
  }

  public stop() {
    this.tearDownScreen();
    term.grabInput(false).then(() => {
      term.processExit(1);
    });
  }

  public initScreen() {
    this.printedRows = Math.min(term.height, this.maxRows);
    this.suggestionSize = this.printedRows - 2;
    this.printedColumns = term.width;
    info("initScreen", { printedRows: this.printedRows, printedColumns: this.printedColumns });

    info(term.saveCursor());
    info(term.fullscreen(true));
    // this.screenBuffer.fill({ char: ' ' }); // Leerer Bildschirm als Platzhalter
    // this.screenBuffer.put({ x: 0, y: 0 }, 'Original Terminal-Inhalt');
    // this.screenBuffer.draw();

    info(term.clear());
    //term.saveCursor();
    this.printHeader();
    term.down(1).column(0).cyan("> ").eraseLineAfter();
    for (let i = 0; i < this.suggestionSize; i++) {
      term.down(1).column(0).white(".").eraseLineAfter();
    }
    this.setCursor();
  }

  public tearDownScreen() {
    term.fullscreen(false);
    term.restoreCursor();
  }

  private printPart(len: number, text: string, printColor: (text: string) => any, flags?: { bold?: boolean }): number {
    term.bold(flags?.bold || false);
    // info("len", len, text.length, text.substring(0,len).length)
    printColor(text.substring(0, len));
    return Math.max(len - text.length, 0);
  }

  public printHeader() {
    term.moveTo(1, 1);
    let len = this.printedColumns;
    len = this.printPart(len, "bash-history", term.white, { bold: true });
    len = this.printPart(len, " - ", term.white);
    len = this.printPart(len, " [F4] fav", term.white);
    len = this.printPart(len, " [F5] dir", term.white);
    info(this.optionFlags);
    this.optionFlagDefinition.forEach((optionFlag) => {
      info(optionFlag.property, this.optionFlags[optionFlag.property]);
      len = this.printPart(len, ` [${optionFlag.key}] ${optionFlag.name}`, term.white, { bold: this.optionFlags[optionFlag.property] });
    });
    term.styleReset();
  }

  public setCursor() {
    term.moveTo(this.inputLine.inputCursorPosition + 3, 2);
  }

  public printInputLine(text: string) {
    term.moveTo(3, 2);
    const [t, o] = Screen.padRight(text, term.width - 3);
    term.gray(o).brightWhite().underline(t);
    this.setCursor();
  }

  public printSuggestions(suggestions: Suggestion[]) {
    term.moveTo(1, 2);
    for (let i = 0; i < this.suggestionSize - 5; i++) {
      term.moveTo(1, i + 3);
      const suggestion = suggestions[i];
      if (suggestion) {
        const isFavorite = !!(suggestion.d || suggestion.f);
        const flags = [" [", suggestion.f ? "F" : " ", suggestion.d ? "D" : " ", "]"].join("");
        const prefix = "- ";
        let len = this.printedColumns - prefix.length - flags.length;
        let baseColor = isFavorite ? term.white : term.gray;
        let markColor = isFavorite ? term.brightCyan : term.cyan;
        if (this.cursorPostion === i) {
          term.bgWhite();
          baseColor = isFavorite ? term.black : term.gray;
          markColor = term.cyan;
        }
        this.printPart(prefix.length, prefix, term.cyan, { bold: false });
        suggestion.printLine.forEach((textItem) => {
          if (textItem.m) {
            len = this.printPart(len, textItem.t, markColor, { bold: suggestion.d });
          } else {
            len = this.printPart(len, textItem.t, baseColor, { bold: suggestion.d });
          }
        });
        len = this.printPart(len, padText(len, " "), term.white);
        term.bgDefaultColor();
        this.printPart(flags.length, flags, isFavorite ? term.white : term.gray);
      } else {
        term.gray(".").eraseLineAfter();
      }
      if (i >= this.printedRows) {
        break;
      }
    }
    this.setCursor();
  }

  public static padRight(text: string, len: number) {
    let padText = text;
    while (padText.length < len) {
      padText = `${padText} `;
    }
    return (padText.length > len) ? [padText.substring((padText.length - len) + 3), "..."] : [padText, ""];
  }
}
