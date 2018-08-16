import * as THREE from 'three'
import assets from 'lib/AssetManager'

// tell the asset loader to include this asset
const gltfKey = assets.queue({
  url: 'assets/honeycomb.gltf',
})

export default class Shrimps extends THREE.Object3D {
  constructor(webgl) {
    super()
    this.webgl = webgl

    // now fetch the loaded resource
    const gltf = assets.get(gltfKey)

    this.material = new THREE.MeshLambertMaterial({ color: 0x7777ff })

    // Replaces all meshes material with something basic
    gltf.scene.traverse(child => {
      if (child.isMesh) {
        child.material = this.material

        // ThreeJS attaches something odd here on GLTF ipmport
        child.onBeforeRender = () => {}
      }
    })

    this.add(gltf.scene)
  }

  update(dt = 0, time = 0) {
    // This function gets propagated down from the WebGL app to all children
    this.rotation.y += dt * 0.1
  }

  onTouchStart(ev, pos) {
    const [x, y] = pos
    console.log('Touchstart / mousedown: (%d, %d)', x, y)

    // For example, raycasting is easy:
    const coords = new THREE.Vector2().set(
      (pos[0] / this.webgl.width) * 2 - 1,
      (-pos[1] / this.webgl.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(coords, this.webgl.camera)
    const hits = raycaster.intersectObject(this, true)
    console.log(hits.length > 0 ? `Hit ${hits[0].object.name}!` : 'No hit')
  }

  onTouchMove(ev, pos) {}

  onTouchEnd(ev, pos) {}
}
