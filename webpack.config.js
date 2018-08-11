const path = require('path')
const webpack = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const openBrowser = require('react-dev-utils/openBrowser')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
const prettyMs = require('pretty-ms')
const chokidar = require('chokidar')
const WebSocket = require('ws')

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          highlightCode: true,
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
  ...(process.env.NODE_ENV === 'development' && {
    mode: 'development',
    devtool: 'cheap-module-source-map',
    // turn off performance hints during development
    performance: false,
    serve: {
      content: './public/',
      logLevel: 'silent',
      port: 8080,
      hotClient: {
        hmr: false,
        logLevel: 'silent',
        port: 8090,
      },
      devMiddleware: {
        publicPath: '/',
        logLevel: 'silent',
      },
      on: {
        listening: ({ server }) => {
          // try to open into the already existing tab,
          // 8080 is webpack-serve's port
          openBrowser('http://localhost:8080')

          // watch public folder also
          // 8090 is webpack-hot-client's port
          const socket = new WebSocket('ws://localhost:8090')
          const watcher = chokidar.watch(path.resolve('./public'), {})

          watcher.on('change', () => {
            socket.send(
              JSON.stringify({
                type: 'broadcast',
                data: {
                  type: 'window-reload',
                  data: {},
                },
              }),
            )
          })

          server.on('close', () => {
            watcher.close()
          })
        },
        // don't show all the default webpack bloat
        'build-finished': ({ stats }) => {
          if (stats.hasErrors()) {
            return
          }

          const time = prettyMs(stats.endTime - stats.startTime)
          console.log(`Compiled successfully in ${time}`)
        },
        'compiler-error': stats => {
          const messages = formatWebpackMessages(stats.json)
          console.log(messages.errors[0])
        },
      },
    },
  }),
  ...(process.env.NODE_ENV === 'production' && {
    mode: 'production',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'app.[chunkhash:8].js',
      chunkFilename: '[name].[contenthash:8].chunk.js',
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
  }),
}
