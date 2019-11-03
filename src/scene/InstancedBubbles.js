import * as THREE from 'three'
import { quadOut } from 'eases'
import assets from '../lib/AssetManager'

// how much a bubble takes to reach full size, in seconds
const BLOWUP_TIME = 0.7

// how many instances to initialize
const INSTANCED_COUNT = 5000

const envMapKey = assets.queue({
  url: 'assets/env-map-equirectangular.jpg',
  type: 'env-map',
  equirectangular: true,
})

export default class InstancedBubbles extends THREE.Group {
  bubblesPool = []
  bubblesData = new Map()
  mesh
  dummy = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super()
    this.webgl = webgl

    const geometry = new THREE.SphereBufferGeometry(0.12, 8, 8)
    const material = new THREE.MeshStandardMaterial({
      // roughness: 0.6,
      // metalness: 0.6,
      // transparent: true,
      // depthWrite: false,
      // opacity: 0.3,
      // envMap: assets.get(envMapKey),
      // envMapIntensity: 0.7,
      // refractionRatio: 0.95,

      roughness: 1,
      metalness: 0,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, INSTANCED_COUNT)
    this.mesh.receiveShadow = true
    this.add(this.mesh)

    // give them scale zero and position them
    // outside of the frustum for safety
    for (let i = 0; i < INSTANCED_COUNT; i++) {
      this.resetBubble(i)
    }
  }

  setInstanceTransform(i, { position = new THREE.Vector3(), scale = 1 } = {}) {
    this.dummy.position.copy(position)
    this.dummy.scale.setScalar(scale)

    this.dummy.updateMatrix()
    this.mesh.setMatrixAt(i, this.dummy.matrix)
  }

  spawnBubble({ normal, vertex, matrixWorld }) {
    let availableIndex
    for (let i = 0; i < INSTANCED_COUNT; i++) {
      if (!this.bubblesPool.includes(i)) {
        availableIndex = i
        break
      }
    }

    if (availableIndex === undefined) {
      // TODO remove other bubbles in case there's no available one
    }

    this.bubblesPool.push(availableIndex)
    this.bubblesData.set(availableIndex, {
      normal,
      vertex,
      matrixWorld,
      startTime: this.webgl.time,
      // give some randomness to the time they take to blow up
      blowupTime: BLOWUP_TIME + (Math.random() * 2 - 1) * 0.2,
    })
  }

  resetBubble(i) {
    if (this.bubblesPool.includes(i)) {
      this.bubblesPool.splice(this.bubblesPool.indexOf(i), 1)
    }
    if (this.bubblesData.get(i)) {
      this.bubblesData.delete(i)
    }

    this.setInstanceTransform(i, {
      position: new THREE.Vector3().setScalar(100),
      scale: 0,
    })
  }

  update(dt, time) {
    this.bubblesPool.forEach(i => {
      const data = this.bubblesData.get(i)

      if (time - data.startTime <= data.blowupTime) {
        // make it grow
        const scale = quadOut((time - data.startTime) / data.blowupTime)

        // translate it along the shrimp normal
        const position = data.normal
          .clone()
          .multiplyScalar(scale * 0.015)
          .add(data.vertex)
          .applyMatrix4(data.matrixWorld)

        this.setInstanceTransform(i, {
          position,
          scale,
        })
      } else {
        const matrix = new THREE.Matrix4().fromArray(this.mesh.instanceMatrix.array, i * 16)
        const position = new THREE.Vector3().setFromMatrixPosition(matrix)

        // make it just go up
        position.y += 0.1

        this.setInstanceTransform(i, { position })

        // remove it if they exit the field of view
        const maxY = this.webgl.frustumSize.height / 2
        if (maxY * 1.3 < position.y) {
          this.resetBubble(i)
        }
      }
    })

    if (this.bubblesPool.length > 0) {
      this.mesh.instanceMatrix.needsUpdate = true
    }
  }
}
