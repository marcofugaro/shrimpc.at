// include any additional ThreeJS vendor libraries here
// require('three/examples/js/loaders/GLTFLoader.js')

import WebGLApp from 'lib/WebGLApp'
import assets from 'lib/AssetManager'
import Shrimps from 'scene/Shrimps'

// Grab our canvas
const canvas = document.querySelector('#main')

// Setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
})

// Set background color
const background = 'white'
document.body.style.background = background
webgl.renderer.setClearColor(background)

// Hide canvas
webgl.canvas.style.visibility = 'hidden'

// Load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // Show canvas
  webgl.canvas.style.visibility = ''

  // Add any "WebGL components" here...
  webgl.scene.add(new Shrimps(webgl))

  // start animation loop
  webgl.start()
  webgl.draw()
})
