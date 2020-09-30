/* global module __dirname */
/* eslint no-console:0 */

const path = require('path');
const fs = require('fs');
const dyson = require('dyson');

const TARGET = path.resolve(__dirname, 'target');
const PLAYGROUND = path.resolve(__dirname, 'playground');
const DEFAULT_SERVER_PORT = 3000;
const WIDGET_RC_JS = '.widgetrc.js';
const WIDGET_RC = '.widgetrc';

if (!fs.existsSync(WIDGET_RC_JS) && fs.existsSync(WIDGET_RC)) {
  console.error('============================================');
  console.error(`Please migrate the ${WIDGET_RC} to ${WIDGET_RC_JS}.`);
  console.error('For more information, please see https://github.com/okta/okta-signin-widget/blob/master/MIGRATING.md');
  console.error('============================================');
  process.exit(1);
}

if (!fs.existsSync(WIDGET_RC_JS)) {
  // create default WIDGET_RC if it doesn't exist to simplifed the build process
  fs.copyFileSync('.widgetrc.sample.js', WIDGET_RC_JS);
}

module.exports = {
  target: 'web',
  entry: {
    'playground.js': [`${PLAYGROUND}/main.js`]
  },
  output: {
    path: `${PLAYGROUND}`,
    filename: 'playground.bundle.js',
  },
  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['@babel/preset-env']
        }
      },
    ]
  },

  devServer: {
    contentBase: [
      PLAYGROUND,
      TARGET,
      // webpack-dev-server v2 only watch contentbase on root level
      // explicitly list folders to watch for browser auto reload
      // sub-folders can be removed when upgrade to webpack-dev-server v3
      `${TARGET}/js`,
      `${TARGET}/css`,
    ],
    compress: true,
    port: DEFAULT_SERVER_PORT,
    open: true,
    watchContentBase: true,
    before (app) {
      // Enforce CSP
      app.use('/*', function (req, res, next){
        res.header('Content-Security-Policy', `script-src http://localhost:${DEFAULT_SERVER_PORT}`);
        next();
      });

      // ================================= dyson mock setup
      const mockOptions = {
        multiRequest: false,
        proxy: false,
        quiet: false,
        configDir: `${PLAYGROUND}/mocks/spec-okta-api`,
      };
      dyson.registerServices(
        app,
        mockOptions,
        dyson.getConfigurations(mockOptions),
      );
      // dyson register '*' route explicitly, that leads to multiple "*" routes. We need to remove "*" route
      // added by dyson from router stack and keep the one which was added by webpack dev server.
      let routeIndex = app._router.stack.length;
      while (routeIndex) {
        routeIndex -= 1;
        const layer = app._router.stack[routeIndex];
        if (layer.route && layer.route.path && layer.route.path === '*') {
          app._router.stack.splice(routeIndex, 1);
          break;
        }
      }
      // ================================= dyson mock setup
    }
  },

};
