import * as THREE from 'three'
import { CAT_OFFSET_Y } from 'scene/Head'
import assets from 'lib/AssetManager'

const catBodyKey = assets.queue({
  url: 'assets/cat-body.png',
  type: 'texture',
})

export default class Body extends THREE.Object3D {
  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: assets.get(catBodyKey),
        color: 0xffffff,
        depthTest: false,
        transparent: true,
        opacity: window.DEBUG ? 0.6 : 1,
      }),
    )

    // position it
    sprite.center.x = 0.5
    sprite.center.y = 1
    sprite.scale.multiplyScalar(10)
    sprite.position.set(0, -CAT_OFFSET_Y, 0)

    this.add(sprite)
  }
}
