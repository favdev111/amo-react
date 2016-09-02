#!/bin/bash
# Copyright (c) 2015-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

# Start in tests/ even if run from root directory
cd "$(dirname "$0")"

# Exit the script on any command with non 0 return code
# We assume that all the commands in the pipeline set their return code
# properly and that we do not need to validate that the output is correct
set -e

# Echo every command being executed
set -x

# Go to root
cd ..

# You can only release with npm >= 3
if [ $(npm -v | head -c 1) -lt 3 ]; then
  echo "Releasing requires npm >= 3. Aborting.";
  exit 1;
fi;

if [ -n "$(git status --porcelain)" ]; then
  echo "Your git status is not clean. Aborting.";
  exit 1;
fi

# Create a temporary clean folder that contains production only code.
# Do not overwrite any files in the current folder.
clean_path=`mktemp -d clean_XXXX`

# Copy some of the project files to the temporary folder.
# Exclude folders that definitely won’t be part of the package from processing.
# We will strip the dev-only code there, and then copy files back.
rsync -av --exclude='.git' --exclude=$clean_path\
  --exclude='node_modules' --exclude='build'\
  './' '$clean_path'  >/dev/null

# Now remove all the code relevant to development of Create React App.
cd $clean_path
files="$(find -L . -name "*.js" -type f)"
for file in $files; do
  sed -i.bak '/\/\/ @remove-on-publish-begin/,/\/\/ @remove-on-publish-end/d' $file
  rm $file.bak
done

# Update deps
rm -rf node_modules
rm -rf ~/.npm
npm cache clear
npm install

# Force dedupe
npm dedupe

# Don't bundle fsevents because it is optional and OS X-only
# Since it's in optionalDependencies, it will attempt install outside bundle
rm -rf node_modules/fsevents

# This modifies $clean_path/package.json to copy all dependencies to bundledDependencies
node ./node_modules/.bin/bundle-deps

# Go!
npm publish "$@"

# cleanup
cd ..
rm -rf $clean_path
