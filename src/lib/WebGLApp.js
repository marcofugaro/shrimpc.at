// Inspiration for this class goes to Matt DesLauriers @mattdesl,
// really awesome dude, give him a follow!
// https://github.com/mattdesl/threejs-app/blob/master/src/webgl/WebGLApp.js
import * as THREE from 'three'
import createOrbitControls from 'orbit-controls'
import createTouches from 'touches'
import dataURIToBlob from 'datauritoblob'
import Stats from 'stats.js'
import controlPanel from 'control-panel'
import { EffectComposer } from './three/EffectComposer'
import { RenderPass } from './three/RenderPass'

export default class WebGLApp {
  #tmpTarget = new THREE.Vector3()
  #updateListeners = []

  constructor({
    background = '#000',
    backgroundAlpha = 1,
    fov = 45,
    near = 0.01,
    far = 100,
    ...options
  } = {}) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      // enabled for saving screen shots of the canvas,
      // may wish to disable this for perf reasons
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: true,
      ...options,
      // render to an offscreen canvas if we use pixi.js
      canvas: options.pixi ? document.createElement('canvas') : options.canvas,
    })

    this.renderer.sortObjects = false
    this.canvas = options.canvas

    this.renderer.setClearColor(background, backgroundAlpha)

    // clamp pixel ratio for performance
    this.maxPixelRatio = options.maxPixelRatio || 2
    // clamp delta to stepping anything too far forward
    this.maxDeltaTime = options.maxDeltaTime || 1 / 30

    // setup a basic camera
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far)

    this.scene = new THREE.Scene()

    this.time = 0
    this.isRunning = false
    this._lastTime = performance.now()
    this._rafID = null

    // handle resize events
    window.addEventListener('resize', this.resize)
    window.addEventListener('orientationchange', this.resize)

    // force an initial resize event
    this.resize()

    // __________________________ADDONS__________________________

    // really basic touch handler that propagates through the scene
    this.touchHandler = createTouches(this.canvas, {
      target: this.canvas,
      filtered: true,
    })
    this.touchHandler.on('start', (ev, pos) => this.traverse('onTouchStart', ev, pos))
    this.touchHandler.on('end', (ev, pos) => this.traverse('onTouchEnd', ev, pos))
    this.touchHandler.on('move', (ev, pos) => this.traverse('onTouchMove', ev, pos))

    // expose a composer for postprocessing passes
    if (options.postprocessing) {
      this.composer = new EffectComposer(this.renderer)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
    }

    // set up a simple orbit controller
    if (options.orbitControls) {
      this.orbitControls = createOrbitControls({
        element: this.canvas,
        parent: window,
        distance: 4,
        ...(options.orbitControls instanceof Object ? options.orbitControls : {}),
      })
    }

    // Attach the Cannon physics engine
    if (options.world) this.world = options.world

    // Attach Tween.js
    if (options.tween) this.tween = options.tween

    // Init Pixi.js
    if (options.pixi) {
      const PIXI = options.pixi

      this.pixi = new PIXI.Application({
        view: this.canvas,
        resizeTo: window,
        antialias: true,
        transparent: true,
        autoDensity: true,
        resolution: this.pixelRatio,
        ...options.pixiOptions,
      })

      // make its direct children sortable
      this.pixi.stage.sortableChildren = true

      // Render three.js as a pixi layer
      const threeTexture = PIXI.Texture.from(this.renderer.domElement)
      this.threeSprite = new PIXI.Sprite(threeTexture)
      // TODO find a more efficient way to do this
      this.threeSprite.scale.x /= this.pixelRatio
      this.threeSprite.scale.y /= this.pixelRatio
      this.pixi.stage.addChild(this.threeSprite)
    }

    // show the fps meter
    if (options.showFps) {
      this.stats = new Stats()
      this.stats.showPanel(0)
      document.body.appendChild(this.stats.dom)
    }

    // initialize the control panel
    if (options.panelInputs) {
      this.panel = controlPanel(options.panelInputs, {
        theme: 'dark',
        position: 'top-right',
        ...(options.panelOptions instanceof Object ? options.panelOptions : {}),
      })
    }
  }

  resize = ({
    width = window.innerWidth,
    height = window.innerHeight,
    pixelRatio = Math.min(this.maxPixelRatio, window.devicePixelRatio),
  } = {}) => {
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

    // resize also the composer
    if (this.composer) {
      this.composer.setSize(pixelRatio * width, pixelRatio * height)
    }

    // recursively tell all child objects to resize
    this.scene.traverse(obj => {
      if (typeof obj.resize === 'function') {
        obj.resize({
          width,
          height,
          pixelRatio,
        })
      }
    })

    // draw a frame to ensure the new size has been registered visually
    this.draw()
    return this
  }

  // convenience function to trigger a PNG download of the canvas
  saveScreenshot = ({ width = 2560, height = 1440, fileName = 'image.png' } = {}) => {
    // force a specific output size
    this.resize({ width, height, pixelRatio: 1 })
    this.draw()

    // TODO fix this with pixi
    const dataURI = this.canvas.toDataURL('image/png')

    // reset to default size
    this.resize()
    this.draw()

    // save
    saveDataURI(fileName, dataURI)
  }

  update = (dt = 0, time = 0) => {
    if (this.orbitControls) {
      this.orbitControls.update()

      // reposition to orbit controls
      this.camera.up.fromArray(this.orbitControls.up)
      this.camera.position.fromArray(this.orbitControls.position)
      this.#tmpTarget.fromArray(this.orbitControls.target)
      this.camera.lookAt(this.#tmpTarget)
    }

    // recursively tell all child objects to update
    this.scene.traverse(obj => {
      if (typeof obj.update === 'function') {
        obj.update(dt, time)
      }
    })

    if (this.world) {
      // update the Cannon physics engine
      this.world.step(dt)

      // recursively tell all child bodies to update
      this.world.bodies.forEach(body => {
        if (typeof body.update === 'function') {
          body.update(dt, time)
        }
      })
    }

    if (this.tween) {
      // update the Tween.js engine
      this.tween.update()
    }

    if (this.pixi) {
      // tell pixi that threejs has changed
      this.threeSprite.texture.update()

      this.pixi.render()

      // recursively tell all child containers to update
      this.pixi.stage.children.forEach(container => {
        if (typeof container.update === 'function') {
          container.update(dt, time)
        }
      })
    }

    // call the update listeners
    this.#updateListeners.forEach(fn => fn(dt, time))

    return this
  }

  onUpdate(fn) {
    this.#updateListeners.push(fn)
  }

  draw = () => {
    if (this.composer) {
      // make sure to always render the last pass
      this.composer.passes.forEach((pass, i, passes) => {
        const isLastElement = i === passes.length - 1

        if (isLastElement) {
          pass.renderToScreen = true
        } else {
          pass.renderToScreen = false
        }
      })

      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
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
  link.onclick = setTimeout(() => {
    window.URL.revokeObjectURL(blob)
    link.removeAttribute('href')
  }, 0)

  link.click()
}
