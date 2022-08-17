const os = require('os');
const fs = require('fs');
const path = require('path');

//  { getSuggestions: (str: string, cwd: string) => string[] }[]
const extraModules = [];
[process.cwd(), os.homedir()].forEach(dir => {
  if (fs.existsSync(path.resolve(dir, '.bash-helper.js'))) {
    extraModules.push(require(path.resolve(dir, '.bash-helper.js')));
  }
});

const testString = process.argv.slice(2).join(' ');

console.info(`testString: ${JSON.stringify(testString)}`);

extraModules.forEach(module => {
  if (module.getSuggestions) {
    try {
      const suggestions = module.getSuggestions(testString, process.cwd());
      console.info(JSON.stringify(suggestions, null, 2));
    } catch (e) {
      console.error(e);
    }
  }
});
