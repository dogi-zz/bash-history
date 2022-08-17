
if [ "$(whoami)" != "root" ]; then
  echo "Please run as SUDO";
  exit 1;
fi

mkdir -p /opt/bash-helper
cp bash-helper /opt/bash-helper
cp apply-in-current-bash.sh /opt/bash-helper
chmod a+x /opt/bash-helper/bash-helper
chmod a+x /opt/bash-helper/apply-in-current-bash.sh

