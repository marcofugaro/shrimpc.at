import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import * as PIXI from 'pixi.js'
import * as THREE from 'three'
import { initCustomCollisions } from 'scene/collisions'
import { getFrustumSliceSize } from 'lib/three-utils'
import WebGLApp from './lib/WebGLApp'
import assets from './lib/AssetManager'
import Shrimps, { SHRIMP_INTERVAL } from './scene/Shrimps'
import Delimiters from './scene/Delimiters'
import Arms from './scene/Arms'
import Head from './scene/Head'
import Body from './scene/Body'
import Van from './scene/Van'
import { addLights } from './scene/lights'
import { ShaderPass } from './lib/three/ShaderPass'
import passVert from './scene/shaders/pass.vert'
import colorAdjustmentFrag from './scene/shaders/color-adjustment.frag'

window.DEBUG = window.location.search.includes('debug')

// Grab our canvas
const canvas = document.querySelector('#main')

// Setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  backgroundAlpha: 0,
  alpha: true,
  postprocessing: true,
  showFps: true,
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
  maxPixelRatio: 1,
})

// Attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// Hide canvas
webgl.canvas.style.visibility = 'hidden'

// Load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // Move the camera behind
  webgl.camera.position.set(0, 0, 15)

  // Add any "WebGL components" here...
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
  webgl.scene.van = new Van({ webgl })
  webgl.scene.add(webgl.scene.van)

  initCustomCollisions(webgl.world)

  addLights(webgl)

  // postprocessing
  const colorAdjustment = new ShaderPass({
    vertexShader: passVert,
    fragmentShader: colorAdjustmentFrag,
    uniforms: {
      tDiffuse: { type: 't', value: new THREE.Texture() },
    },
  })
  webgl.composer.addPass(colorAdjustment)

  // Render the video in pixi as a pixi layer
  const video = document.querySelector('video')
  const videoTexture = PIXI.Texture.from(video)
  const videoSprite = new PIXI.Sprite(videoTexture)
  videoSprite.zIndex = -1

  const rendererRatio = webgl.pixi.renderer.width / webgl.pixi.renderer.height
  const ratio = video.videoWidth / video.videoHeight

  // like backgorund-size: cover
  if (ratio > rendererRatio) {
    videoSprite.height = webgl.pixi.renderer.height
    videoSprite.width = videoSprite.height * ratio
  } else {
    videoSprite.width = webgl.pixi.renderer.width
    videoSprite.height = videoSprite.width * (1 / ratio)
  }

  // center it
  videoSprite.anchor.set(0.5)
  videoSprite.x = webgl.pixi.renderer.width / 2
  videoSprite.y = webgl.pixi.renderer.height / 2

  webgl.pixi.stage.addChild(videoSprite)

  const displacementSprite = PIXI.Sprite.from('/assets/noise.jpg')
  const displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite)
  displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.MIRRORED_REPEAT
  webgl.pixi.stage.addChild(displacementSprite)

  const colorMatrix = new PIXI.filters.ColorMatrixFilter()
  // colorMatrix.technicolor(true)
  webgl.pixi.stage.filters = [colorMatrix, displacementFilter]

  // document.body.onclick = () => {
  //   webgl.saveScreenshot()
  // }

  displacementFilter.scale.set(25)
  const speed = 8
  webgl.onUpdate((dt = 0, time = 0) => {
    displacementSprite.x += 10 * speed * dt
    displacementSprite.y += 3 * speed * dt
  })

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
})
