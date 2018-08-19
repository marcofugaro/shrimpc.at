import * as THREE from 'three'
import WebGLApp from 'lib/WebGLApp'
import assets from 'lib/AssetManager'
import Shrimps from 'scene/Shrimps'

// Grab our canvas
const canvas = document.querySelector('#main')

// Setup the WebGLRenderer
const webgl = new WebGLApp({
  canvas,
  backgroundAlpha: 0,
  alpha: true,
  showFps: true,
  useOrbitControls: true,
})

// Hide canvas
webgl.canvas.style.visibility = 'hidden'

// Load any queued assets
assets.load({ renderer: webgl.renderer }).then(() => {
  // Show canvas
  webgl.canvas.style.visibility = ''

  // Add any "WebGL components" here...
  webgl.scene.add(new Shrimps(webgl))

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

  // set up the frustum, used to check if
  // some object are still in view.
  // somehow three js doesn't expose its frustum
  webgl.camera.updateMatrix()
  webgl.camera.updateMatrixWorld()
  const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(
    webgl.camera.projectionMatrix,
    webgl.camera.matrixWorldInverse,
  )
  webgl.camera.frustum = new THREE.Frustum().setFromMatrix(projScreenMatrix)

  // start animation loop
  webgl.start()
  webgl.draw()
})
