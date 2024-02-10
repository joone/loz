#!/bin/bash
npm version patch -m "Bump version to %s"

echo "Would you like to push the tag? (y or n)"
read answer

if [ "$answer" == "y" ]; then
  git push --tags
  exit 0
fi
