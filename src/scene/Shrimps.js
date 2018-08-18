import * as THREE from 'three'
import assets from 'lib/AssetManager'

const shrimpObjKey = assets.queue({
  url: 'assets/shrimp.obj',
  type: 'objmtl',
})

export default class Shrimps extends THREE.Object3D {
  constructor(webgl) {
    super()
    this.webgl = webgl

    const shrimpObj = assets.get(shrimpObjKey)

    this.add(shrimpObj)
  }

  update(dt = 0, time = 0) {
    // This function gets propagated down from the WebGL app to all children
    this.rotation.y += dt * 0.3
  }
}
