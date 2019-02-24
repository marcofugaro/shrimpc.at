import * as THREE from 'three'
import CANNON from 'cannon'
import _ from 'lodash'
import assets from 'lib/AssetManager'
import CannonSuperBody from 'lib/CannonSuperBody'
import { vanCollision } from 'scene/collisions'
import { VERTICAL_GAP, HORIZONTAL_GAP } from 'scene/Delimiters'
import { getRandomTransparentColor } from 'lib/three-utils'
import { playAudioFromBuffer } from 'lib/audio-utils'

// collision box dimensions
// in order: x, y, and z width
const VAN_DIMENSIONS = [7, 2.8, HORIZONTAL_GAP]

const debugColor = getRandomTransparentColor()

class Van extends CannonSuperBody {
  mesh = new THREE.Object3D()

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    const vanGltf = assets.get('assets/van.glb')
    const van = vanGltf.scene.clone()

    // position the van correctly
    van.traverse(child => {
      if (!child.isMesh) {
        return
      }

      child.material.side = THREE.DoubleSide

      child.position.set(0, -1.98, 0)
      child.rotation.y = Math.PI / 2
      child.scale.multiplyScalar(16 / VAN_DIMENSIONS[0])

      // we don't cast chadows because otherwise the
      // shrimps inside would appear dark
      // child.castShadow = true
      child.receiveShadow = true
    })

    this.mesh.add(van)

    const vanShape = new CANNON.Box(new CANNON.Vec3(...VAN_DIMENSIONS.map(d => d * 0.5)))
    this.addShape(vanShape)

    if (window.DEBUG) {
      const geometry = new THREE.BoxGeometry(...VAN_DIMENSIONS)
      const material = new THREE.MeshLambertMaterial(debugColor)
      const mesh = new THREE.Mesh(geometry, material)
      this.mesh.add(mesh)
    }

    // add the shrimps inside
    const shrimpGltf = assets.get('assets/shrimp.glb')
    this.vanShrimps = _.range(0, 8).map(() => shrimpGltf.scene.clone())

    // position the shrimps in the van
    this.vanShrimps.forEach((shrimp, i) => {
      shrimp.traverse(child => {
        if (!child.isMesh) {
          return
        }

        // make the driver big, the second small, and the others random
        switch (i) {
          case 0:
            child.rotateY(-Math.PI / 2.7)
            child.scale.multiplyScalar(0.65)
            break
          case 1:
            child.rotateY(-Math.PI / 2.3)
            child.scale.multiplyScalar(0.45)
            break
          default:
            child.rotateY(-Math.PI / _.random(2.3, 2.7))
            child.scale.multiplyScalar(_.random(0.4, 0.65))
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
    this.vanShrimps.forEach((shrimp, i) => {
      shrimp.traverse(child => {
        if (!child.isMesh) {
          return
        }

        child.position.y = this.initialY + Math.sin(time * 20 + i) * 0.09
      })
    })
  }
}

export default class VanComponent extends THREE.Object3D {
  vans = []

  constructor({ webgl, ...options }) {
    super(options)
    this.webgl = webgl

    // not loaded with the other assets because
    // it's not needed immediately
    Promise.all([
      assets.loadSingle({
        url: 'assets/van.glb',
        type: 'gltf',
        renderer: webgl.renderer,
      }),
      assets.loadSingle({
        url: 'assets/striscia-clacson.mp3',
        type: 'audio',
        renderer: webgl.renderer,
      }),
    ]).then(([vanKey, hornKey]) => {
      window.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') {
          this.createVan()

          const hornBuffer = assets.get(hornKey)
          playAudioFromBuffer(hornBuffer)
        }
      })

      window.addEventListener('shake', () => {
        this.createVan()
      })

      console.log('Tip! Press Space 😉')
    })
  }

  createVan() {
    const maxX = this.webgl.frustumSize.width / 2

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
        -maxX - VAN_DIMENSIONS[0],
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
    const maxX = this.webgl.frustumSize.width / 2

    this.vans.forEach(van => {
      // apply a quadratic drag force to simulate water
      van.applyDrag(0.8)

      // the force moving the van left
      van.applyGenericForce(new CANNON.Vec3(100, 0, 0))

      // remove it if they exit the field of view
      if (maxX + VAN_DIMENSIONS[0] / 2 < van.position.x) {
        this.webgl.world.removeBody(van)
        this.remove(van.mesh)
        this.vans.splice(this.vans.findIndex(v => v.id === van.id), 1)
      }
    })
  }
}
