# bash-history

replacement for the Ctrl-R function in Bash, that allows favorites based on the local directory

## Features
  - cleans up duplicates in the users `.bash_history`
  - ability to search in the local users history
  - search can be customized:
    - search for words or the whole string
    - ignore case
    - the line can be set as favorite...
      - for every location (F4)
      - for the current workdir (F5)
  - by adding a file named `.bash-history.js` in the work-dir or the users home,
    you can add custom suggestions (e.g. scripts from package.json)


## Scripts

 - `test` : Runs the application and prints the resulted line on the command line
 - `pack:prepare` : Prepares the files for packaging
 - `pack:run` : Runs the packaging
 - `pack` : Prepares, runs the packaging, create the ready executable
 - `run` : Runs the executable after `pack`

## Install

After `pack` the script can be installed (copied to /opt/bash-history) width setup.sh

## Run

Option 1 (on demand):
   - Put in bashrc:`alias bh='source /opt/bash-history/apply-in-current-bash.sh'`
   - then activate with `bh`

Option 1 (always):
- Put in bashrc:`source /opt/bash-history/apply-in-current-bash.sh`


## Usage

- Type and Search
- `[TAB]` will apply current selection as line
- `[ENTER]` will return to prompt with the selected line
