// Credit for this class goes to Matt DesLauriers @mattdesl,
// really awesome dude, give him a follow!
// https://github.com/mattdesl/threejs-app/blob/master/src/webgl/WebGLApp.js
import * as THREE from 'three'
import createOrbitControls from 'orbit-controls'
import createTouches from 'touches'
import dataURIToBlob from 'datauritoblob'
import Stats from 'stats.js'

export default class WebGLApp {
  tmpTarget = new THREE.Vector3()

  constructor({
    background = '#000',
    backgroundAlpha = 1,
    fov = 45,
    near = 0.01,
    far = 100,
    showFps = false,
    useOrbitControls = false,
    ...options
  }) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      // enabled for saving screen shots of the canvas,
      // may wish to disable this for perf reasons
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: true,
      ...options,
    })

    this.renderer.sortObjects = false
    this.canvas = this.renderer.domElement

    // really basic touch handler that propagates through the scene
    this.touchHandler = createTouches(this.canvas, {
      target: this.canvas,
      filtered: true,
    })
    this.touchHandler.on('start', (ev, pos) => this.traverse('onTouchStart', ev, pos))
    this.touchHandler.on('end', (ev, pos) => this.traverse('onTouchEnd', ev, pos))
    this.touchHandler.on('move', (ev, pos) => this.traverse('onTouchMove', ev, pos))

    this.renderer.setClearColor(background, backgroundAlpha)

    // clamp pixel ratio for performance
    this.maxPixelRatio = options.maxPixelRatio || 2
    // clamp delta to stepping anything too far forward
    this.maxDeltaTime = options.maxDeltaTime || 1 / 30

    // setup a basic camera
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far)

    if (useOrbitControls) {
      // set up a simple orbit controller
      this.controls = createOrbitControls({
        element: this.canvas,
        parent: window,
        distance: 4,
        ...options,
      })
    }

    this.time = 0
    this.isRunning = false
    this._lastTime = performance.now()
    this._rafID = null

    this.scene = new THREE.Scene()

    // handle resize events
    window.addEventListener('resize', this.resize)
    window.addEventListener('orientationchange', this.resize)

    // force an initial resize event
    this.resize()

    if (showFps) {
      this.stats = new Stats()
      this.stats.showPanel(0)
      document.body.appendChild(this.stats.dom)
    }
  }

  resize = (
    width = window.innerWidth,
    height = window.innerHeight,
    pixelRatio = Math.min(this.maxPixelRatio, window.devicePixelRatio),
  ) => {
    this.width = width
    this.height = height
    this.pixelRatio = pixelRatio

    // update pixel ratio if necessary
    if (this.renderer.getPixelRatio() !== pixelRatio) {
      this.renderer.setPixelRatio(pixelRatio)
    }

    // setup new size & update camera aspect if necessary
    this.renderer.setSize(width, height)
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / height
    }
    this.camera.updateProjectionMatrix()

    // draw a frame to ensure the new size has been registered visually
    this.draw()
    return this
  }

  // convenience function to trigger a PNG download of the canvas
  saveScreenshot = ({ width = 2560, height = 1440, fileName = 'image.png' }) => {
    // force a specific output size
    this.resize(width, height, 1, true)
    this.draw()

    const dataURI = this.canvas.toDataURL('image/png')

    // reset to default size
    this.resize()
    this.draw()

    // save
    saveDataURI(fileName, dataURI)
  }

  update = (dt = 0, time = 0) => {
    if (this.controls) {
      this.controls.update()

      // reposition to orbit controls
      this.camera.up.fromArray(this.controls.up)
      this.camera.position.fromArray(this.controls.position)
      this.tmpTarget.fromArray(this.controls.target)
      this.camera.lookAt(this.tmpTarget)
    }

    // recursively tell all child objects to update
    this.scene.traverse(obj => {
      if (typeof obj.update === 'function') {
        obj.update(dt, time)
      }
    })

    return this
  }

  draw = () => {
    this.renderer.render(this.scene, this.camera)
    return this
  }

  start = () => {
    if (this._rafID !== null) return
    this._rafID = window.requestAnimationFrame(this.animate)
    this.isRunning = true
    return this
  }

  stop = () => {
    if (this._rafID === null) return
    window.cancelAnimationFrame(this._rafID)
    this._rafID = null
    this.isRunning = false
    return this
  }

  animate = () => {
    if (!this.isRunning) return
    window.requestAnimationFrame(this.animate)

    if (this.stats) this.stats.begin()

    const now = performance.now()
    const dt = Math.min(this.maxDeltaTime, (now - this._lastTime) / 1000)
    this.time += dt
    this._lastTime = now
    this.update(dt, this.time)
    this.draw()

    if (this.stats) this.stats.end()
  }

  traverse = (fn, ...args) => {
    this.scene.traverse(child => {
      if (typeof child[fn] === 'function') {
        child[fn].apply(child, args)
      }
    })
  }
}

function saveDataURI(name, dataURI) {
  const blob = dataURIToBlob(dataURI)

  // force download
  const link = document.createElement('a')
  link.download = name
  link.href = window.URL.createObjectURL(blob)
  link.onclick = () => {
    setTimeout(() => {
      window.URL.revokeObjectURL(blob)
      link.removeAttribute('href')
    }, 0)
  }
  link.click()
}
