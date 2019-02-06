import * as PIXI from 'pixi.js'
import assets from '../lib/AssetManager'
import colorAdjustmentFrag from './shaders/color-adjustment.frag'

const noiseKey = assets.queue({
  url: 'assets/noise.jpg',
  type: 'image',
})

export function addFilters(webgl) {
  const noiseTexture = assets.get(noiseKey)
  const displacementSprite = PIXI.Sprite.from(noiseTexture)
  const displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite)

  // mirrored repeat so there are no seams
  displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.MIRRORED_REPEAT

  webgl.pixi.stage.addChild(displacementSprite)

  const colorCorrectionFilter = new PIXI.Filter(null, colorAdjustmentFrag)

  webgl.pixi.stage.filters = [colorCorrectionFilter, displacementFilter]

  // PERF cache the size of the filter
  // https://github.com/pixijs/pixi.js/wiki/v4-Performance-Tips
  webgl.pixi.stage.filters.forEach(filter => {
    filter.filterArea = webgl.pixi.screen
  })

  displacementFilter.scale.set(25)
  const speed = 8
  webgl.onUpdate((dt = 0, time = 0) => {
    displacementSprite.x += 10 * speed * dt
    displacementSprite.y += 3 * speed * dt
  })
}
