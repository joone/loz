#!/bin/bash

# find highest tag nuber
VERSION=`git describe --abbrev=0 --tags`

# replace . with spaces to split into an array
VERSION_BITS=(${VERSION//./ })

# increset the digit
VNUM1=${VERSION_BITS[0]}
VNUM2=${VERSION_BITS[1]}
VNUM3=${VERSION_BITS[2]}
VNUM3=$((VNUM3+1))

# add new tag
NEW_TAG="$VNUM1.$VNUM2.$VNUM3"

if [ "$1" ]; then
  NEW_TAG=$1
fi

echo "Updating $VERSION to $NEW_TAG"

sed -i "0,/$VERSION/s//$NEW_TAG/" package.json
sed -i "0,/$VERSION/s//$NEW_TAG/" package-lock.json

git add package.json
git add package-lock.json
git commit -m "Release $NEW_TAG"

echo "Would you like to push the changes? (y or n)"
read answer

if [ "$answer" == "y" ]; then
  git push origin
  git tag $NEW_TAG
  git push --tags
  exit 0
fi

