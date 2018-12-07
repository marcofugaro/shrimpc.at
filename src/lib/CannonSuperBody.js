import CANNON from 'cannon'

// extends the cannon.js body class and
// adds more utility methods

export default class CannonSuperBody extends CANNON.Body {
  // apply a force in its center of mass
  applyGenericForce(force) {
    const centerInWorldCoords = this.pointToWorldFrame(new CANNON.Vec3())
    this.applyForce(force, centerInWorldCoords)
  }

  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  applyDrag(coefficient) {
    const speed = this.velocity.length()

    const dragMagnitude = coefficient * speed ** 2

    const drag = this.velocity.clone()
    drag.scale(-1, drag)

    drag.normalize()

    drag.scale(dragMagnitude, drag)

    this.applyGenericForce(drag)
  }
}
