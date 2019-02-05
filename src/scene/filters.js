import * as PIXI from 'pixi.js'
import colorAdjustmentFrag from './shaders/color-adjustment.frag'

export function addFilters(webgl) {
  const displacementSprite = PIXI.Sprite.from('/assets/noise.jpg')
  const displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite)
  displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.MIRRORED_REPEAT
  webgl.pixi.stage.addChild(displacementSprite)

  const colorCorrectionFilter = new PIXI.Filter(null, colorAdjustmentFrag)
  const colorMatrix = new PIXI.filters.ColorMatrixFilter()
  colorMatrix.technicolor(true)
  webgl.pixi.stage.filters = [colorMatrix, colorCorrectionFilter, displacementFilter]

  displacementFilter.scale.set(25)
  const speed = 8
  webgl.onUpdate((dt = 0, time = 0) => {
    displacementSprite.x += 10 * speed * dt
    displacementSprite.y += 3 * speed * dt
  })
}
