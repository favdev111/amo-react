/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

process.env.NODE_ENV = 'production';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var filesize = require('filesize');
var gzipSize = require('gzip-size').sync;
var rimrafSync = require('rimraf').sync;
var webpack = require('webpack');
var config = require('../config/webpack.config.prod');
var paths = require('../config/paths');
var recursive = require('recursive-readdir');
var stripAnsi = require('strip-ansi');

function removeFileNameHash(fileName) {
  return fileName
    .replace(paths.appBuild, '')
    .replace(/\/?(.*)(\.\w+)(\.js|\.css)/, (match, p1, p2, p3) => p1 + p3);
}

function getDifferenceLabel(currentSize, previousSize) {
  var FIFTY_KILOBYTES = 1024 * 50;
  var difference = currentSize - previousSize;
  var fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red('+' + fileSize);
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow('+' + fileSize);
  } else if (difference < 0) {
    return chalk.green(fileSize);
  } else {
    return '';
  }
}

// First, read the current file sizes in build directory.
// This lets us display how much they changed later.
recursive(paths.appBuild, (err, fileNames) => {
  var previousSizeMap = (fileNames || [])
    .filter(fileName => /\.(js|css)$/.test(fileName))
    .reduce((memo, fileName) => {
      var contents = fs.readFileSync(fileName);
      var key = removeFileNameHash(fileName);
      memo[key] = gzipSize(contents);
      return memo;
    }, {});

  // Remove all content but keep the directory so that
  // if you're in it, you don't end up in Trash
  rimrafSync(paths.appBuild + '/*');

  // Start the webpack build
  build(previousSizeMap);
});

function printFileSizes(stats, previousSizeMap) {
  var assets = stats.toJson().assets
    .filter(asset => /\.(js|css)$/.test(asset.name))
    .map(asset => {
      var fileContents = fs.readFileSync(paths.appBuild + '/' + asset.name);
      var size = gzipSize(fileContents);
      var previousSize = previousSizeMap[removeFileNameHash(asset.name)];
      var difference = getDifferenceLabel(size, previousSize);
      return {
        folder: path.join('build', path.dirname(asset.name)),
        name: path.basename(asset.name),
        size: size,
        sizeLabel: filesize(size) + (difference ? ' (' + difference + ')' : '')
      };
    });
  assets.sort((a, b) => b.size - a.size);

  var longestSizeLabelLength = Math.max.apply(null,
    assets.map(a => stripAnsi(a.sizeLabel).length)
  );
  assets.forEach(asset => {
    var sizeLabel = asset.sizeLabel;
    var sizeLength = stripAnsi(sizeLabel).length;
    if (sizeLength < longestSizeLabelLength) {
      var rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength);
      sizeLabel += rightPadding;
    }
    console.log(
      '  ' + sizeLabel +
      '  ' + chalk.dim(asset.folder + path.sep) + chalk.cyan(asset.name)
    );
  });
}

function build(previousSizeMap) {
  console.log('Creating an optimized production build...');
  webpack(config).run((err, stats) => {
    if (err) {
      console.error('Failed to create a production build. Reason:');
      console.error(err.message || err);
      process.exit(1);
    }

    console.log(chalk.green('Compiled successfully.'));
    console.log();

    console.log('File sizes after gzip:');
    console.log();
    printFileSizes(stats, previousSizeMap);
    console.log();

    var openCommand = process.platform === 'win32' ? 'start' : 'open';
    var homepagePath = require(paths.appPackageJson).homepage;
    var publicPath = config.output.publicPath;
    if (homepagePath && homepagePath.indexOf('.github.io/') !== -1) {
      // "homepage": "http://user.github.io/project"
      console.log('You can now deploy them to ' + chalk.green(homepagePath) + ':');
      console.log();
      console.log('  ' + chalk.blue('git') + chalk.cyan(' commit -am ') + chalk.yellow('"Save local changes"'));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' checkout -B gh-pages'));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' add -f build'));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' commit -am ' + chalk.yellow('"Rebuild website"')));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' filter-branch -f --prune-empty --subdirectory-filter build'));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' push -f origin gh-pages'));
      console.log('  ' + chalk.blue('git') + chalk.cyan(' checkout -'));
      console.log();
      console.log('The project was built assuming it is hosted at ' + chalk.green(publicPath) + '.');
      console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
    } else if (publicPath !== '/') {
      // "homepage": "http://mywebsite.com/project"
      console.log('The project was built assuming it is hosted at ' + chalk.green(publicPath) + '.');
      console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
    } else {
      // no homepage or "homepage": "http://mywebsite.com"
      console.log('You can now deploy them or serve them with a static server:');
      console.log();
      console.log('  ' + chalk.blue('npm') +  chalk.cyan(' install -g pushstate-server'));
      console.log('  ' + chalk.blue('pushstate-server') + chalk.cyan(' build'));
      console.log('  ' + chalk.blue(openCommand) + chalk.cyan(' http://localhost:9000'));
      console.log();
      console.log('The project was built assuming it is hosted at the server root.');
      if (homepagePath) {
        // "homepage": "http://mywebsite.com"
        console.log('You can control this with the ' + chalk.green('homepage') + ' field in your '  + chalk.cyan('package.json') + '.');
      } else {
        // no homepage
        console.log('To override this, specify the ' + chalk.green('homepage') + ' in your '  + chalk.cyan('package.json') + '.');
        console.log('For example, add this to build it for GitHub Pages:')
        console.log();
        console.log('  ' + chalk.green('"homepage"') + chalk.cyan(': ') + chalk.green('"http://myname.github.io/myapp"') + chalk.cyan(','));
      }
    }
    console.log();
  });
}
