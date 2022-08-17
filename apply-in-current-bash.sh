#!/bin/bash

#npx npx ts-node src/bash-helper.ts
#COMMAND=`head -n1 ~/.bash-helper.state`
#ENTER_LINE=`head -n2 ~/.bash-helper.state | tail -n1`
#ENTER=""
#if [ "$ENTER_LINE" = "ENTER" ]; then
#  ENTER="xdotool key Return"
#fi
#echo "HIER" $COMMAND $ENTER
#
#bash -c "sleep 0.1; xdotool type --delay 0 \"$COMMAND\"; $ENTER" &

autocomplete() {
  ./bash-helper $READLINE_LINE

  COMMAND_LINE=`head -n1 ~/.bash-helper.state`
  COMMAND_CURSOR=`head -n2 ~/.bash-helper.state | tail -n1`
  COMMAND_ENTER_KEY=`head -n3 ~/.bash-helper.state | tail -n1`

  if [ "$COMMAND_ENTER_KEY" = "TAB" ]; then
    READLINE_LINE=$COMMAND_LINE
    READLINE_POINT=COMMAND_CURSOR
  fi
  if [ "$COMMAND_ENTER_KEY" = "ENTER" ]; then
    echo ${PS1@P} $COMMAND_LINE
    $COMMAND_LINE
  fi

}

bind -x '"\C-r" : autocomplete'

