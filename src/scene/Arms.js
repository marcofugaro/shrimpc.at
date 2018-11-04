import * as THREE from 'three'
import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import CannonSphere from 'lib/CannonSphere'
import Arm, { PAW_RADIUS, FOREARM_HEIGHT } from 'scene/Arm'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { mouseToCoordinates } from 'lib/three-utils'
import assets from 'lib/AssetManager'

// must be powers of 2!
export const armsCollisionId = 2

// Y of the rightHinge in a normal position
export const HINGE_REST_Y = -12

// X space between the arms
export const ARMS_SPACE = 7

// how long the smack animation lasts (ms)
export const SMACK_DURATION = 500

// how much does the arm have to be close to its attractor
// to be registered as hit
export const SMACK_SUCCESSFULL_DISTANCE = 1.5

// how much the attractor must wobble
export const SMACK_APERTURE = 3

const rightArmSpriteKey = assets.queue({
  url: 'assets/cat-right-arm.png',
  type: 'texture',
})

const leftArmSpriteKey = assets.queue({
  url: 'assets/cat-left-arm.png',
  type: 'texture',
})

export default class Arms extends THREE.Object3D {
  material = new CANNON.Material('arms')
  rightArm
  leftArm
  rightHinge
  leftHinge
  rightArmAttractor
  leftArmAttractor

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
    this.rightArm = new Arm({
      ...armOptions,
      sprite: assets.get(rightArmSpriteKey),
      spriteCenter: { x: 0.31, y: 0.9 },
      rotationFactor: 1,
    })
    this.leftArm = new Arm({
      ...armOptions,
      sprite: assets.get(leftArmSpriteKey),
      spriteCenter: { x: (1 - 0.31) * 0.97, y: 0.9 },
      rotationFactor: -1,
    })

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

    const armAttractorOptions = {
      webgl,
      radius: 0.5,
      mass: 0,
      type: CANNON.Body.DYNAMIC,
      // don't make it collide with anything
      collisionFilterMask: 0,
    }
    this.rightArmAttractor = new CannonSphere(armAttractorOptions)
    this.leftArmAttractor = new CannonSphere(armAttractorOptions)

    // position them
    this.rightArm.position.set(-ARMS_SPACE / 2, HINGE_REST_Y + FOREARM_HEIGHT * 1.9, 0)
    this.leftArm.position.set(ARMS_SPACE / 2, HINGE_REST_Y + FOREARM_HEIGHT * 1.9, 0)
    this.leftArm.quaternion.setFromEuler(0, Math.PI, 0)
    this.rightHinge.position.set(-ARMS_SPACE / 2, HINGE_REST_Y, 0)
    this.leftHinge.position.set(ARMS_SPACE / 2, HINGE_REST_Y, 0)
    this.rightArmAttractor.position.copy(this.rightArm.position)
    this.leftArmAttractor.position.copy(this.leftArm.position)

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
    this.rightArmSpring = new CANNON.Spring(this.rightArm, this.rightArmAttractor, {
      localAnchorA: new CANNON.Vec3(),
      localAnchorB: new CANNON.Vec3(),
      restLength: 0,
      stiffness: 120,
      damping: 1,
    })
    this.leftArmSpring = new CANNON.Spring(this.leftArm, this.leftArmAttractor, {
      localAnchorA: new CANNON.Vec3(),
      localAnchorB: new CANNON.Vec3(),
      restLength: 0,
      stiffness: 120,
      damping: 1,
    })

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.rightArm)
    this.webgl.world.addBody(this.rightHinge)
    this.webgl.world.addBody(this.leftArm)
    this.webgl.world.addBody(this.leftHinge)
    this.webgl.world.addBody(this.rightArmAttractor)
    this.webgl.world.addBody(this.leftArmAttractor)
    this.add(this.rightArm.mesh)
    this.add(this.rightHinge.mesh)
    this.add(this.leftArm.mesh)
    this.add(this.leftHinge.mesh)
    this.add(this.rightArmAttractor.mesh)
    this.add(this.leftArmAttractor.mesh)
  }

  update(dt = 0, time = 0) {
    TWEEN.update()

    // always attract the arm and sync with its y position
    this.rightArmSpring.applyForce()
    this.rightArmAttractor.position.y = this.rightArm.position.y
    this.leftArmSpring.applyForce()
    this.leftArmAttractor.position.y = this.leftArm.position.y
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
    let attractor
    if (clickedPoint.x > 0) {
      startX = clickedPoint.x + SMACK_APERTURE
      endX = clickedPoint.x - SMACK_APERTURE
      attractor = this.leftArmAttractor
    } else {
      startX = clickedPoint.x - SMACK_APERTURE
      endX = clickedPoint.x + SMACK_APERTURE
      attractor = this.rightArmAttractor
    }

    attractor.position.x = startX
    return new TWEEN.Tween(attractor.position)
      .to({ x: endX }, SMACK_DURATION)
      .easing(t => (t <= 0.5 ? 0 : 1))
  }

  startAttracting = clickedPoint => {
    if (clickedPoint.x > 0) {
      this.isAttractingLeftArm = true
    } else {
      this.isAttractingRightArm = true
    }
  }

  stopAttracting = () => {
    this.isAttractingRightArm = false
    this.isAttractingLeftArm = false

    // reset the arm attractor position
    // to keep the arms in place
    // TODO do one arm at a time
    this.rightArmAttractor.position.x = -ARMS_SPACE / 2
    this.leftArmAttractor.position.x = ARMS_SPACE / 2

    this.rightArmSpring.stiffness *= 0.3333
    this.leftArmSpring.stiffness *= 0.3333
    if (window.DEBUG) this.remove(this.rightArmAttractor.mesh)
    if (window.DEBUG) this.remove(this.leftArmAttractor.mesh)
    setTimeout(() => {
      this.rightArmSpring.stiffness *= 3
      this.leftArmSpring.stiffness *= 3
      if (window.DEBUG) this.add(this.rightArmAttractor.mesh)
      if (window.DEBUG) this.add(this.leftArmAttractor.mesh)
    }, SMACK_DURATION * 0.9)
  }
}
