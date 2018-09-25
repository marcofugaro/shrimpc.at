import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from 'lib/AssetManager'
import { VERTICAL_GAP, delimitersCollisionId } from 'scene/Delimiters'
import { armsCollisionId } from 'scene/Arms'
import { headCollisionId } from 'scene/Head'

// where the shrimps will die
export const MAX_X_POSITION = 10

// the interval between the spawn of shrimps (seconds)
export let SHRIMP_INTERVAL = 3

export const shrimpsCollisionId = 1

const shrimpObjKey = assets.queue({
  url: 'assets/shrimp.obj',
  type: 'objmtl',
})

// TODO test shadows
// sphere.castShadow = true; //default is false
// sphere.receiveShadow = false; //default

class Shrimp extends CANNON.Body {
  // no need to handle position, velocity and acceleration,
  // CANNON.Body already has those

  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const shrimpObj = assets.get(shrimpObjKey)
    this.mesh.copy(shrimpObj)

    const shrimpShape = new CANNON.Cylinder(1, 1, 0.5, 32)
    this.addShape(shrimpShape)

    if (window.DEBUG) {
      const geometry = new THREE.CylinderGeometry(1, 1, 0.5, 32)
      const material = new THREE.MeshLambertMaterial({
        color: 0x0000ff,
        opacity: 0.5,
      })
      const cylinderMesh = new THREE.Mesh(geometry, material)
      this.mesh.add(cylinderMesh)
    }
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
  material = new CANNON.Material('shrimp')

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    if (window.DEBUG) {
      this.webgl.panel.on('input', inputs => {
        SHRIMP_INTERVAL = inputs['Shrimp Spawn Interval']
      })
    }
  }

  update(dt = 0, time = 0) {
    // spawn new shrimps
    if (!this.lastSpawnTimestamp || time - this.lastSpawnTimestamp > SHRIMP_INTERVAL) {
      this.lastSpawnTimestamp = time

      const shrimp = new Shrimp({
        webgl: this.webgl,
        material: this.material,
        // can collide with both arms and walls (and itself)
        collisionFilterGroup: shrimpsCollisionId,
        collisionFilterMask:
          armsCollisionId | delimitersCollisionId | shrimpsCollisionId | headCollisionId,
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        // simulate the water
        linearDamping: 0.8,
        angularDamping: 0.8,
        // move them around a bit
        angularVelocity: new CANNON.Vec3(0.3 * _.random(-1, 1), 0.3 * _.random(-1, 1), 0),
        position: new CANNON.Vec3(
          -MAX_X_POSITION,
          _.random(-(VERTICAL_GAP / 2) * 0.9, (VERTICAL_GAP / 2) * 0.9),
          0,
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

    // the force moving the shrimp left
    this.shrimps.forEach(shrimp => shrimp.applyGenericForce(new CANNON.Vec3(0.7, 0, 0)))
  }
}
