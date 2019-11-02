import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import Shrimp from './Shrimp'
import { shrimpCollision } from './collisions'
import { VERTICAL_GAP } from './Delimiters'
import assets from '../lib/AssetManager'

// the interval between the spawn of shrimps (seconds)
export let SPAWN_INTERVAL = 4

export default class Shrimps extends THREE.Object3D {
  shrimps = []
  spawnInterval = SPAWN_INTERVAL

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.webgl.controls.$onChanges(() => {
      this.spawnInterval = this.webgl.controls.spawnInterval
    })

    // not loaded with the other assets because
    // it's not needed immediately
    assets.loadSingle({
      url: 'assets/sounds/fryingsound_lowpass.mp3',
      type: 'audio',
      renderer: webgl.renderer,
    })
  }

  update(dt = 0, time = 0) {
    const maxX = this.webgl.frustumSize.width / 2
    const maxY = this.webgl.frustumSize.height / 2

    // spawn new shrimps
    if (!this.lastSpawnTimestamp || time - this.lastSpawnTimestamp > this.spawnInterval) {
      this.lastSpawnTimestamp = time
      const { spawnInterval } = this.webgl.controls
      this.spawnInterval = _.random(spawnInterval * 0.1, spawnInterval)

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
        shrimp.mesh.traverse(child => {
          // remove the bubbles
          if (child.bubble) {
            requestAnimationFrame(() => {
              this.webgl.scene.remove(child.bubble)
            })
          }
        })

        this.webgl.world.removeBody(shrimp)
        this.remove(shrimp.mesh)
        this.shrimps.splice(this.shrimps.findIndex(s => s.id === shrimp.id), 1)
      }
    })
  }
}
