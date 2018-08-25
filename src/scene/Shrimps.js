import * as THREE from 'three'
import CANNON from 'cannon'
import assets from 'lib/AssetManager'
import { range, random } from 'lodash'

// horizontal gap betwee the restricting planes
const HORIZONTAL_GAP = 3
// vertical gap betwee the restricting planes
const VERTICAL_GAP = 8

// how much to offset the shrimps begind the camera
const Z_OFFSET = -10

// where the shrimps will die
const MAX_X_POSITION = 10

// the interval between the spawn of shrimps (seconds)
const SHRIMP_INTERVAL = 3

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
        depthWrite: false,
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
  // no need to handle position, velocity and acceleration,
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
      })
      const cylinderMesh = new THREE.Mesh(geometry, material)
      this.mesh.add(cylinderMesh)
    }

    const shrimpShape = new CANNON.Cylinder(1, 1, 0.5, 32)
    this.addShape(shrimpShape)
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  // apply a force in its center of mass
  applyGenericForce(force) {
    this.applyLocalForce(force, new CANNON.Vec3())
  }

  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  // (ended up not using this because it meeses up with the physics)
  // drag(coefficient) {
  //   const speed = this.velocity.length()
  //
  //   const dragMagnitude = coefficient * speed ** 2
  //
  //   const drag = this.velocity.clone()
  //   drag.multiplyScalar(-1)
  //
  //   drag.normalize()
  //
  //   drag.multiplyScalar(dragMagnitude)
  //
  //   this.applyGenericForce(drag)
  // }
}

export default class Shrimps extends THREE.Object3D {
  shrimps = []
  delimiters = []
  shrimpMaterial
  delimiterMaterial
  lastShrimpSpawn

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // set the material of the shrimps to all the same
    this.shrimpMaterial = new CANNON.Material('shrimp')
    // defines the interaction between two shrimp materials
    webgl.world.addContactMaterial(
      new CANNON.ContactMaterial(this.shrimpMaterial, this.shrimpMaterial, {
        friction: 4,
        restitution: 0.5,
      }),
    )

    // set the material of the delimiting planes
    this.delimiterMaterial = new CANNON.Material('delimiter')
    // defines the interaction between a shrimp and a delimiter
    webgl.world.addContactMaterial(
      new CANNON.ContactMaterial(this.shrimpMaterial, this.delimiterMaterial, {
        friction: 0,
        restitution: 1,
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
        material: this.delimiterMaterial,
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
    this.shrimps.forEach(shrimp => shrimp.applyGenericForce(new CANNON.Vec3(0.7, 0, 0)))

    // spawn new shrimps
    const seconds = Math.floor(time)
    if (seconds % SHRIMP_INTERVAL === 0 && seconds / SHRIMP_INTERVAL !== this.lastShrimpSpawn) {
      this.lastShrimpSpawn = seconds / SHRIMP_INTERVAL

      const shrimp = new Shrimp({
        webgl: this.webgl,
        material: this.shrimpMaterial,
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        // simulate the water
        linearDamping: 0.6,
        angularDamping: 0.6,
        angularVelocity: new CANNON.Vec3(0.3 * random(-1, 1), 0.3 * random(-1, 1), 0),
        // move everything behind
        position: new CANNON.Vec3(
          -MAX_X_POSITION,
          random(-(VERTICAL_GAP / 2) * 0.9, (VERTICAL_GAP / 2) * 0.9),
          Z_OFFSET,
        ),
        // put them vertical
        quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0),
      })

      // add the body to the cannon.js world
      this.webgl.world.addBody(shrimp)
      // and the mesh to the three.js scene
      this.add(shrimp.mesh)
      // save it
      this.shrimps.push(shrimp)
    }

    // remove if they exit the field of view
    this.shrimps.forEach(shrimp => {
      if (shrimp.position.x < -MAX_X_POSITION || MAX_X_POSITION < shrimp.position.x) {
        this.webgl.world.removeBody(shrimp)
        this.remove(shrimp.mesh)
        this.shrimps.splice(this.shrimps.findIndex(s => s.id === shrimp.id), 1)
      }
    })
  }
}
