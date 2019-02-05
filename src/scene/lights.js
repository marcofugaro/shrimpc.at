import * as THREE from 'three'

export function addLights(webgl) {
  // turn on shadows
  // webgl.renderer.shadowMap.enabled = true

  // soft shadows
  webgl.renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5)
  // 0.6 is between cyan and blue
  hemiLight.color.setHSL(0.6, 1, 0.8)
  hemiLight.groundColor.setHSL(0.6, 1, 0.85)
  webgl.scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  // 0.6 is between cyan and blue
  dirLight.color.setHSL(0.6, 0.5, 0.9)
  dirLight.position.set(0, 1, 0.5)
  dirLight.position.multiplyScalar(50)
  dirLight.castShadow = true
  webgl.scene.add(dirLight)

  // higher values give better quality shadows
  dirLight.shadow.mapSize.width = 2 ** 11
  dirLight.shadow.mapSize.height = 2 ** 11

  // the size of the ortographic camera frustum
  // bigger means more diffuse shadows
  const size = 30
  dirLight.shadow.camera.left = -size
  dirLight.shadow.camera.right = size
  dirLight.shadow.camera.top = size
  dirLight.shadow.camera.bottom = -size

  // this reduces artifacts hopefully
  dirLight.shadow.bias = -0.0001

  if (window.DEBUG) {
    const dirLightHeper = new THREE.DirectionalLightHelper(dirLight, 3)
    webgl.scene.add(dirLightHeper)
  }
}
