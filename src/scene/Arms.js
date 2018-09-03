import * as THREE from 'three'
import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import delay from 'delay'
import CannonSphere from 'lib/CannonSphere'
import Arm, { PAW_RADIUS, FOREARM_HEIGHT } from 'scene/Arm'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { mouseToCoordinates } from 'lib/three-utils'

export const armsCollisionId = 4

// Y of the hinge in a normal position
export const HINGE_REST_Y = -12

// how long the smack animation lasts (ms)
export const SMACK_DURATION = 500

// how much does the arm have to be close to its attractor
// to be registered as hit
export const SMACK_SUCCESSFULL_DISTANCE = 1.5

export default class Arms extends THREE.Object3D {
  rightArm
  // leftArm
  armAttractor
  hinge
  hingeTween = new TWEEN.Tween()
  attractorTween = new TWEEN.Tween()
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
      linearDamping: 0.99,
      angularDamping: 0.99,
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
    this.rightArm.position.set(-2, HINGE_REST_Y + FOREARM_HEIGHT * 1.9, 0)
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
      stiffness: 100,
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
    TWEEN.update()

    if (this.isAttractingRightArm) {
      this.rightArmSpring.applyForce()

      // const hasReachedTarget =
      //   this.armAttractor.position.distanceTo(this.rightArm.position) < SMACK_SUCCESSFULL_DISTANCE
      //
      // if (hasReachedTarget) {
      //   this.moveArmBack()
      // }
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
    this.armAttractor.position.copy({ ...clickedPoint, x: clickedPoint.x - 3 })
    if (window.DEBUG) this.add(this.armAttractor.mesh)

    // move the attractor to simulate a smack
    this.attractorTween = new TWEEN.Tween(this.armAttractor.position)
      .to({ ...clickedPoint, x: clickedPoint.x + 3 }, SMACK_DURATION)
      .easing(t => (t < 0.5 ? 0 : 1))
      .start()

    // attract the arm
    // TODO figure out which arm is attracting
    this.isAttractingRightArm = true

    // move up the arm
    this.hingeTween = new TWEEN.Tween(this.hinge.position)
      .to(
        // TODO use a value proportional to the distance between the lickedPoint and the hinge
        { x: 0, y: clickedPoint.y - VERTICAL_GAP + Math.abs(clickedPoint.x) * 0.5, z: 0 },
        SMACK_DURATION,
      )
      .easing(TWEEN.Easing.Quadratic.In)
      .start()
      .onComplete(async ({ y }) => {
        if (y === HINGE_REST_Y) {
          return
        }

        // TWEEN.js needs to be called not syncronously after
        await delay(0)

        this.moveArmBack()
      })
  }

  moveArmBack() {
    this.isAttractingRightArm = false
    if (window.DEBUG) this.remove(this.armAttractor.mesh)
    this.hingeTween
      .to({ x: 0, y: HINGE_REST_Y, z: 0 }, SMACK_DURATION * 1.5)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
  }
}
