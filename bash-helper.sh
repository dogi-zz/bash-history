#!/bin/bash

./bash-helper
COMMAND=`head -n1 ~/.bash-helper.state`

ENTER_LINE=`head -n2 ~/.bash-helper.state | tail -n1`
ENTER=""
if [ "$ENTER_LINE" = "ENTER" ]; then
  ENTER="xdotool key Return"
fi

bash -c "sleep 0.1; xdotool type --delay 0 \"$COMMAND\"; $ENTER" &


