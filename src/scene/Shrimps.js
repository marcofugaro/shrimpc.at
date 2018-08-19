import * as THREE from 'three'
import assets from 'lib/AssetManager'

const shrimpObjKey = assets.queue({
  url: 'assets/shrimp.obj',
  type: 'objmtl',
})

// TODO test shadows
// sphere.castShadow = true; //default is false
// sphere.receiveShadow = false; //default

class Shrimp extends THREE.Object3D {
  acceleration = new THREE.Vector3()
  velocity = new THREE.Vector3()

  constructor(webgl) {
    super()
    this.webgl = webgl

    const shrimpObj = assets.get(shrimpObjKey)

    this.copy(shrimpObj)
  }

  update(dt = 0, time = 0) {
    // detect the value of x when the object is not visible anymore.
    // Calculate it only the first time, and save it for later
    if (!this.parent.screenLimitX) {
      const someChildIntersects = this.children.some(child =>
        this.webgl.camera.frustum.intersectsObject(child),
      )
      if (this.position.x > 0 && !someChildIntersects) {
        // somehow the frustum doesn't stretch to the full
        // canvas, for this the magic number
        this.parent.screenLimitX = this.position.x + this.position.x * 0.3
      }
    } else {
      if (this.position.x > this.parent.screenLimitX) {
        this.position.x = -this.position.x
      }
    }

    this.velocity.add(this.acceleration)
    this.position.add(this.velocity)

    // reset the acceleration vector
    this.acceleration.multiplyScalar(0)
  }

  applyForce(force) {
    this.acceleration.add(force)
  }

  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  drag(coefficient) {
    const speed = this.velocity.length()
    const dragMagnitude = coefficient * speed ** 2

    const drag = this.velocity.clone()
    drag.multiplyScalar(-1)

    drag.normalize()

    drag.multiplyScalar(dragMagnitude)

    this.applyForce(drag)
  }
}

export default class Shrimps extends THREE.Object3D {
  constructor(webgl) {
    super()
    this.webgl = webgl

    // move everything behind
    this.position.z = -10

    this.shrimp = new Shrimp(this.webgl)
    this.add(this.shrimp)
  }

  update(dt = 0, time = 0) {
    // force moving the shrimp left
    this.shrimp.applyForce(new THREE.Vector3(0.01, 0, 0))
    this.shrimp.drag(1)
  }
}
