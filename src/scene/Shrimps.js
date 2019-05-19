import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import Shrimp from 'scene/Shrimp'
import { shrimpCollision } from 'scene/collisions'
import { VERTICAL_GAP } from 'scene/Delimiters'

// the interval between the spawn of shrimps (seconds)
export let SHRIMP_INTERVAL = 4

export default class Shrimps extends THREE.Object3D {
  shrimps = []
  shrimpInterval = SHRIMP_INTERVAL

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    if (window.DEBUG) {
      this.webgl.panel.on('input', inputs => {
        SHRIMP_INTERVAL = inputs['Shrimp Spawn Interval']
        this.shrimpInterval = SHRIMP_INTERVAL
      })
    }
  }

  update(dt = 0, time = 0) {
    const maxX = this.webgl.frustumSize.width / 2

    // spawn new shrimps
    if (!this.lastSpawnTimestamp || time - this.lastSpawnTimestamp > this.shrimpInterval) {
      this.lastSpawnTimestamp = time
      this.shrimpInterval = _.random(SHRIMP_INTERVAL * 0.1, SHRIMP_INTERVAL)

      const shrimp = new Shrimp({
        webgl: this.webgl,
        material: shrimpCollision.material,
        collisionFilterGroup: shrimpCollision.id,
        collisionFilterMask: shrimpCollision.collideWith,
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        // simulate the water
        angularDamping: 0.98,
        // movement damping is handled by the drag force
        // linearDamping: 0.98,
        position: new CANNON.Vec3(
          // a bit left and right
          _.random(-maxX, maxX * 0.3),
          // up the visible frustum
          (VERTICAL_GAP / 2) * 1.2,
          0,
        ),
        // orient them randomly
        quaternion: new CANNON.Quaternion().setFromEuler(
          0,
          _.random(0, Math.PI),
          _.random(0, Math.PI),
        ),
      })

      // give them a push down!
      shrimp.applyGenericImpulse(new CANNON.Vec3(0, -100, 0))

      // add the body to the cannon.js world
      this.webgl.world.addBody(shrimp)
      // and the mesh to the three.js scene
      this.add(shrimp.mesh)
      // save it
      this.shrimps.push(shrimp)
    }

    this.shrimps.forEach(shrimp => {
      // apply a quadratic drag force to simulate water
      shrimp.applyDrag(0.8)

      // the force moving the shrimp left
      shrimp.applyGenericForce(new CANNON.Vec3(0.6, 0, 0))

      // remove it if they exit the field of view
      if (maxX * 1.3 < shrimp.position.x) {
        this.webgl.world.removeBody(shrimp)
        shrimp.mesh.traverse(child => {
          if (child.isMesh) {
            child.material.dispose()
            child.geometry.dispose()
          }
        })
        this.remove(shrimp.mesh)
        this.shrimps.splice(this.shrimps.findIndex(s => s.id === shrimp.id), 1)
      }
    })
  }
}
