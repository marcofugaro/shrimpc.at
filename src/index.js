import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import * as PIXI from 'pixi.js'
import Shake from 'shake.js'
import webAudioTouchUnlock from 'web-audio-touch-unlock'
import { initCustomCollisions } from 'scene/collisions'
import { getFrustumSliceSize } from 'lib/three-utils'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import Shrimps, { SHRIMP_INTERVAL } from './scene/Shrimps'
import Delimiters from './scene/Delimiters'
import Arms from './scene/Arms'
import Head from './scene/Head'
import Body from './scene/Body'
import Vehicles from './scene/Vehicles'
import addBackgorundVideo from './scene/backgroundVideo'
import { addLights } from './scene/lights'
import { addFilters } from './scene/filters'

window.DEBUG = window.location.search.includes('debug')
window.SHOW_FPS = window.location.search.includes('fps')

// Init shake.js
new Shake({ threshold: 10, timeout: 250 }).start()

// Grab our canvas
const canvas = document.querySelector('#main')

// Setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  backgroundAlpha: 0,
  alpha: true,
  showFps: window.DEBUG || window.SHOW_FPS,
  orbitControls: window.DEBUG && {
    distance: 15,
  },
  panelInputs: window.DEBUG && [
    {
      type: 'range',
      label: 'Shrimp Spawn Interval',
      min: 0,
      max: 5,
      initial: SHRIMP_INTERVAL,
    },
  ],
  world: new CANNON.World(),
  tween: TWEEN,
  pixi: PIXI,
  // PERF cap dpi because of performance issues with the combination three + pixi
  maxPixelRatio: 1,
})

// Attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// init the Web Audio API context and unlock it when
// a touch event happens
webgl.audioContext = new (window.AudioContext || window.webkitAudioContext)()
webAudioTouchUnlock(webgl.audioContext)

// Hide canvas
webgl.canvas.style.visibility = 'hidden'

// Load any queued assets
assets.load({ renderer: webgl.renderer }).then(async () => {
  // Move the camera behind
  webgl.camera.position.set(0, 0, 15)

  // WebGL components
  webgl.scene.delimiters = new Delimiters({ webgl })
  webgl.scene.add(webgl.scene.delimiters)
  webgl.scene.body = new Body({ webgl })
  webgl.scene.add(webgl.scene.body)
  webgl.scene.arms = new Arms({ webgl })
  webgl.scene.add(webgl.scene.arms)
  webgl.scene.head = new Head({ webgl })
  webgl.scene.add(webgl.scene.head)
  webgl.scene.shrimps = new Shrimps({ webgl })
  webgl.scene.add(webgl.scene.shrimps)
  webgl.scene.vehicles = new Vehicles({ webgl })
  webgl.scene.add(webgl.scene.vehicles)

  initCustomCollisions(webgl.world)

  addLights(webgl)

  // PIXI.js components
  // webgl.pixi.stage.component = new Component({ webgl })
  // webgl.pixi.stage.addChild(webgl.pixi.stage.component)
  //
  // for example:
  // class Component extends PIXI.Container {
  //   constructor({ webgl, ...options }) {
  //     super(options)
  //     this.webgl = webgl
  //
  //     ...
  //   }
  // }

  // wait for the video to load a bit
  const videoSprite = await addBackgorundVideo(webgl)
  webgl.pixi.stage.addChild(videoSprite)

  addFilters(webgl)

  // calculate the frustum dimensions on the z = 0 plane
  // it will be used to check if the elements go outside of it
  webgl.frustumSize = getFrustumSliceSize({
    camera: webgl.camera,
    distance: webgl.camera.position.z,
  })
  window.addEventListener('resize', () => {
    webgl.frustumSize = getFrustumSliceSize({
      camera: webgl.camera,
      distance: webgl.camera.position.z,
    })
  })

  // Show canvas
  webgl.canvas.style.visibility = ''

  // start animation loop
  webgl.start()
  webgl.draw()

  console.log('Source code at https://github.com/marcofugaro/shrimpc.at')
  console.log(
    `%c
     ___________________     
    < Hint: press Space >    
     -------------------     
               /             
    %c/¯¯¯¯¯\\   %c/%c              
    ( #|\\_ü|                 
    ( #\\                     
      \\#\\                    
      /||\\                   
                             
`,
    'background: #1d7cf2; color: white;',
    'background: #1d7cf2; color: #ffcc00;',
    'background: #1d7cf2; color: white;',
    'background: #1d7cf2; color: #ffcc00;',
  )
})
