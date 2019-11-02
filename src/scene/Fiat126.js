import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from '../lib/AssetManager'
import CannonSuperBody from '../lib/CannonSuperBody'
import { HORIZONTAL_GAP } from './Delimiters'
import { getRandomTransparentColor } from '../lib/three-utils'

// collision box dimensions
// in order: x, y, and z width
export const FIAT_DIMENSIONS = [6.5, 1.3, HORIZONTAL_GAP]
export const FIAT_TOP_DIMENSIONS = [3, 1.2, HORIZONTAL_GAP]
export const FIAT_WINDSHIELD_DIMENSIONS = [1.5, 1.5, HORIZONTAL_GAP]

const debugColor = getRandomTransparentColor()

export default class Fiat126 extends CannonSuperBody {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const fiat126Shape = new CANNON.Box(new CANNON.Vec3(...FIAT_DIMENSIONS.map(d => d * 0.5)))
    this.addShape(fiat126Shape, new CANNON.Vec3(0, -0.4, 0))

    const fiat126TopShape = new CANNON.Box(
      new CANNON.Vec3(...FIAT_TOP_DIMENSIONS.map(d => d * 0.5)),
    )
    this.addShape(fiat126TopShape, new CANNON.Vec3(-0.7, 0.7, 0))

    const fiat126WindshieldShape = new CANNON.Box(
      new CANNON.Vec3(...FIAT_TOP_DIMENSIONS.map(d => d * 0.5)),
    )
    this.addShape(
      fiat126WindshieldShape,
      new CANNON.Vec3(0.7, 0.25, 0),
      new CANNON.Quaternion().setFromEuler(0, 0, THREE.Math.degToRad(48)),
    )

    if (window.DEBUG) {
      const baseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(...FIAT_DIMENSIONS),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(baseMesh)

      const topMesh = new THREE.Mesh(
        new THREE.BoxGeometry(...FIAT_TOP_DIMENSIONS),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(topMesh)

      const windshieldMesh = new THREE.Mesh(
        new THREE.BoxGeometry(...FIAT_WINDSHIELD_DIMENSIONS),
        new THREE.MeshLambertMaterial(debugColor),
      )
      this.mesh.add(windshieldMesh)

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

    // add the model
    const fiat126Gltf = assets.get('assets/fiat126.glb')
    const fiat126 = fiat126Gltf.scene.clone()

    // position the fiat126 correctly
    fiat126.traverse(child => {
      if (!child.isMesh) {
        return
      }

      child.material.side = THREE.DoubleSide

      child.rotation.z = Math.PI / 2
      child.scale.multiplyScalar(FIAT_DIMENSIONS[0] * 0.122)
      child.position.set(-4, 0, -60)

      // we don't cast chadows because otherwise the
      // shrimps inside would appear dark
      // child.castShadow = true
      child.receiveShadow = true
    })

    this.mesh.add(fiat126)

    // add the shrimps inside
    const shrimpGltf = assets.get('assets/shrimp.glb')
    this.shrimps = _.range(0, 4).map(() => shrimpGltf.scene.clone())

    // position the shrimps in the fiat126
    this.shrimps.forEach((shrimp, i) => {
      shrimp.traverse(child => {
        if (!child.isMesh) {
          return
        }

        child.rotateZ(Math.PI / _.random(2.8, 3.3))
        child.scale.multiplyScalar(_.random(0.25, 0.4))

        const x = 0.1 - Math.floor(i / 2) * 1.5
        const y = 0.35
        const z = -0.6 * Math.cos((i % 2) * Math.PI)
        child.position.set(x, y, z)

        // save it for later
        this.initialY = y
      })

      this.mesh.add(shrimp)
    })
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)

    // make the shrimps jump up and down
    this.shrimps.forEach((shrimp, i) => {
      shrimp.traverse(child => {
        if (!child.isMesh) {
          return
        }

        child.position.y = this.initialY + Math.sin(time * 20 + i) * 0.09
      })
    })
  }
}
