import * as THREE from 'three'
import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import WebGLApp from 'lib/WebGLApp'
import assets from 'lib/AssetManager'
import Shrimps, { SHRIMP_INTERVAL } from 'scene/Shrimps'
import Delimiters from 'scene/Delimiters'
import Arms from 'scene/Arms'
import Head from 'scene/Head'
import Body from 'scene/Body'
import Van from 'scene/Van'
import { initCustomCollisions } from 'scene/collisions'
import { getFrustumSliceSize } from 'lib/three-utils'

window.DEBUG = window.location.search.includes('debug')

// Grab our canvas
const canvas = document.querySelector('#main')

// Setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  backgroundAlpha: 0,
  alpha: true,
  showFps: window.DEBUG,
  controls: window.DEBUG && {
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
})

// Attach it to the window to inspect in the console
if (window.DEBUG) {
  window.webgl = webgl
}

// Hide canvas
webgl.canvas.style.visibility = 'hidden'

// Load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // Show canvas
  webgl.canvas.style.visibility = ''

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

  // turn on shadows in the renderer
  // TODO are those useful? do some tests
  // webgl.renderer.shadowMap.enabled = true
  // webgl.renderer.shadowMap.type = THREE.PCFSoftShadowMap // default THREE.PCFShadowMap
  //
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
  hemiLight.color.setHSL(0.6, 1, 0.6)
  hemiLight.groundColor.setHSL(0.095, 1, 0.75)
  webgl.scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.color.setHSL(0.1, 1, 0.95)
  dirLight.castShadow = true
  webgl.scene.add(dirLight)

  // TODO are those useful? do some tests
  // dirLight.shadow.mapSize.width = 2048
  // dirLight.shadow.mapSize.height = 2048
  //
  // const d = 50
  //
  // dirLight.shadow.camera.left = -d
  // dirLight.shadow.camera.right = d
  // dirLight.shadow.camera.top = d
  // dirLight.shadow.camera.bottom = -d
  //
  // dirLight.shadow.camera.far = 3500
  // dirLight.shadow.bias = -0.0001

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

  // start animation loop
  webgl.start()
  webgl.draw()
})
