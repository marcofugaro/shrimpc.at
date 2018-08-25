import * as THREE from 'three'
import CANNON from 'cannon'
import assets from 'lib/AssetManager'
import { range } from 'lodash'

// horizontal gap betwee the restricting planes
const HORIZONTAL_GAP = 2
// vertical gap betwee the restricting planes
const VERTICAL_GAP = 8

// how much to offset the shrimps begind the camera
const Z_OFFSET = -10

const shrimpObjKey = assets.queue({
  url: 'assets/shrimp.obj',
  type: 'objmtl',
})

// TODO test shadows
// sphere.castShadow = true; //default is false
// sphere.receiveShadow = false; //default

class Delimiter extends CANNON.Body {
  mesh = new THREE.Object3D()
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    if (window.DEBUG) {
      const geometry = new THREE.PlaneGeometry(12, 12)
      const material = new THREE.MeshLambertMaterial({
        color: Math.random() * 0xfffff,
        opacity: 0.5,
        transparent: true,
      })
      material.side = THREE.DoubleSide
      const groundMesh = new THREE.Mesh(geometry, material)
      this.mesh.add(groundMesh)

      // sync the mesh to the physical body
      // only once, no need to animate them
      this.mesh.position.copy(this.position)
      this.mesh.quaternion.copy(this.quaternion)
    }

    const groundShape = new CANNON.Plane()
    this.addShape(groundShape)
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }
}

class Shrimp extends CANNON.Body {
  // no need to handla position, velocity and acceleration,
  // CANNON.Body already has those

  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // const shrimpObj = assets.get(shrimpObjKey)
    //
    // // save the shrimp into the meshes
    // this.mesh.copy(shrimpObj)
    //
    // // save the shrimp into the bodies
    // shrimpObj.traverse(child => this.addShape(child))

    if (window.DEBUG) {
      const geometry = new THREE.CylinderGeometry(1, 1, 0.5, 32)
      const material = new THREE.MeshLambertMaterial({
        color: 0x0000ff,
        opacity: 0.7,
        transparent: true,
      })
      const cylinderMesh = new THREE.Mesh(geometry, material)
      this.mesh.add(cylinderMesh)
    }

    const shrimpShape = new CANNON.Cylinder(1, 1, 0.5, 32)
    this.addShape(shrimpShape)
  }

  update(dt = 0, time = 0) {
    // // detect the value of x when the object is not visible anymore.
    // // Calculate it only the first time, and save it for later
    // if (!this.webgl.world.screenLimitX) {
    //   const someChildIntersects = this.mesh.children.some(child =>
    //     this.webgl.camera.frustum.intersectsObject(child),
    //   )
    //
    //   if (this.position.x > 0 && !someChildIntersects) {
    //     // somehow the frustum doesn't stretch to the full
    //     // canvas, for this the magic number
    //     this.webgl.world.screenLimitX = this.position.x + this.position.x * 0.3
    //   }
    // } else {
    //   if (this.position.x > this.webgl.world.screenLimitX) {
    //     this.position.x = -this.position.x
    //     console.log('AYAYAYAYAYY')
    //   }
    // }

    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  // apply a force in its center of mass
  applyGenericForce(force) {
    this.applyLocalForce(force, new CANNON.Vec3())
  }

  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  drag(coefficient) {
    const speed = this.velocity.length()

    const dragMagnitude = coefficient * speed ** 2

    const drag = this.velocity.clone()
    drag.scale(-1, drag)

    drag.normalize()

    drag.scale(dragMagnitude, drag)

    this.applyGenericForce(drag)
  }
}

export default class Shrimps extends THREE.Object3D {
  SHRIMPS_NUMBER = 3
  shrimps = []
  delimiters = []

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // set the material of the shrimps to all the same
    const shrimpMaterial = new CANNON.Material('shrimp')
    // defines the interaction between two shrimp materials
    webgl.world.addContactMaterial(
      new CANNON.ContactMaterial(shrimpMaterial, shrimpMaterial, {
        friction: 3.4,
        restitution: 0.1,
      }),
    )

    // create the shrimps
    this.shrimps = range(0, this.SHRIMPS_NUMBER).map(i => {
      return new Shrimp({
        webgl,
        material: shrimpMaterial,
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        // move everything behind
        position: new CANNON.Vec3(i * 3, 0, Z_OFFSET),
        // put them vertical
        quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0),
      })
    })

    this.shrimps.forEach(shrimp => {
      // add the body to the cannon.js world
      webgl.world.addBody(shrimp)
      // and the mesh to the three.js scene
      this.add(shrimp.mesh)
    })

    // set the material of the delimiting planes
    const delimiterMaterial = new CANNON.Material('limiter')
    // defines the interaction between a shrimp and a delimiter
    webgl.world.addContactMaterial(
      new CANNON.ContactMaterial(shrimpMaterial, delimiterMaterial, {
        friction: 0,
        restitution: 0,
      }),
    )

    // create the delimiters
    this.delimiters = range(0, 4).map(i => {
      let position = new CANNON.Vec3()
      let quaternion = new CANNON.Quaternion()
      switch (i) {
        case 0:
          position.set(0, 0, Z_OFFSET - HORIZONTAL_GAP / 2)
          break
        case 1:
          position.set(0, 0, Z_OFFSET + HORIZONTAL_GAP / 2)
          quaternion.setFromEuler(-Math.PI, 0, 0)
          break
        case 2:
          position.set(0, VERTICAL_GAP / 2, Z_OFFSET)
          quaternion.setFromEuler(Math.PI / 2, 0, 0)
          break
        case 3:
          position.set(0, -VERTICAL_GAP / 2, Z_OFFSET)
          quaternion.setFromEuler(-Math.PI / 2, 0, 0)
          break
      }

      return new Delimiter({
        webgl,
        material: delimiterMaterial,
        type: CANNON.Body.DYNAMIC,
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

  update(dt = 0, time = 0) {
    // force moving the shrimp left
    this.shrimps[0].applyGenericForce(new CANNON.Vec3(1, 0, 0))
    this.shrimps[1].applyGenericForce(new CANNON.Vec3(0.5, 0, 0))
    this.shrimps[2].applyGenericForce(new CANNON.Vec3(0.2, 0, 0))

    // water drag force
    // this.shrimps.forEach(shrimp => shrimp.drag(1))
  }
}
