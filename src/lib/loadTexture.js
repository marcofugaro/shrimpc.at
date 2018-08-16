// Credit for this code goes to Matt DesLauriers @mattdesl,
// really awesome dude, give him a follow!
// https://github.com/mattdesl/threejs-app/blob/master/src/util/loadTexture.js
import {
  Texture,
  LinearEncoding,
  RGBFormat,
  RGBAFormat,
  ClampToEdgeWrapping,
  LinearMipMapLinearFilter,
  LinearFilter,
} from 'three'
import loadImg from 'image-promise'

export default async function loadTexture(url, options) {
  const texture = new Texture()
  texture.name = url
  texture.encoding = options.encoding || LinearEncoding
  setTextureParams(url, texture, options)

  try {
    const image = await loadImg(url)

    texture.image = image
    texture.needsUpdate = true
    if (options.renderer) {
      // Force texture to be uploaded to GPU immediately,
      // this will avoid "jank" on first rendered frame
      options.renderer.setTexture2D(texture, 0)
    }
    return texture
  } catch (err) {
    throw new Error(`Could not load texture ${url}`)
  }
}

function setTextureParams(url, texture, opt) {
  if (typeof opt.flipY === 'boolean') texture.flipY = opt.flipY
  if (typeof opt.mapping !== 'undefined') {
    texture.mapping = opt.mapping
  }
  if (typeof opt.format !== 'undefined') {
    texture.format = opt.format
  } else {
    // choose a nice default format
    const isJPEG = url.search(/\.(jpg|jpeg)$/) > 0 || url.search(/^data\:image\/jpeg/) === 0
    texture.format = isJPEG ? RGBFormat : RGBAFormat
  }
  if (opt.repeat) texture.repeat.copy(opt.repeat)
  texture.wrapS = opt.wrapS || ClampToEdgeWrapping
  texture.wrapT = opt.wrapT || ClampToEdgeWrapping
  texture.minFilter = opt.minFilter || LinearMipMapLinearFilter
  texture.magFilter = opt.magFilter || LinearFilter
  texture.generateMipmaps = opt.generateMipmaps !== false
}
