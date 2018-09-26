import * as THREE from 'three'
import CANNON from 'cannon'
import { getRandomTransparentColor } from 'lib/three-utils'

export const PAW_RADIUS = 1
export const FOREARM_HEIGHT = 4
export const FOREARM_WIDTH = 0.9

const debugColor = getRandomTransparentColor()

export default class Arm extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // add the sprite
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: options.sprite,
        color: 0xffffff,
        depthTest: false,
        transparent: true,
        opacity: window.DEBUG ? 0.6 : 1,
      }),
    )
    sprite.center.x = options.spriteCenter.x
    sprite.center.y = options.spriteCenter.y
    sprite.scale.multiplyScalar(10)
    this.mesh.add(sprite)
    this.rotationFactor = options.rotationFactor

    // ⚠️ Warning! order of creation is important!
    const hand = new CANNON.Sphere(PAW_RADIUS)
    this.addShape(hand, new CANNON.Vec3(0, 0, 0))

    const forearm = new CANNON.Cylinder(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32)
    this.addShape(forearm, new CANNON.Vec3(0, -FOREARM_HEIGHT / 2, 0))

    const arm = new CANNON.Cylinder(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32)
    this.addShape(
      arm,
      new CANNON.Vec3(0.7, -(FOREARM_HEIGHT / 2 + FOREARM_HEIGHT) * 0.95, 0),
      new CANNON.Quaternion().setFromEuler(0, 0, THREE.Math.degToRad(20)),
    )

    if (window.DEBUG) {
      const handMesh = new THREE.Mesh(
        new THREE.SphereGeometry(hand.radius, 32, 32),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(handMesh)

      const forearmMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(forearmMesh)

      const armMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(FOREARM_WIDTH, FOREARM_WIDTH, FOREARM_HEIGHT, 32),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(armMesh)

      // sync the shapes to their meshes
      let meshIndex = 0
      this.mesh.traverse(child => {
        if (!child.isMesh) {
          return
        }

        const position = this.shapeOffsets[meshIndex]
        const quaternion = this.shapeOrientations[meshIndex]
        child.position.copy(position)
        child.quaternion.copy(quaternion)

        meshIndex++
      })
    }
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)

    this.mesh.traverse(child => {
      if (!child.isSprite) {
        return
      }

      // fucking shitty cannon.js,
      // what about using the function's return?
      const eulerRotation = new CANNON.Vec3()
      this.quaternion.toEuler(eulerRotation, 'YZX')

      // make the sprite rotation follow the arm
      const zRotation = eulerRotation.z
      child.material.rotation = zRotation * this.rotationFactor
    })
  }
}
