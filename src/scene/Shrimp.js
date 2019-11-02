import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from '../lib/AssetManager'
import CannonSuperBody from '../lib/CannonSuperBody'
import { getRandomTransparentColor } from '../lib/three-utils'
import Bubble from './Bubble'
import { impulse } from '../lib/easing-utils'
import { playAudio } from '../lib/audio-utils'

const BUBBLES_NUMBER = 400
const SPAWN_TIME = 3200 // ms

const shrimpGltfKey = assets.queue({
  url: 'assets/shrimp.glb',
  type: 'gltf',
})

const shrimpFriedGltfKey = assets.queue({
  url: 'assets/shrimp-fried.glb',
  type: 'gltf',
})

const debugColor = getRandomTransparentColor(0.75)

export default class Shrimp extends CannonSuperBody {
  // no need to handle position, velocity and acceleration,
  // CANNON.Body already has those

  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const radius1 = 0.4
    const height1 = 1.4
    const shrimpShape1 = new CANNON.Cylinder(radius1, radius1, height1, 32)
    this.addShape(
      shrimpShape1,
      new CANNON.Vec3(0.7, -0.05, -0.15),
      new CANNON.Quaternion().setFromEuler(0, THREE.Math.degToRad(5), 0),
    )

    const radius2 = 0.3
    const height2 = 1.4
    const shrimpShape2 = new CANNON.Cylinder(radius2, radius2, height2, 32)
    this.addShape(
      shrimpShape2,
      new CANNON.Vec3(0, 0, -0.65),
      new CANNON.Quaternion().setFromEuler(0, THREE.Math.degToRad(70), 0),
    )

    const radius3 = 0.2
    const height3 = 2
    const shrimpShape3 = new CANNON.Cylinder(radius3, radius3, height3, 32)
    this.addShape(
      shrimpShape3,
      new CANNON.Vec3(-0.7, 0, 0.1),
      new CANNON.Quaternion().setFromEuler(0, THREE.Math.degToRad(-40), 0),
    )

    if (false) {
      const material = new THREE.MeshLambertMaterial(debugColor)

      const geometry1 = new THREE.CylinderGeometry(radius1, radius1, height1, 32)
      const cylinderMesh1 = new THREE.Mesh(geometry1, material)
      this.mesh.add(cylinderMesh1)

      const geometry2 = new THREE.CylinderGeometry(radius2, radius2, height2, 32)
      const cylinderMesh2 = new THREE.Mesh(geometry2, material)
      this.mesh.add(cylinderMesh2)

      const geometry3 = new THREE.CylinderGeometry(radius3, radius3, height3, 32)
      const cylinderMesh3 = new THREE.Mesh(geometry3, material)
      this.mesh.add(cylinderMesh3)

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

      // uuuuugh... oops, too late to remove this piece of code
      // ideally this would not be here
      // sorry
      this.mesh.traverse(child => {
        if (!child.isMesh) {
          return
        }

        child.rotateY(THREE.Math.degToRad(23))
        child.rotateX(THREE.Math.degToRad(90))
        child.scale.multiplyScalar(0.88)
      })
    }

    const shrimpGltf = assets.get(shrimpGltfKey)
    this.shrimpMesh = shrimpGltf.scene.children[0].clone()
    this.alignShrimp(this.shrimpMesh)
    this.mesh.add(this.shrimpMesh)

    const shrimpFriedGltf = assets.get(shrimpFriedGltfKey)
    this.shrimpFriedMesh = shrimpFriedGltf.scene.children[0].clone()
    this.alignShrimp(this.shrimpFriedMesh)
    this.shrimpFriedMesh.visible = false
    this.mesh.add(this.shrimpFriedMesh)

    // add the collide event with the arm
    this.addEventListener('collide', e => {
      if (e.body === webgl.scene.arms.leftArm || e.body === webgl.scene.arms.rightArm) {
        // this.fry()
      }
    })
  }

  alignShrimp(shrimp) {
    // position the shrimp correctly
    shrimp.rotateX(THREE.Math.degToRad(-90))
    shrimp.rotateZ(THREE.Math.degToRad(-5))
    shrimp.rotateY(THREE.Math.degToRad(3))
    shrimp.scale.multiplyScalar(0.6)
    shrimp.translateX(-0.1)

    // update the matrix for later use
    shrimp.updateMatrix()

    shrimp.castShadow = true
    shrimp.receiveShadow = true
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  fry = _.once(() => {
    // don't play the sound it it has been played just now,
    // it sounds weird otherwise
    if (this.webgl.time - (window.lastPlayedFry || 0) > 0.2) {
      window.lastPlayedFry = this.webgl.time
      const fryingSound = assets.get('assets/sounds/fryingsound_lowpass.mp3')
      // play the sound with the Web Audio Api because it
      // doesn't happen just after a click/tap event
      playAudio(fryingSound, this.webgl.audioContext)
    }

    // TODO animate this??
    setTimeout(() => {
      this.shrimpMesh.visible = false
      this.shrimpFriedMesh.visible = true

      this.shrimpMesh.material.needsupdate = true
      this.shrimpFriedMesh.material.needsupdate = true
    }, SPAWN_TIME * 0.2)

    const vertices = this.shrimpMesh.geometry.getAttribute('position').array
    const normals = this.shrimpMesh.geometry.getAttribute('normal').array
    const verticesCount = this.shrimpMesh.geometry.getAttribute('position').count
    for (let i = 0; i < BUBBLES_NUMBER; i++) {
      const index = _.random(0, verticesCount) * 3
      const x = vertices[index]
      const y = vertices[index + 1]
      const z = vertices[index + 2]
      const position = new THREE.Vector3(x, y, z)
      position.applyMatrix4(this.shrimpMesh.matrix)

      const xNormal = normals[index]
      const yNormal = normals[index + 1]
      const zNormal = normals[index + 2]
      const normal = new THREE.Vector3(xNormal, yNormal, zNormal)
      normal.applyMatrix4(this.shrimpMesh.matrix)

      setTimeout(() => {
        const bubble = new Bubble({
          webgl: this.webgl,
          moveAlong: normal,
          originalPosition: position,
        })
        bubble.position.copy(position)
        this.mesh.add(bubble)
      }, impulse(i / BUBBLES_NUMBER, 13) * SPAWN_TIME)
    }
  })
}
