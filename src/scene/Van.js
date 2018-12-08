import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from 'lib/AssetManager'
import CannonSuperBody from 'lib/CannonSuperBody'
import { vanCollision } from 'scene/collisions'
import { VERTICAL_GAP, HORIZONTAL_GAP } from 'scene/Delimiters'
import { getRandomTransparentColor } from 'lib/three-utils'

// where the vans will die
export const MAX_X_POSITION = 12

// collision box dimensions
// in order: x, y, and z width
const VAN_DIMENSIONS = [7, 2.8, HORIZONTAL_GAP]

const debugColor = getRandomTransparentColor()

class Van extends CannonSuperBody {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const vanGltf = assets.get('assets/van.gltf')
    this.mesh.copy(vanGltf.scene)

    // position the van correctly
    this.mesh.traverse(child => {
      if (!child.isMesh) {
        return
      }

      child.position.set(0, -1.9, 0)
      child.rotateY(Math.PI / 2)
      child.scale.multiplyScalar(3.5 / VAN_DIMENSIONS[0])
    })

    const vanShape = new CANNON.Box(new CANNON.Vec3(...VAN_DIMENSIONS.map(d => d * 0.5)))
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
}

export default class VanComponent extends THREE.Object3D {
  vans = []

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // not loaded with the other assets because
    // it's not needed immediately
    assets
      .loadSingle({
        url: 'assets/van.gltf',
        type: 'gltf',
        renderer: webgl.renderer,
      })
      .then(() => {
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
      material: vanCollision.material,
      collisionFilterGroup: vanCollision.id,
      collisionFilterMask: vanCollision.collideWith,
      type: CANNON.Body.DYNAMIC,
      mass: 50,
      // simulate the water
      angularDamping: 0.98,
      // movement damping is handled by the drag force
      // linearDamping: 0.98,
      position: new CANNON.Vec3(
        -MAX_X_POSITION - VAN_DIMENSIONS[0],
        _.random(0, VERTICAL_GAP / 2 - VAN_DIMENSIONS[1] / 2),
        0,
      ),
    })

    // add the body to the cannon.js world
    this.webgl.world.addBody(van)
    // and the mesh to the three.js scene
    this.add(van.mesh)
    // save it
    this.vans.push(van)

    // give it a push!
    van.applyGenericImpulse(new CANNON.Vec3(800, 0, 0))
  }

  update(dt = 0, time = 0) {
    this.vans.forEach(van => {
      // apply a quadratic drag force to simulate water
      van.applyDrag(0.8)

      // the force moving the van left
      van.applyGenericForce(new CANNON.Vec3(400, 0, 0))

      // remove it if they exit the field of view
      if (MAX_X_POSITION < van.position.x) {
        this.webgl.world.removeBody(van)
        this.remove(van.mesh)
        this.vans.splice(this.vans.findIndex(v => v.id === van.id), 1)
      }
    })
  }
}
