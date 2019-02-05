import * as PIXI from 'pixi.js'

export default class BackgroundVideo extends PIXI.Container {
  constructor({ webgl, ...options }) {
    super(options)

    // Render the video in pixi as a pixi layer
    const video = document.querySelector('video')
    const videoTexture = PIXI.Texture.from(video)
    const videoSprite = new PIXI.Sprite(videoTexture)

    const rendererRatio = webgl.pixi.renderer.width / webgl.pixi.renderer.height
    const ratio = video.videoWidth / video.videoHeight

    // like backgorund-size: cover
    if (ratio > rendererRatio) {
      videoSprite.height = webgl.pixi.renderer.height
      videoSprite.width = videoSprite.height * ratio
    } else {
      videoSprite.width = webgl.pixi.renderer.width
      videoSprite.height = videoSprite.width * (1 / ratio)
    }

    // center it
    videoSprite.anchor.set(0.5)
    videoSprite.x = webgl.pixi.renderer.width / 2
    videoSprite.y = webgl.pixi.renderer.height / 2

    this.addChild(videoSprite)

    // put it begind the threejs sprite
    this.zIndex = -1
  }
}
