import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from 'lib/AssetManager'
import CannonSuperBody from 'lib/CannonSuperBody'
import { HORIZONTAL_GAP } from 'scene/Delimiters'
import { getRandomTransparentColor } from 'lib/three-utils'

// collision box dimensions
// in order: x, y, and z width
export const FIAT_DIMENSIONS = [7, 2.5, HORIZONTAL_GAP]

const debugColor = getRandomTransparentColor()

export default class Fiat126 extends CannonSuperBody {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

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
      child.position.set(-4, 0, -70)

      // we don't cast chadows because otherwise the
      // shrimps inside would appear dark
      // child.castShadow = true
      child.receiveShadow = true
    })

    this.mesh.add(fiat126)

    const fiat126Shape = new CANNON.Box(new CANNON.Vec3(...FIAT_DIMENSIONS.map(d => d * 0.5)))
    this.addShape(fiat126Shape)

    if (window.DEBUG) {
      const geometry = new THREE.BoxGeometry(...FIAT_DIMENSIONS)
      const material = new THREE.MeshLambertMaterial(debugColor)
      const mesh = new THREE.Mesh(geometry, material)
      this.mesh.add(mesh)
    }

    // add the shrimps inside
    const shrimpGltf = assets.get('assets/shrimp.glb')
    this.shrimps = _.range(0, 8).map(() => shrimpGltf.scene.clone())

    // position the shrimps in the fiat126
    this.shrimps.forEach((shrimp, i) => {
      shrimp.traverse(child => {
        if (!child.isMesh) {
          return
        }

        // make the driver big, the second small, and the others random
        switch (i) {
          case 0:
            child.rotateZ(Math.PI / 3.3)
            child.scale.multiplyScalar(0.45)
            break
          case 1:
            child.rotateZ(Math.PI / 2.8)
            child.scale.multiplyScalar(0.3)
            break
          default:
            child.rotateZ(Math.PI / _.random(2.8, 3.3))
            child.scale.multiplyScalar(_.random(0.25, 0.45))
        }

        const x = 2 - Math.floor(i / 2) * 1.4
        const y = 0.2
        const z = -0.7 * Math.cos((i % 2) * Math.PI)
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
