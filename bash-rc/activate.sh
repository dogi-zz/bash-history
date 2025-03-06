#!/bin/bash

autocomplete() {
  # ./build/bash-history test 2>&1
  { READLINE_LINE="$( { /opt/bash-history/bash-history $READLINE_LINE; } 2>&1 1>&3 3>&- )"; } 3>&1;
  READLINE_POINT=${#READLINE_LINE}
}
if [[ $- =~ .*i.* ]]; then bind -x '"\C-r" : autocomplete'; fi


