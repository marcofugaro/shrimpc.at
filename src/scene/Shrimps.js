import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from 'lib/AssetManager'
import CannonSuperBody from 'lib/CannonSuperBody'
import { shrimpCollision } from 'scene/collisions'
import { VERTICAL_GAP } from 'scene/Delimiters'
import { getRandomTransparentColor } from 'lib/three-utils'
import Bubble from 'scene/Bubble'

// the interval between the spawn of shrimps (seconds)
export let SHRIMP_INTERVAL = 4

export const SHRIMP_RADIUS = 1
export const SHRIMP_HEIGHT = 0.5

const shrimpGltfKey = assets.queue({
  url: 'assets/shrimp.glb',
  type: 'gltf',
})

const shrimpFriedGltfKey = assets.queue({
  url: 'assets/shrimp-fried.glb',
  type: 'gltf',
})

const debugColor = getRandomTransparentColor(0.75)

class Shrimp extends CannonSuperBody {
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

    if (window.DEBUG) {
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
        this.fry()
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

    shrimp.castShadow = true
    shrimp.receiveShadow = true
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  fry() {
    if (this.isFried) {
      return
    }
    this.isFried = true

    // TODO animate this??
    this.shrimpMesh.visible = false
    this.shrimpFriedMesh.visible = true

    this.shrimpMesh.material.needsupdate = true
    this.shrimpFriedMesh.material.needsupdate = true

    // for (let i = 0; i < 30; i++) {
    //   const position = this.position.clone()

    //   position.y -= 0.5

    //   const bubble = new Bubble({ webgl: this.webgl, position })

    //   // add the body to the cannon.js world
    //   this.webgl.world.addBody(bubble)
    //   // and the mesh to the three.js scene
    //   this.webgl.scene.add(bubble.mesh)
    // }
  }
}

export default class Shrimps extends THREE.Object3D {
  shrimps = []
  shrimpInterval = SHRIMP_INTERVAL

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    if (window.DEBUG) {
      this.webgl.panel.on('input', inputs => {
        SHRIMP_INTERVAL = inputs['Shrimp Spawn Interval']
        this.shrimpInterval = SHRIMP_INTERVAL
      })
    }
  }

  update(dt = 0, time = 0) {
    const maxX = this.webgl.frustumSize.width / 2

    // spawn new shrimps
    if (!this.lastSpawnTimestamp || time - this.lastSpawnTimestamp > this.shrimpInterval) {
      this.lastSpawnTimestamp = time
      this.shrimpInterval = _.random(SHRIMP_INTERVAL * 0.1, SHRIMP_INTERVAL)

      const shrimp = new Shrimp({
        webgl: this.webgl,
        material: shrimpCollision.material,
        collisionFilterGroup: shrimpCollision.id,
        collisionFilterMask: shrimpCollision.collideWith,
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        // simulate the water
        angularDamping: 0.98,
        // movement damping is handled by the drag force
        // linearDamping: 0.98,
        position: new CANNON.Vec3(
          // a bit left and right
          _.random(-maxX, maxX * 0.3),
          // up the visible frustum
          (VERTICAL_GAP / 2) * 1.2,
          0,
        ),
        // orient them randomly
        quaternion: new CANNON.Quaternion().setFromEuler(
          0,
          _.random(0, Math.PI),
          _.random(0, Math.PI),
        ),
      })

      // give them a push down!
      shrimp.applyGenericImpulse(new CANNON.Vec3(0, -100, 0))

      // add the body to the cannon.js world
      this.webgl.world.addBody(shrimp)
      // and the mesh to the three.js scene
      this.add(shrimp.mesh)
      // save it
      this.shrimps.push(shrimp)
    }

    this.shrimps.forEach(shrimp => {
      // apply a quadratic drag force to simulate water
      shrimp.applyDrag(0.8)

      // the force moving the shrimp left
      shrimp.applyGenericForce(new CANNON.Vec3(0.6, 0, 0))

      // remove it if they exit the field of view
      if (maxX * 1.3 < shrimp.position.x) {
        this.webgl.world.removeBody(shrimp)
        this.remove(shrimp.mesh)
        this.shrimps.splice(this.shrimps.findIndex(s => s.id === shrimp.id), 1)
      }
    })
  }
}
