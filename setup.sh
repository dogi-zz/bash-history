
if [ "$(whoami)" != "root" ]; then
  echo "Please run as SUDO";
  exit 1;
fi

if [ ! -f "pack/bash-history.js" ]; then
  echo "Please run "npm run pack" first";
  exit 1;
fi

mkdir -p /opt/bash-history
if [ -d /opt/bash-history/node_modules ]; then rm -rf /opt/bash-history/node_modules; fi

# cp bash-history /opt/bash-history
cp pack/bash-history.js /opt/bash-history
cp -r pack/node_modules /opt/bash-history/

cp apply-in-current-bash.sh /opt/bash-history
chmod a+x /opt/bash-history/bash-history
chmod a+x /opt/bash-history/apply-in-current-bash.sh

echo "setup done!"
