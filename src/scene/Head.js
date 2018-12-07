import * as THREE from 'three'
import CANNON from 'cannon'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { headCollision } from 'scene/collisions'
import { getRandomTransparentColor } from 'lib/three-utils'
import assets from 'lib/AssetManager'
import { mapRange, degToRad, lerp } from 'canvas-sketch-util/math'
import eases from 'eases'

export const HEAD_RADIUS = 2.5

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
      // displacementBias: 0,

      metalness: 0,

      map: assets.get(catHeadKey),

      depthTest: !window.DEBUG,
      transparent: true,
    })

    const headGeometry = new THREE.PlaneGeometry(HEAD_RADIUS * 2, HEAD_RADIUS * 2, 32, 32)

    const headMesh = new THREE.Mesh(headGeometry, headMaterial)

    // position it
    headMesh.scale.setScalar(1.5)
    headMesh.position.y = 0.2
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
  material = new CANNON.Material('head')
  head

  rotationX = 0
  rotationY = 0

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    this.head = new Head({
      webgl,
      material: this.material,
      collisionFilterGroup: headCollision.id,
      collisionFilterMask: headCollision.collideWith,
      type: CANNON.Body.KINEMATIC,
      mass: 5,
    })

    // position it
    this.head.position.set(0, -VERTICAL_GAP / 2, 0)

    // add the body to the cannon.js world
    // and the mesh to the three.js scene
    this.webgl.world.addBody(this.head)
    this.add(this.head.mesh)
  }

  onTouchMove(e, [x, y]) {
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

  // follow the mouse but with a bit of lerping
  update(dt = 0, time = 0) {
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
