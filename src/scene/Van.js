import * as THREE from 'three'
import CANNON from 'cannon'
import assets from 'lib/AssetManager'
import { armsCollisionId } from 'scene/Arms'
import { headCollisionId } from 'scene/Head'
import { shrimpsCollisionId } from 'scene/Shrimps'
import { getRandomTransparentColor } from 'lib/three-utils'

// where the vans will die
export const MAX_X_POSITION = 12

// collision box dimensions
const VAN_DIMENSIONS = [7, 2.8, 2.8]

// must be powers of 2!
export const vansCollisionId = 32

const debugColor = getRandomTransparentColor()

class Van extends CANNON.Body {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const vanGltf = assets.get('assets/van.gltf')
    vanGltf.scene.children.forEach(child => {
      this.mesh.add(child)
    })

    // position the van correctly
    this.mesh.traverse(child => {
      if (!child.isMesh) {
        return
      }

      child.position.set(0, -1.9, 0)
      child.rotateY(Math.PI / 2)
      child.scale.multiplyScalar(3.5 / VAN_DIMENSIONS[0])
    })

    const vanShape = new CANNON.Box(new CANNON.Vec3(...VAN_DIMENSIONS))
    this.addShape(vanShape)

    if (window.DEBUG) {
      const geometry = new THREE.BoxGeometry(...VAN_DIMENSIONS)
      const material = new THREE.MeshLambertMaterial(debugColor)
      const mesh = new THREE.Mesh(geometry, material)
      this.mesh.add(mesh)
    }
  }

  update(dt = 0, time = 0) {
    // sync the mesh to the physical body
    this.mesh.position.copy(this.position)
    this.mesh.quaternion.copy(this.quaternion)
  }

  // apply a force in its center of mass
  applyGenericForce(force) {
    const centerInWorldCoords = this.pointToWorldFrame(new CANNON.Vec3())
    this.applyForce(force, centerInWorldCoords)
  }

  // Fd = - Constant * getMagnitude(velocity)**2 * normalize(velocity)
  applyDrag(coefficient) {
    const speed = this.velocity.length()

    const dragMagnitude = coefficient * speed ** 2

    const drag = this.velocity.clone()
    drag.scale(-1, drag)

    drag.normalize()

    drag.scale(dragMagnitude, drag)

    this.applyGenericForce(drag)
  }
}

export default class VanComponent extends THREE.Object3D {
  vans = []
  material = new CANNON.Material('van')

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // not loaded with the other assets because
    // it's not needed immediately
    assets
      .loadItem({
        url: 'assets/van.gltf',
        type: 'gltf',
        renderer: webgl.renderer,
      })
      .then(vanGltf => {
        assets.cacheItem('assets/van.gltf', vanGltf)

        window.addEventListener('keydown', e => {
          if (e.key === ' ') {
            this.createVan()
          }
        })
      })
  }

  createVan() {
    const van = new Van({
      webgl: this.webgl,
      material: this.material,
      // can collide with both arms and shrimps (and itself)
      collisionFilterGroup: vansCollisionId,
      collisionFilterMask: armsCollisionId | shrimpsCollisionId | headCollisionId | vansCollisionId,
      type: CANNON.Body.DYNAMIC,
      mass: 5,
      // simulate the water
      angularDamping: 0.98,
      // movement damping is handled by the drag force
      // linearDamping: 0.98,
      position: new CANNON.Vec3(-MAX_X_POSITION, 0, 0),
      // put them vertical
      // quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0),
    })

    // add the body to the cannon.js world
    this.webgl.world.addBody(van)
    // and the mesh to the three.js scene
    this.add(van.mesh)
    // save it
    this.vans.push(van)
  }

  update(dt = 0, time = 0) {
    this.vans.forEach(van => {
      // apply a quadratic drag force to simulate water
      van.applyDrag(0.8)

      // the force moving the van left
      van.applyGenericForce(new CANNON.Vec3(2.6, 0, 0))

      // remove it if they exit the field of view
      if (MAX_X_POSITION < van.position.x) {
        this.webgl.world.removeBody(van)
        this.remove(van.mesh)
        this.vans.splice(this.vans.findIndex(v => v.id === van.id), 1)
      }
    })
  }
}
