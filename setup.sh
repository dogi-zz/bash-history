

install_app() {
  echo "install app in /opt/bash-history"
  mkdir -p /opt/bash-history
  if [ -d /opt/bash-history/node_modules ]; then rm -rf /opt/bash-history/node_modules; fi

  cp pack/bash-history.js /opt/bash-history
  cp -r pack/node_modules /opt/bash-history/

  cp apply-in-current-bash.sh /opt/bash-history
  chmod a+x /opt/bash-history/bash-history
  chmod a+x /opt/bash-history/apply-in-current-bash.sh
}

npm run pack

sudo bash -c "$(declare -f install_app); install_app" && echo "setup done!"
