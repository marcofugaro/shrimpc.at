import * as THREE from 'three'
import { quadOut } from 'eases'
import _ from 'lodash'
import { SceneUtils } from 'lib/three/SceneUtils'
import assets from 'lib/AssetManager'

// how much a bubble takes to reach full size, in seconds
const BLOWUP_TIME = 0.7

const envMapKey = assets.queue({
  url: 'assets/env-map-equirectangular.jpg',
  type: 'env-map',
  equirectangular: true,
})

export default class Bubble extends THREE.Object3D {
  constructor({ webgl, ...options }) {
    super()
    this.webgl = webgl
    this.moveAlong = options.moveAlong
    this.originalPosition = options.originalPosition

    // give some randomness to the time they blow up
    this.blowupTime = BLOWUP_TIME + (Math.random() * 2 - 1) * 0.2

    const geometry = new THREE.SphereGeometry(0.12, 8, 8)
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.6,
      transparent: true,
      depthWrite: false,
      opacity: 0.4,
      envMap: assets.get(envMapKey),
      envMapIntensity: 0.7,
      refractionRatio: 0.95,
    })

    this.bubble = new THREE.Mesh(geometry, material)

    this.bubble.scale.setScalar(0)
    this.startTime = this.webgl.time

    this.bubble.receiveShadow = true

    this.add(this.bubble)
  }

  update(dt, time) {
    if (time - this.startTime <= this.blowupTime) {
      // make it grow
      const scale = quadOut((time - this.startTime) / this.blowupTime)
      this.bubble.scale.setScalar(scale)

      // translate it along the shrimp normal
      const translateVector = this.moveAlong
        .clone()
        .multiplyScalar(quadOut((time - this.startTime) / this.blowupTime) * 0.015)
      this.bubble.position.add(translateVector)
    } else {
      this.detach()
      this.bubble.position.y += 0.1

      // remove it if they exit the field of view
      const maxY = this.webgl.frustumSize.height / 2
      if (maxY * 1.3 < this.bubble.position.y) {
        requestAnimationFrame(() => {
          this.webgl.scene.remove(this.bubble)
        })
      }
    }
  }

  detach = _.once(() => {
    SceneUtils.detach(this.bubble, this.bubble.parent, this.webgl.scene)
    SceneUtils.attach(this.bubble, this.webgl.scene, this.webgl.scene)
  })
}
