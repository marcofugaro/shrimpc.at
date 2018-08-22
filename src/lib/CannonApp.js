import CANNON from 'cannon'

export default class CannonApp {
  constructor({ gravity = new CANNON.Vec3(0, -9.81, 0), ...options } = {}) {
    this.world = new CANNON.World({ gravity, ...options })
  }

  update(dt = 0, time = 0) {
    this.world.step(dt)

    // recursively tell all child bodies to update
    this.world.bodies.forEach(body => {
      if (typeof body.update === 'function') {
        body.update(dt, time)
      }
    })

    return this
  }
}
