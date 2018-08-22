import * as THREE from 'three'
import CANNON from 'cannon'
import assets from 'lib/AssetManager'

const shrimpObjKey = assets.queue({
  url: 'assets/shrimp.obj',
  type: 'objmtl',
})

// TODO test shadows
// sphere.castShadow = true; //default is false
// sphere.receiveShadow = false; //default

class Shrimp extends CANNON.Body {
  // no need for position and velocity,
  // CANNON.body already has those
  acceleration = new CANNON.Vec3()

  mesh = new THREE.Object3D()

  constructor(webgl) {
    super()
    this.webgl = webgl

    // const shrimpObj = assets.get(shrimpObjKey)
    //
    // // save the shrimp into the meshes
    // this.mesh.copy(shrimpObj)
    //
    // // save the shrimp into the bodies
    // shrimpObj.traverse(child => this.addShape(child))

    // move everything behind
    this.position.z = -10

    const geometry = new THREE.CylinderGeometry(1, 1, 0.5, 32)
    const material = new THREE.MeshLambertMaterial({ color: 0x0000ff })
    const cylinderMesh = new THREE.Mesh(geometry, material)
    this.mesh.add(cylinderMesh)

    const cannonShape = new CANNON.Cylinder(5, 5, 2, 32)
    this.addShape(cannonShape)
  }

  update(dt = 0, time = 0) {
    // detect the value of x when the object is not visible anymore.
    // Calculate it only the first time, and save it for later
    if (!this.world.screenLimitX) {
      const someChildIntersects = this.mesh.children.some(child =>
        this.webgl.camera.frustum.intersectsObject(child),
      )

      if (this.position.x > 0 && !someChildIntersects) {
        // somehow the frustum doesn't stretch to the full
        // canvas, for this the magic number
        this.world.screenLimitX = this.position.x + this.position.x * 0.3
      }
    } else {
      if (this.position.x > this.world.screenLimitX) {
        this.position.x = -this.position.x
      }
    }

    this.velocity.vadd(this.acceleration, this.velocity)
    this.position.vadd(this.velocity, this.position)

    // reset the acceleration vector
    this.acceleration.scale(0, this.acceleration)

    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  // applyForce is already taken and is more specific
  applyGenericForce(force) {
    this.acceleration.vadd(force, this.acceleration)
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
  constructor(webgl) {
    super()
    this.webgl = webgl

    this.shrimp = new Shrimp(this.webgl)

    // add the body to the cannon.js world
    webgl.cannon.world.addBody(this.shrimp)
    // and the mesh to the three.js scene
    this.add(this.shrimp.mesh)
  }

  update(dt = 0, time = 0) {
    // force moving the shrimp left
    this.shrimp.applyGenericForce(new CANNON.Vec3(0.01, 0, 0))
    // water drag force
    this.shrimp.drag(1)
  }
}
