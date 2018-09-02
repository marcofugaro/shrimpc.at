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
