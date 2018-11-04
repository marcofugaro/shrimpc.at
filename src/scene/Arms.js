import * as THREE from 'three'
import CANNON from 'cannon'
import TWEEN from '@tweenjs/tween.js'
import Arm from 'scene/Arm'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { mouseToCoordinates } from 'lib/three-utils'
import assets from 'lib/AssetManager'

// must be powers of 2!
export const armsCollisionId = 2

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

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // CREATE THE ARMS
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
      way: -1,
    })
    this.leftArm = new Arm({
      ...armOptions,
      sprite: assets.get(leftArmSpriteKey),
      spriteCenter: { x: (1 - 0.31) * 0.97, y: 0.9 },
      way: 1,
    })

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.rightArm)
    this.webgl.world.addBody(this.leftArm)
    this.add(this.rightArm.mesh)
    this.add(this.leftArm.mesh)

    // do it also for the arms children
    this.webgl.world.addBody(this.rightArm.hinge)
    this.webgl.world.addBody(this.rightArm.attractor)
    this.webgl.world.addBody(this.leftArm.hinge)
    this.webgl.world.addBody(this.leftArm.attractor)
    this.add(this.rightArm.hinge.mesh)
    this.add(this.rightArm.attractor.mesh)
    this.add(this.leftArm.hinge.mesh)
    this.add(this.leftArm.attractor.mesh)
  }

  onTouchStart(event, [x, y]) {
    const clickedPoint = mouseToCoordinates({ x, y, targetZ: 0, webgl: this.webgl })

    const arm = clickedPoint.x > 0 ? this.leftArm : this.rightArm

    arm.smack(clickedPoint)
    arm.leap(clickedPoint)
  }
}
