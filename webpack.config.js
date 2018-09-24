const path = require('path')
const merge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const openBrowser = require('react-dev-utils/openBrowser')
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const prettyMs = require('pretty-ms')
const ThreeWebpackPlugin = require('@wildpeaks/three-webpack-plugin')

module.exports = merge.smart(
  {
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
        {
          test: /\.(glsl|frag|vert)$/,
          use: ['raw-loader', 'glslify-loader'],
        },
      ],
    },
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        template: './public/index.html',
      }),
      // Makes you import normally from `three/examples/js` files
      new ThreeWebpackPlugin(),
    ],
    // import files without doing the ../../../
    resolve: {
      modules: ['node_modules', 'src'],
    },
    // automatically split vendor and app code
    optimization: {
      splitChunks: {
        chunks: 'all',
        name: 'vendors',
      },
    },
  },
  //
  //  $$$$$$\    $$$$$$$$\     $$$$$$\     $$$$$$$\    $$$$$$$$\
  // $$  __$$\   \__$$  __|   $$  __$$\    $$  __$$\   \__$$  __|
  // $$ /  \__|     $$ |      $$ /  $$ |   $$ |  $$ |     $$ |
  // \$$$$$$\       $$ |      $$$$$$$$ |   $$$$$$$  |     $$ |
  //  \____$$\      $$ |      $$  __$$ |   $$  __$$<      $$ |
  // $$\   $$ |     $$ |      $$ |  $$ |   $$ |  $$ |     $$ |
  // \$$$$$$  |     $$ |      $$ |  $$ |   $$ |  $$ |     $$ |
  //  \______/      \__|      \__|  \__|   \__|  \__|     \__|
  //
  process.env.NODE_ENV === 'development' && {
    mode: 'development',
    // a good compromise betwee fast and readable sourcemaps
    devtool: 'cheap-module-source-map',
    // turn off performance hints during development
    performance: false,
    devServer: {
      contentBase: './public/',
      publicPath: '/',
      port: 8080,
      // trigger reload when files in contentBase folder change
      watchContentBase: true,
      // serve everything in gzip
      compress: true,
      // Sssh...
      quiet: true,
      clientLogLevel: 'none',
      // uncomment these lines to enable HMR
      // hot: true,
      // hotOnly: true,
      after(app, options) {
        // try to open into the already existing tab
        openBrowser(`http://localhost:8080`)
      },
    },
    plugins: [
      // Automatic rediscover of packages after `npm install`
      new WatchMissingNodeModulesPlugin('node_modules'),
    ],
    // serve: {
    //   on: {
    //     listening: ({ server, options }) => {
    //       // try to open into the already existing tab
    //       openBrowser(`http://localhost:${options.port}`)
    //     },
    //     // don't show all the default webpack bloat
    //     'build-finished': ({ stats }) => {
    //       if (stats.hasErrors()) {
    //         return
    //       }
    //
    //       const time = prettyMs(stats.endTime - stats.startTime)
    //       console.log(`Compiled successfully in ${time}`)
    //     },
    //     'compiler-error': stats => {
    //       const messages = formatWebpackMessages(stats.json)
    //       console.log(messages.errors[0])
    //     },
    //   },
    // },
  },
  //
  // $$$$$$$\     $$\   $$\    $$$$$$\    $$\          $$$$$$$\
  // $$  __$$\    $$ |  $$ |   \_$$  _|   $$ |         $$  __$$\
  // $$ |  $$ |   $$ |  $$ |     $$ |     $$ |         $$ |  $$ |
  // $$$$$$$\ |   $$ |  $$ |     $$ |     $$ |         $$ |  $$ |
  // $$  __$$\    $$ |  $$ |     $$ |     $$ |         $$ |  $$ |
  // $$ |  $$ |   $$ |  $$ |     $$ |     $$ |         $$ |  $$ |
  // $$$$$$$  |   \$$$$$$  |   $$$$$$\    $$$$$$$$\    $$$$$$$  |
  // \_______/     \______/    \______|   \________|   \_______/
  //
  process.env.NODE_ENV === 'production' && {
    mode: 'production',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'app.[chunkhash:8].js',
      chunkFilename: '[name].[contenthash:8].chunk.js',
      // change this if you're deploying on a subfolder
      publicPath: '/',
    },
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          uglifyOptions: {
            parse: {
              // we want uglify-js to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
            },
            output: {
              ecma: 5,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          parallel: true,
          cache: true,
          sourceMap: true,
        }),
      ],
    },
  },
)
