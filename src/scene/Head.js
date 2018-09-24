import * as THREE from 'three'
import CANNON from 'cannon'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { armsCollisionId } from 'scene/Arms'

export const headCollisionId = 8

export const HEAD_RADIUS = 2

class Head extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const head = new CANNON.Sphere(HEAD_RADIUS)
    this.addShape(head)

    if (window.DEBUG) {
      this.mesh.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(head.radius, 32, 32),
          new THREE.MeshLambertMaterial({
            color: 0xff0000,
          }),
        ),
      )
    }
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }
}

export default class HeadComponent extends THREE.Object3D {
  material = new CANNON.Material('head')
  head

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.head = new Head({
      webgl,
      material: this.material,
      // can only collide with shrimps or arms
      collisionFilterGroup: headCollisionId,
      collisionFilterMask: shrimpsCollisionId | armsCollisionId,
      type: CANNON.Body.STATIC,
      mass: 5,
      // simulate the water
      linearDamping: 0.99,
      angularDamping: 0.99,
    })

    // position it
    this.head.position.set(0, -VERTICAL_GAP / 2, 0)

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.head)
    this.add(this.head.mesh)
  }
}
