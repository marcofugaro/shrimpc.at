import * as THREE from 'three'
import { quadOut } from 'eases'
import _ from 'lodash'
import { SceneUtils } from 'lib/three/SceneUtils'

// how much a bubble takes to reach full size, in seconds
const BLOWUP_TIME = 0.8

export default class Bubble extends THREE.Object3D {
  constructor({ webgl, ...options }) {
    super()
    this.webgl = webgl

    const geometry = new THREE.SphereGeometry(0.08, 8, 8)
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    this.bubble = new THREE.Mesh(geometry, material)

    this.bubble.scale.setScalar(0)
    this.startTime = this.webgl.time

    this.add(this.bubble)
  }

  update(dt, time) {
    if (time - this.startTime <= BLOWUP_TIME) {
      const scale = quadOut((time - this.startTime) / BLOWUP_TIME)
      this.bubble.scale.setScalar(scale)
    } else {
      this.detach()
      this.bubble.position.y += 0.05

      // remove it if they exit the field of view
      const maxY = this.webgl.frustumSize.height / 2
      if (maxY * 1.3 < this.bubble.position.y) {
        requestAnimationFrame(() => {
          this.bubble.geometry.dispose()
          this.bubble.material.dispose()
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
