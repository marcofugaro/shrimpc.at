import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import { headCollision } from 'scene/collisions'
import { getRandomTransparentColor } from 'lib/three-utils'
import assets from 'lib/AssetManager'
import { mapRange, degToRad, lerp } from 'canvas-sketch-util/math'
import eases from 'eases'

export const HEAD_RADIUS = 2.5
export const CAT_OFFSET_Y = 4

// unit is degrees
export const MAX_HEAD_ROTATION_X = 23
export const MAX_HEAD_ROTATION_Y = 33

const catHeadKey = assets.queue({
  url: 'assets/cat-head.png',
  type: 'texture',
})

const catHeadDisplacementKey = assets.queue({
  url: 'assets/cat-head-displacement.png',
  type: 'texture',
})

class Head extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const head = new CANNON.Sphere(HEAD_RADIUS)
    this.addShape(head)

    const headMaterial = new THREE.MeshStandardMaterial({
      displacementMap: assets.get(catHeadDisplacementKey),
      displacementScale: 1.2,

      metalness: 0,
      roughness: 1,

      map: assets.get(catHeadKey),

      depthTest: !window.DEBUG,
      transparent: true,
    })

    const headGeometry = new THREE.PlaneGeometry(HEAD_RADIUS * 2, HEAD_RADIUS * 2, 32, 32)

    const headMesh = new THREE.Mesh(headGeometry, headMaterial)

    // position it
    headMesh.scale.setScalar(1.5)
    headMesh.position.y = 1
    headMesh.position.z = 0.01

    this.mesh.add(headMesh)

    if (window.DEBUG) {
      this.mesh.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(head.radius, 32, 32),
          new THREE.MeshLambertMaterial(getRandomTransparentColor()),
        ),
      )
    }
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }
}

export default class HeadComponent extends THREE.Object3D {
  head
  rotationX = 0
  rotationY = 0

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.head = new Head({
      webgl,
      material: headCollision.material,
      collisionFilterGroup: headCollision.id,
      collisionFilterMask: headCollision.collideWith,
      type: CANNON.Body.KINEMATIC,
      mass: 5,
    })

    // position it
    this.head.position.set(0, -CAT_OFFSET_Y * 1.22, 0)
    this.rotationY = -MAX_HEAD_ROTATION_Y * 0.6

    // save it for later
    this.initialY = this.head.position.y

    // if nothing happens after some seconds look at shrimp
    this.startLookingDebounced()

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.head)
    this.add(this.head.mesh)
  }

  onTouchMove(e, [x, y]) {
    this.stopLooking()

    this.rotationX = mapRange(x, 0, this.webgl.width, -MAX_HEAD_ROTATION_X, MAX_HEAD_ROTATION_X)
    this.rotationY = mapRange(
      y,
      0,
      this.webgl.height,
      -MAX_HEAD_ROTATION_Y,
      // the magic number is because the head is not
      // at the center of the page
      MAX_HEAD_ROTATION_Y * 0.18,
    )
  }

  update(dt = 0, time = 0) {
    // animate the looking at the shrimp
    if (this.shrimpLookingAt) {
      this.lookAtShrimp(dt, time)
    }

    // breathe.
    this.head.position.y = this.initialY + Math.sin(Number(time)) * 0.07

    // follow the rotation but with a bit of lerping
    this.lerpRotation(dt, time)
  }

  startLooking() {
    const shrimps = this.webgl.scene.shrimps.shrimps
    const shrimp = _.sample(shrimps.filter(s => s.position.x < 0))

    // 404 no shrimp found
    // try again later
    if (!shrimp) {
      this.startLookingDebounced()
      return
    }

    this.shrimpLookingAt = shrimp
  }

  startLookingDebounced = _.debounce(this.startLooking, 5000)

  // stop looking at shrimp and reset the timer to start again
  stopLooking() {
    this.shrimpLookingAt = null
    this.startLookingDebounced()
  }

  lookAtShrimp(dt, time) {
    const maxX = this.webgl.frustumSize.width / 2

    this.rotationX = mapRange(
      this.shrimpLookingAt.position.x,
      // the magic number is because maxX is
      // outside the viewport
      -maxX * 0.75,
      maxX * 0.75,
      -MAX_HEAD_ROTATION_X,
      MAX_HEAD_ROTATION_X,
    )
    this.rotationY = mapRange(
      this.shrimpLookingAt.position.y,
      CAT_OFFSET_Y,
      -CAT_OFFSET_Y,
      -MAX_HEAD_ROTATION_Y,
      // the magic number is because the head is not
      // at the center of the page
      MAX_HEAD_ROTATION_Y * 0.18,
    )

    // start again if the shrimp is a goner
    if (this.shrimpLookingAt.position.x > maxX * 1.2) {
      this.shrimpLookingAt = null
      this.startLooking()
    }
  }

  lerpRotation(dt, time) {
    const headMesh = this.head.mesh.children[0]

    if (!headMesh) {
      return
    }

    const currentRotationX = headMesh.rotation.x
    const currentRotationY = headMesh.rotation.y

    const targetRotationX = degToRad(this.rotationY)
    const targetRotationY = degToRad(this.rotationX)

    const lerpedRotationX = lerp(currentRotationX, targetRotationX, eases.quadInOut(dt * 10))
    const lerpedRotationY = lerp(currentRotationY, targetRotationY, eases.quadInOut(dt * 10))

    headMesh.rotation.set(lerpedRotationX, lerpedRotationY, 0)
  }
}
