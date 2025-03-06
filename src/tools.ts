import inspect from "npm:util-inspect@0.1.8";
import * as fs from "node:fs";

export const readFileSync = (filename: string) => new TextDecoder("utf-8").decode(Deno.readFileSync(filename));

export const writeFileSync = (filename: string, data: string) => Deno.writeFileSync(filename, new TextEncoder().encode(data));

export const initOutputCommands = (infoFile: string | null): {
  getInfo: (active: boolean) => (...args: any[]) => void;
} => {
  return {
    getInfo: (active) =>
      active
        ? (...args: any[]) => {
          if (!infoFile) {
            return;
          }
          const codes = args.map((arg) => typeof arg === "object" ? inspect(arg, { depth: 3 }) : arg);
          fs.appendFileSync(
            infoFile,
            `[INFO] ${new Date().toISOString()} ${codes.join(" ")}\n`,
            "utf-8",
          );
        }
        : (...args: any[]) => {},
  };
};


export const toggleStringInArray = (array: string[], str: string)=>{
  if (array.includes(str)){
    while (array.includes(str)){
      array.splice(array.indexOf(str), 1);
    }
  } else {
    array.push(str);
  }
}



const AsciiChars = [
  '0','1','2','3','4','5','6','7','8','9',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '!','"','#','$','%','&','\'','(',')','*','+',',','-','.','/',':',';','<','=','>','?','@','[','\\',']','^',
  '_','`','{','|','}','~', ' ',
];
export const toPrintableString = (input: string) => {
  return input.split('').filter(c => AsciiChars.includes(c)).join('');
}

const PathChars = [
  '0','1','2','3','4','5','6','7','8','9',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '#','$','(',')','*','+',',','-','.','?','@','_',
];
export const toPathString = (input: string) => {
  return input.split('').map(c => PathChars.includes(c) ? c : '_').join('');
}
