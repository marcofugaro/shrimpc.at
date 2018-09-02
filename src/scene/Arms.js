import * as THREE from 'three'
import CANNON from 'cannon'
import eases from 'eases'
import CannonSphere from 'lib/CannonSphere'
import Arm, { PAW_RADIUS, FOREARM_HEIGHT } from 'scene/Arm'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { mouseToCoordinates } from 'lib/three-utils'

export const armsCollisionId = 4

// Y of the hinge in a normal position
export const HINGE_REST_Y = -12

// Y of the hinge at its maximum smacking
export const HINGE_SMACK_Y = -5

// how long the smack animation lasts (s)
export const SMACK_DURATION = 0.5

// how much does the arm have to be close to its attractor
// to be registered as hit
export const SMACK_SUCCESSFULL_DISTANCE = 1.5

export default class Arms extends THREE.Object3D {
  rightArm
  // leftArm
  armAttractor
  hinge
  material = new CANNON.Material('arms')

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.rightArm = new Arm({
      webgl,
      material: this.material,
      // can only collide with shrimps (or itself)
      collisionFilterGroup: armsCollisionId,
      collisionFilterMask: shrimpsCollisionId | armsCollisionId,
      type: CANNON.Body.DYNAMIC,
      mass: 5,
      // simulate the water
      linearDamping: 0.9,
      angularDamping: 0.9,
    })

    this.hinge = new CannonSphere({
      webgl,
      radius: 1,
      mass: 0,
      type: CANNON.Body.DYNAMIC,
      // don't make it collide with anything
      collisionFilterMask: 0,
    })

    this.armAttractor = new CannonSphere({
      webgl,
      radius: 0.5,
      mass: 0,
      type: CANNON.Body.DYNAMIC,
      // don't make it collide with anything
      collisionFilterMask: 0,
    })

    // position them
    this.rightArm.position.set(-2, 3, 0)
    this.hinge.position.set(0, HINGE_REST_Y, 0)

    // Connect the arm to the hinge through 2 constraints
    const constraint = new CANNON.PointToPointConstraint(
      this.rightArm,
      new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, -1),
      this.hinge,
      new CANNON.Vec3(0, 0, -1),
    )
    const constraint2 = new CANNON.PointToPointConstraint(
      this.rightArm,
      new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, 1),
      this.hinge,
      new CANNON.Vec3(0, 0, 1),
    )
    webgl.world.addConstraint(constraint)
    webgl.world.addConstraint(constraint2)

    // setup the springs that will move the arm
    this.rightArmSpring = new CANNON.Spring(this.rightArm, this.armAttractor, {
      localAnchorA: new CANNON.Vec3(),
      localAnchorB: new CANNON.Vec3(),
      restLength: 0,
      stiffness: 50,
      damping: 1,
    })
    // this.leftArmSpring = new CANNON.Spring(this.leftArm, this.armAttractor, {
    //   localAnchorA: new CANNON.Vec3(),
    //   localAnchorB: new CANNON.Vec3(),
    //   restLength: 0,
    //   stiffness: 50,
    //   damping: 1,
    // })

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.rightArm)
    this.webgl.world.addBody(this.hinge)
    this.webgl.world.addBody(this.armAttractor)
    this.add(this.rightArm.mesh)
    this.add(this.hinge.mesh)
    // not this one, it will be added on click
    // this.add(this.armAttractor.mesh)
  }

  update(dt = 0, time = 0) {
    if (this.isAttractingRightArm) {
      this.rightArmSpring.applyForce()

      if (!this.smackStart) {
        this.smackStart = time
      }

      const elapsed = time - this.smackStart

      this.hinge.position.y = THREE.Math.lerp(
        HINGE_REST_Y,
        HINGE_SMACK_Y,
        eases.quadOut(elapsed / SMACK_DURATION),
      )

      const hasReachedTarget =
        this.armAttractor.position.distanceTo(this.rightArm.position) < SMACK_SUCCESSFULL_DISTANCE
      const hasFinishedAnimation = elapsed >= SMACK_DURATION
      if (hasReachedTarget || hasFinishedAnimation) {
        this.isAttractingRightArm = false
        if (window.DEBUG) this.remove(this.armAttractor.mesh)
        this.smackStart = null
      }
    }
    //
    // if (this.isAttractingLeftArm) {
    //   this.leftArmSpring.applyForce()
    //   if (this.armAttractor.position.distanceTo(this.leftArm.position) < 1.5) {
    //     this.isAttractingLeftArm = false
    //     this.remove(this.armAttractor.mesh)
    //   }
    // }
  }

  onTouchStart(event, [x, y]) {
    // stop other springs
    this.isAttractingRightArm = false
    this.isAttractingLeftArm = false

    // position the attractor (and show it if in debug)
    const clickedPoint = mouseToCoordinates({ x, y, targetZ: 0, webgl: this.webgl })
    this.armAttractor.position.copy(clickedPoint)
    if (window.DEBUG) this.add(this.armAttractor.mesh)

    // TODO figure out which arm is attracting
    this.isAttractingRightArm = true
  }
}
