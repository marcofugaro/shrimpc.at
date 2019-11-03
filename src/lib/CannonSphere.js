import * as THREE from 'three'
import CANNON from 'cannon'
import { getRandomTransparentColor } from './three-utils'
import CannonSuperBody from './CannonSuperBody'

export default class CannonSphere extends CannonSuperBody {
  mesh = new THREE.Object3D()

  constructor({ webgl, radius, ...options }) {
    super(options)
    this.webgl = webgl

    this.addShape(new CANNON.Sphere(radius))

    if (window.DEBUG) {
      this.mesh.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(radius, 32, 32),
          new THREE.MeshLambertMaterial(getRandomTransparentColor())
        )
      )
    }

    // sync the position the first time
    this.update()
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }
}
