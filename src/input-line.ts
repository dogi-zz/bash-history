import {BehaviorSubject} from "npm:rxjs@7.8.1";
import {getInfo} from './commons.ts'
// const info = (...args: any[]) => {};

const info = getInfo(true);

export class InputLine {

  public inputCursorPosition: number;
  // let selectionCursorPosition = -1;

  public inputSubject: BehaviorSubject<string>;

  public constructor(
    public inputString: string,
  ) {
    this.inputCursorPosition = inputString.length;
    this.inputSubject = new BehaviorSubject<string>(this.inputString);
  }

  public setString(inputString: string) {
    this.inputCursorPosition = inputString.length;
    this.inputString = inputString;
  }

  public info() {
    info(`InputLine{inputString: ${this.inputString}, inputCursorPosition: ${this.inputCursorPosition}}`);
  }

  public inputChar(char: string) {
    const parts = [this.inputString.substring(0, this.inputCursorPosition), this.inputString.substring(this.inputCursorPosition)];
    this.inputString = `${parts[0]}${char}${parts[1]}`;
    this.inputCursorPosition++;
    this.inputSubject.next(this.inputString);
    // afterType();
  }

  public backspace() {
    if (!this.inputString.length) {
      return;
    }
    const parts = [this.inputString.substring(0, this.inputCursorPosition), this.inputString.substring(this.inputCursorPosition)];
    if (parts[0].length) {
      this.inputString = `${parts[0].substring(0, parts[0].length - 1)}${parts[1]}`;
    }
    this.inputCursorPosition--;
    this.inputSubject.next(this.inputString);
  }

  public delete() {
    if (!this.inputString.length) {
      return;
    }
    const parts = [this.inputString.substring(0, this.inputCursorPosition), this.inputString.substring(this.inputCursorPosition)];
    if (parts[1].length) {
      this.inputString = `${parts[0]}${parts[1].substring(1)}`;
    }
    this.inputCursorPosition--;
    this.inputSubject.next(this.inputString);
  }

  public moveCursor(amount: number) {
    this.inputCursorPosition = Math.min(this.inputString.length, Math.max(0, this.inputCursorPosition + amount));
    this.inputSubject.next(this.inputString);
  }
}
