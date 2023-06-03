#!/bin/bash

os=$(uname -s)

if [ "$os" = "Darwin" ]; then
  brew install node
fi

if ! command -v npm &> /dev/null
then
      echo "ERROR: NPM could not be found on your system. Please install it depending of which Linux distro you use, then restart this script."
      echo.
      echo "Debian/Ubuntu and based on them: sudo apt install nodejs npm"
      echo "Arch Linux and based on it: sudo pacman -S nodejs npm"
      echo "Fedora/Red Hat and based on them: sudo dnf install nodejs npm"
      echo.
      exit
fi

node -v
sudo npm install -g typescript
npm install
tsc
sudo npm install -g .

