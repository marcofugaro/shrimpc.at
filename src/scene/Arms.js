import * as THREE from 'three'
import CANNON from 'cannon'
import { shrimpsCollisionId } from 'scene/Shrimps'

export const armsCollisionId = 4

class RightArm extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const sphereRadius = 1.1
    const cylinderHeight = 5
    const cylinderWidth = 1

    // Warning! order of creation is important!
    const hand = new CANNON.Sphere(sphereRadius)
    this.addShape(hand, new CANNON.Vec3(0, 0, 0))

    const forearm = new CANNON.Cylinder(cylinderWidth, cylinderWidth, cylinderHeight, 32)
    this.addShape(forearm, new CANNON.Vec3(0, -cylinderHeight / 2, 0))

    const arm = new CANNON.Cylinder(cylinderWidth, cylinderWidth, cylinderHeight, 32)
    this.addShape(
      arm,
      new CANNON.Vec3(0.9, -(cylinderHeight / 2 + cylinderHeight) * 0.95, 0),
      new CANNON.Quaternion().setFromEuler(0, 0, THREE.Math.degToRad(20)),
    )

    if (window.DEBUG) {
      const handMesh = new THREE.Mesh(
        new THREE.SphereGeometry(hand.radius, 32, 32),
        new THREE.MeshLambertMaterial({
          color: 0xff0000,
        }),
      )
      this.mesh.add(handMesh)

      const forearmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(cylinderWidth, cylinderWidth, cylinderHeight, 32),
        new THREE.MeshLambertMaterial({
          color: 0xff0000,
        }),
      )
      this.mesh.add(forearmMesh)

      const armMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(cylinderWidth, cylinderWidth, cylinderHeight, 32),
        new THREE.MeshLambertMaterial({
          color: 0xff0000,
        }),
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

export default class Arms extends THREE.Object3D {
  rightArm
  leftArm
  material = new CANNON.Material('arms')

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.rightArm = new RightArm({
      webgl,
      material: this.material,
      // can only collide with shrimps (or itself)
      collisionFilterGroup: armsCollisionId,
      collisionFilterMask: shrimpsCollisionId | armsCollisionId,
      type: CANNON.Body.DYNAMIC,
      mass: 5,
    })

    // add the body to the cannon.js world
    this.webgl.world.addBody(this.rightArm)
    // and the mesh to the three.js scene
    this.add(this.rightArm.mesh)
  }
}
