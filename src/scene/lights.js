import * as THREE from 'three'

export function addLights(webgl) {
  // turn on shadows
  // PERF disable because was lowering fps by too much
  if (webgl.gpu.tier > 0) {
    webgl.renderer.shadowMap.enabled = true
  }

  // soft shadows
  webgl.renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const hemiLight = new THREE.HemisphereLight(0x9fa0cc, 0x545e96, 0.76)
  webgl.scene.add(hemiLight)

  const dirLight = new THREE.DirectionalLight(0xe1e1f7, 0.92)
  dirLight.position.set(0, 1, 0.5)
  dirLight.position.multiplyScalar(50)
  dirLight.castShadow = true
  webgl.scene.add(dirLight)

  // higher values give better quality shadows
  // lower values give better performance
  dirLight.shadow.mapSize.width = 2 ** 10
  dirLight.shadow.mapSize.height = 2 ** 10

  // the size of the ortographic camera frustum
  // bigger means more diffuse shadows
  const size = 15
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
