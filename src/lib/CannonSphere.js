import * as THREE from 'three'
import CANNON from 'cannon'

export default class CannonSphere extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, radius, ...options }) {
    super(options)
    this.webgl = webgl

    this.addShape(new CANNON.Sphere(radius))

    if (window.DEBUG) {
      this.mesh.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(radius, 32, 32),
          new THREE.MeshLambertMaterial({
            color: Math.random() * 0xffffff,
            opacity: 0.5,
            transparent: true,
            depthWrite: false,
          }),
        ),
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
