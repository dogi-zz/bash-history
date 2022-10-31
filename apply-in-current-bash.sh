#!/bin/bash

press_enter() {
  if [ $(which xdotool) ]; then
    sleep 0.2;
    xdotool key Return;
  fi
}

autocomplete() {
  # /opt/bash-history/bash-history $READLINE_LINE
  node /opt/bash-history/bash-history.js $READLINE_LINE

  COMMAND_LINE=`head -n1 ~/.bash-history.state`
  COMMAND_CURSOR=`head -n2 ~/.bash-history.state | tail -n1`

  READLINE_LINE=$COMMAND_LINE
  READLINE_POINT=$COMMAND_CURSOR

  # experimental
  #press_enter & disown
}


if [[ $- =~ .*i.* ]]; then bind -x '"\C-r" : autocomplete'; fi

