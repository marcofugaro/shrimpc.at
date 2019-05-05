import * as THREE from 'three'
import CANNON from 'cannon'
import { bubbleCollision } from 'scene/collisions'
import CannonSphere from 'lib/CannonSphere'

export default class Bubble extends CannonSphere {
  constructor({ webgl, ...options }) {
    super({
      webgl,
      ...options,
      material: bubbleCollision.material,
      collisionFilterGroup: bubbleCollision.id,
      collisionFilterMask: bubbleCollision.collideWith,
      type: CANNON.Body.DYNAMIC,
      mass: 0.1,
      // simulate the water
      angularDamping: 0.98,
      // movement damping is handled by the drag force
      // linearDamping: 0.98,
      radius: 0.1,
    })
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)

    // apply a quadratic drag force to simulate water
    this.applyDrag(0.8)
    // the force moving the bubble up
    this.applyGenericForce(new CANNON.Vec3(0, 0.8, 0))
    // // remove it if they exit the field of view
    // if (maxX * 1.3 < shrimp.position.x) {
    //   this.webgl.world.removeBody(shrimp)
    //   this.remove(shrimp.mesh)
    //   this.shrimps.splice(this.shrimps.findIndex(s => s.id === shrimp.id), 1)
    // }
  }
}
