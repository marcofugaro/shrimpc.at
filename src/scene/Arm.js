import * as THREE from 'three'
import CANNON from 'cannon'
import { getRandomTransparentColor } from 'lib/three-utils'

export const PAW_RADIUS = 1
export const FOREARM_HEIGHT = 4
export const FOREARM_WIDTH = 0.9

export default class Arm extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // ⚠️ Warning! order of creation is important!
    const hand = new CANNON.Sphere(PAW_RADIUS)
    this.addShape(hand, new CANNON.Vec3(0, 0, 0))

    const forearm = new CANNON.Cylinder(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32)
    this.addShape(forearm, new CANNON.Vec3(0, -FOREARM_HEIGHT / 2, 0))

    const arm = new CANNON.Cylinder(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32)
    this.addShape(
      arm,
      new CANNON.Vec3(0.7, -(FOREARM_HEIGHT / 2 + FOREARM_HEIGHT) * 0.95, 0),
      new CANNON.Quaternion().setFromEuler(0, 0, THREE.Math.degToRad(20)),
    )

    if (window.DEBUG) {
      const color = getRandomTransparentColor()

      const handMesh = new THREE.Mesh(
        new THREE.SphereGeometry(hand.radius, 32, 32),
        new THREE.MeshLambertMaterial(color),
      )
      this.mesh.add(handMesh)

      const forearmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32),
        new THREE.MeshLambertMaterial(color),
      )
      this.mesh.add(forearmMesh)

      const armMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32),
        new THREE.MeshLambertMaterial(color),
      )
      this.mesh.add(armMesh)

      // sync the shapes to their meshes
      this.mesh.children.forEach((mesh, i) => {
        const position = this.shapeOffsets[i]
        const quaternion = this.shapeOrientations[i]
        mesh.position.copy(position)
        mesh.quaternion.copy(quaternion)
      })
    }
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }
}
