#!/bin/bash

os=$(uname -s)

if [ "$os" = "Linux" ]; then
  sudo apt install nodejs npm
elif [ "$os" = "Darwin" ]; then
  brew install node
fi

node -v
npm install -g typescript
npm install

