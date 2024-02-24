#!/bin/bash

# Check the argument and run the corresponding npm version command
if [ "$1" == "minor" ]; then
  npm version minor -m "Bump version to %s"
elif [ "$1" == "major" ]; then
  npm version major -m "Bump version to %s"
else
  npm version patch -m "Bump version to %s"
fi

echo "Would you like to push the tag? (y or n)"
read answer

if [ "$answer" == "y" ]; then
  git push --tags
fi
