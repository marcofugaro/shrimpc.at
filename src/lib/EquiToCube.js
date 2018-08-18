// Credit for this code goes to Matt DesLauriers @mattdesl,
// really awesome dude, give him a follow!
// https://github.com/mattdesl/threejs-app/blob/master/src/util/EquiToCube.js
import * as THREE from 'three'

const CUBE_FACE_SIZE = 1024

export default class EquiToCube {
  _maxSize = null
  _sphere
  _timer

  constructor(renderer) {
    this.renderer = renderer

    if (this._maxSize === null) {
      const gl = renderer.getContext()
      this._maxSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)
    }

    this.material = new THREE.MeshBasicMaterial({
      map: null,
      side: THREE.BackSide,
    })
    if (!this._sphere) {
      this._sphere = new THREE.SphereBufferGeometry(100, 256, 64)
    }

    this.mesh = new THREE.Mesh(this._sphere, this.material)
    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)

    const mapSize = Math.min(CUBE_FACE_SIZE, this._maxSize)
    this.camera = new THREE.CubeCamera(1, 1000, mapSize)
    this.cubeTexture = this.camera.renderTarget.texture

    // After N seconds, dispose the sphere geometry
    // and let it be re-created if necessary
    clearTimeout(this._timer)
    this._timer = setTimeout(() => {
      this._sphere.dispose()
    }, 3000)
  }

  convert = map => {
    this.material.map = map
    this.material.needsUpdate = true
    this.camera.update(this.renderer, this.scene)
  }
}
