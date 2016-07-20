/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

process.env.NODE_ENV = 'development';

var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('../config/webpack.config.dev');
var execSync = require('child_process').execSync;
var opn = require('opn');

var handleCompile;
if (process.argv[2] === '--smoke-test') {
  handleCompile = function (err, stats) {
    if (err || stats.toJson().errors.length || stats.toJson().warnings.length) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  };
}

new WebpackDevServer(webpack(config, handleCompile), {
  publicPath: config.output.publicPath,
  historyApiFallback: true,
  hot: true, // Note: only CSS is currently hot reloaded
  stats: {
    hash: false,
    version: false,
    timings: false,
    assets: false,
    chunks: false,
    modules: false,
    reasons: false,
    children: false,
    source: false,
    publicPath: false,
    colors: true,
    errors: true,
    errorDetails: true,
    warnings: true,
  }
}).listen(3000, 'localhost', function (err, result) {
  if (err) {
    return console.log(err);
  }
  console.log('Running development server at http://localhost:3000/');

  opn('http://localhost:3000/');
});
