import * as THREE from 'three'

// gets 3d position of the mouse click based on the targetZ parameter
export function mouseToCoordinates({ x, y, targetZ, webgl }) {
  const vec = new THREE.Vector3()
  const pos = new THREE.Vector3()

  vec.set((x / webgl.width) * 2 - 1, -(y / webgl.height) * 2 + 1, 0.5)

  vec.unproject(webgl.camera)

  vec.sub(webgl.camera.position).normalize()

  const distance = (targetZ - webgl.camera.position.z) / vec.z

  pos.copy(webgl.camera.position).add(vec.multiplyScalar(distance))

  return pos
}

export function getRandomTransparentColor(opacity = 0.5) {
  return {
    color: Math.random() * 0xfffff,
    transparent: true,
    opacity,
    depthWrite: false,
  }
}

// the dimensions of a slice of the furstum, at a distance from the camera
export function getFrustumSliceSize({ camera, distance }) {
  const height = Math.tan(((camera.fov * Math.PI) / 180) * 0.5) * distance * 2
  const width = height * camera.aspect

  return { width, height }
}
