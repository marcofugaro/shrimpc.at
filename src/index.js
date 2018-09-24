import * as THREE from 'three'
import CANNON from 'cannon'
import WebGLApp from 'lib/WebGLApp'
import assets from 'lib/AssetManager'
import Shrimps, { SHRIMP_INTERVAL } from 'scene/Shrimps'
import Delimiters from 'scene/Delimiters'
import Arms from 'scene/Arms'
import Head from 'scene/Head'

window.DEBUG = process.env.NODE_ENV === 'development' || window.location.search.includes('debug')

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
  const shrimps = new Shrimps({ webgl })
  webgl.scene.add(shrimps)
  const delimiters = new Delimiters({ webgl })
  webgl.scene.add(delimiters)
  const arms = new Arms({ webgl })
  webgl.scene.add(arms)
  const head = new Head({ webgl })
  webgl.scene.add(head)

  // defines the interaction between two shrimp materials
  webgl.world.addContactMaterial(
    new CANNON.ContactMaterial(shrimps.material, shrimps.material, {
      friction: 4,
      restitution: 0.5,
    }),
  )

  // defines the interaction between a shrimp and a delimiter
  webgl.world.addContactMaterial(
    new CANNON.ContactMaterial(shrimps.material, delimiters.material, {
      friction: 0,
      restitution: 1,
    }),
  )

  // defines the interaction between an arm and the head
  webgl.world.addContactMaterial(
    new CANNON.ContactMaterial(arms.material, head.material, {
      friction: 0.2,
      restitution: 0.01,
    }),
  )

  // defines the interaction between a shrimp and the head
  webgl.world.addContactMaterial(
    new CANNON.ContactMaterial(shrimps.material, head.material, {
      friction: 0.2,
      restitution: 0.01,
    }),
  )

  // turn on shadows in the renderer
  // TODO are those useful? do some tests
  webgl.renderer.shadowMap.enabled = true
  webgl.renderer.shadowMap.type = THREE.PCFSoftShadowMap // default THREE.PCFShadowMap

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

  // start animation loop
  webgl.start()
  webgl.draw()
})
