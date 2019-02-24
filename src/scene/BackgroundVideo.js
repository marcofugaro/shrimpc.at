import * as PIXI from 'pixi.js'
import pEvent from 'p-event'

// it needs to be async because of the video loading stuff,
// otherwise this would stay in the constructor
export default async function addBackgorundVideo(webgl) {
  // Render the video in pixi as a pixi layer
  const url = 'assets/3d-fish-school.mp4'
  const videoTexture = PIXI.Texture.from(url, {
    // cap the video at 30, the source video framerate,
    // otherwise it would be the renderer's fps
    // BUG if I uncomment this line the shrimps bug out 🤔
    // resourceOptions: { updateFPS: 30 },
  })

  const video = videoTexture.baseTexture.resource.source

  video.muted = true
  video.loop = true

  // wait for the video to load so we have its width and height
  await pEvent(video, 'canplay')

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

  // put it begind the threejs sprite
  videoSprite.zIndex = -1

  return videoSprite
}
