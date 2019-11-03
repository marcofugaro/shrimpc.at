import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import { delimiterCollision } from './collisions'
import { getRandomTransparentColor } from '../lib/three-utils'

// horizontal gap between the restricting planes
export const HORIZONTAL_GAP = 2.2
// vertical gap between the restricting planes
export const VERTICAL_GAP = 12

class Delimiter extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const groundShape = new CANNON.Plane()
    this.addShape(groundShape)

    // if (window.DEBUG) {
    //   const geometry = new THREE.PlaneGeometry(12, 12)
    //   const material = new THREE.MeshLambertMaterial(getRandomTransparentColor())
    //   material.side = THREE.DoubleSide
    //   const groundMesh = new THREE.Mesh(geometry, material)
    //   this.mesh.add(groundMesh)

    //   // sync the mesh to the physical body
    //   // only once, no need to animate them
    //   this.mesh.position.copy(this.position)
    //   this.mesh.quaternion.copy(this.quaternion)
    // }
  }
}

export default class Delimiters extends THREE.Group {
  delimiters = []

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // create the delimiters
    this.delimiters = _.range(0, 4).map(i => {
      let position = new CANNON.Vec3()
      let quaternion = new CANNON.Quaternion()
      switch (i) {
        // in the back
        case 0:
          position.set(0, 0, -HORIZONTAL_GAP / 2)
          break
        // in the front
        case 1:
          position.set(0, 0, HORIZONTAL_GAP / 2)
          quaternion.setFromEuler(-Math.PI, 0, 0)
          break
        // up
        case 2:
          position.set(0, VERTICAL_GAP / 2, 0)
          quaternion.setFromEuler(Math.PI / 2, 0, 0)
          break
        // down
        case 3:
          position.set(0, -VERTICAL_GAP / 2, 0)
          quaternion.setFromEuler(-Math.PI / 2, 0, 0)
          break
      }

      return new Delimiter({
        webgl,
        material: delimiterCollision.material,
        collisionFilterGroup: delimiterCollision.id,
        collisionFilterMask: delimiterCollision.collideWith,
        mass: 0,
        position,
        quaternion,
      })
    })

    this.delimiters.forEach(delimiter => {
      // add the body to the cannon.js world
      webgl.world.addBody(delimiter)
      // and the mesh to the three.js scene
      this.add(delimiter.mesh)
    })
  }
}
