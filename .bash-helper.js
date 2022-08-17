const fs = require('fs');
const path = require('path');

module.exports = {

   getSuggestions: (str, cwd) => {
      const packFile = path.resolve(cwd, 'package.json');
      const result = [];
      if (fs.existsSync(packFile)){
         const packJson =JSON.parse( fs.readFileSync(packFile, 'utf-8'));
         if (packJson.scripts){
            Object.keys(packJson.scripts).forEach(key => result.push(`npm run ${key}`) )
         }
      }
      return result
   },

}
