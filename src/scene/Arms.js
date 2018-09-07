import * as THREE from 'three'
import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import CannonSphere from 'lib/CannonSphere'
import Arm, { PAW_RADIUS, FOREARM_HEIGHT } from 'scene/Arm'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { mouseToCoordinates } from 'lib/three-utils'

export const armsCollisionId = 4

// Y of the rightHinge in a normal position
export const HINGE_REST_Y = -12

// how long the smack animation lasts (ms)
export const SMACK_DURATION = 500

// how much does the arm have to be close to its attractor
// to be registered as hit
export const SMACK_SUCCESSFULL_DISTANCE = 1.5

// how much the attractor must wobble
export const SMACK_APERTURE = 3

export default class Arms extends THREE.Object3D {
  material = new CANNON.Material('arms')
  rightArm
  leftArm
  rightHinge
  leftHinge
  armAttractor

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const armOptions = {
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
    }
    this.rightArm = new Arm(armOptions)
    this.leftArm = new Arm(armOptions)

    const hingeOptions = {
      webgl,
      radius: 1,
      mass: 0,
      type: CANNON.Body.DYNAMIC,
      // don't make it collide with anything
      collisionFilterMask: 0,
    }
    this.rightHinge = new CannonSphere(hingeOptions)
    this.leftHinge = new CannonSphere(hingeOptions)

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
    this.leftArm.position.set(2, HINGE_REST_Y + FOREARM_HEIGHT * 1.9, 0)
    this.leftArm.quaternion.setFromEuler(0, Math.PI, 0)
    this.rightHinge.position.set(-2, HINGE_REST_Y, 0)
    this.leftHinge.position.set(2, HINGE_REST_Y, 0)

    // Connect the rightArm to the rightHinge through 2 constraints
    webgl.world.addConstraint(
      new CANNON.PointToPointConstraint(
        this.rightArm,
        new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, -1),
        this.rightHinge,
        new CANNON.Vec3(0, 0, -1),
      ),
    )
    webgl.world.addConstraint(
      new CANNON.PointToPointConstraint(
        this.rightArm,
        new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, 1),
        this.rightHinge,
        new CANNON.Vec3(0, 0, 1),
      ),
    )

    // Connect the leftArm to the leftHinge through 2 constraints
    webgl.world.addConstraint(
      new CANNON.PointToPointConstraint(
        this.leftArm,
        new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, -1),
        this.leftHinge,
        new CANNON.Vec3(0, 0, 1),
      ),
    )
    webgl.world.addConstraint(
      new CANNON.PointToPointConstraint(
        this.leftArm,
        new CANNON.Vec3(PAW_RADIUS * 1.5, -FOREARM_HEIGHT * 2, 1),
        this.leftHinge,
        new CANNON.Vec3(0, 0, -1),
      ),
    )

    // setup the springs that will move the arm
    this.rightArmSpring = new CANNON.Spring(this.rightArm, this.armAttractor, {
      localAnchorA: new CANNON.Vec3(),
      localAnchorB: new CANNON.Vec3(),
      restLength: 0,
      stiffness: 100,
      damping: 1,
    })
    this.leftArmSpring = new CANNON.Spring(this.leftArm, this.armAttractor, {
      localAnchorA: new CANNON.Vec3(),
      localAnchorB: new CANNON.Vec3(),
      restLength: 0,
      stiffness: 100,
      damping: 1,
    })

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.rightArm)
    this.webgl.world.addBody(this.rightHinge)
    this.webgl.world.addBody(this.leftArm)
    this.webgl.world.addBody(this.leftHinge)
    this.webgl.world.addBody(this.armAttractor)
    this.add(this.rightArm.mesh)
    this.add(this.rightHinge.mesh)
    this.add(this.leftArm.mesh)
    this.add(this.leftHinge.mesh)
    // not this one, it will be added on click
    // this.add(this.armAttractor.mesh)
  }

  update(dt = 0, time = 0) {
    TWEEN.update()

    if (this.isAttractingRightArm) {
      this.rightArmSpring.applyForce()
    }

    if (this.isAttractingLeftArm) {
      this.leftArmSpring.applyForce()
    }
  }

  onTouchStart(event, [x, y]) {
    // stop the old animations and attractions
    if (this.attractorTween) this.attractorTween.stop()
    if (this.hingeTween) this.hingeTween.stop()

    const clickedPoint = mouseToCoordinates({ x, y, targetZ: 0, webgl: this.webgl })

    // animate the attractor to simulate a smack
    this.startAttracting(clickedPoint)
    this.attractorTween = this.animateAttractor(clickedPoint)
      .start()
      .onStop(this.stopAttracting)
      .onComplete(this.stopAttracting)

    // SMACK!
    this.hingeTween = this.animateArmUp(clickedPoint)
      .start()
      .chain(this.animateArmBack())
  }

  animateArmUp = clickedPoint => {
    const hinge = this.isAttractingRightArm ? this.rightHinge : this.leftHinge

    return new TWEEN.Tween(hinge.position)
      .to(
        // TODO use a value proportional to the distance between the lickedPoint and the rightHinge
        { ...hinge.position, y: clickedPoint.y - VERTICAL_GAP + Math.abs(clickedPoint.x) * 0.5 },
        SMACK_DURATION,
      )
      .easing(TWEEN.Easing.Quadratic.In)
  }

  animateArmBack = () => {
    const hinge = this.isAttractingRightArm ? this.rightHinge : this.leftHinge

    return new TWEEN.Tween(hinge.position)
      .to({ ...hinge.position, y: HINGE_REST_Y }, SMACK_DURATION * 1.5)
      .easing(TWEEN.Easing.Quadratic.Out)
  }

  animateAttractor = clickedPoint => {
    let startX
    let endX
    if (clickedPoint.x > 0) {
      startX = clickedPoint.x + SMACK_APERTURE
      endX = clickedPoint.x - SMACK_APERTURE
    } else {
      startX = clickedPoint.x - SMACK_APERTURE
      endX = clickedPoint.x + SMACK_APERTURE
    }

    this.armAttractor.position.copy({ ...clickedPoint, x: startX })
    return new TWEEN.Tween(this.armAttractor.position)
      .to({ ...clickedPoint, x: endX }, SMACK_DURATION)
      .easing(t => (t <= 0.5 ? 0 : 1))
  }

  startAttracting = clickedPoint => {
    if (clickedPoint.x > 0) {
      this.isAttractingLeftArm = true
    } else {
      this.isAttractingRightArm = true
    }
    if (window.DEBUG) this.add(this.armAttractor.mesh)
  }

  stopAttracting = () => {
    this.isAttractingRightArm = false
    this.isAttractingLeftArm = false
    if (window.DEBUG) this.remove(this.armAttractor.mesh)
  }
}
