// Credit for this code goes to Matt DesLauriers @mattdesl,
// really awesome dude, give him a follow!
// https://github.com/mattdesl/threejs-app/blob/master/src/util/loadEnvMap.js
import * as THREE from 'three'
import EquiToCube from './EquiToCube'
import loadTexture from './loadTexture'
import clamp from 'lodash/clamp'

export default async function loadEnvMap(options) {
  const renderer = options.renderer
  const basePath = options.url

  if (!renderer)
    throw new Error(`PBR Map requires renderer to passed in the options for ${basePath}!`)

  if (options.equirectangular) {
    const equiToCube = new EquiToCube(renderer)
    try {
      const texture = await loadTexture(basePath, { renderer })
      equiToCube.convert(texture)
      texture.dispose() // dispose original texture
      texture.image.data = null // remove Image reference
      return buildCubeMap(equiToCube.cubeTexture, options)
    } catch (err) {
      throw new Error(err)
    }
  }

  const isHDR = options.hdr
  const extension = isHDR ? '.hdr' : '.png'
  const urls = genCubeUrls(`${basePath.replace(/\/$/, '')}/`, extension)

  if (isHDR) {
    // load a float HDR texture
    return new Promise((resolve, reject) => {
      new THREE.HDRCubeTextureLoader().load(
        THREE.UnsignedByteType,
        urls,
        map => resolve(buildCubeMap(map, options)),
        null,
        () => reject(new Error(`Could not load PBR map: ${basePath}`)),
      )
    })
  }

  // load a RGBM encoded texture
  return new Promise((resolve, reject) => {
    new THREE.CubeTextureLoader().load(
      urls,
      cubeMap => {
        cubeMap.encoding = THREE.RGBM16Encoding
        resolve(buildCubeMap(cubeMap, options))
      },
      null,
      () => reject(new Error(`Could not load PBR map: ${basePath}`)),
    )
  })
}

function buildCubeMap(cubeMap, options) {
  if (options.pbr || typeof options.level === 'number') {
    // prefilter the environment map for irradiance
    const pmremGenerator = new THREE.PMREMGenerator(cubeMap)
    pmremGenerator.update(options.renderer)
    if (options.pbr) {
      const pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods)
      pmremCubeUVPacker.update(options.renderer)
      const target = pmremCubeUVPacker.CubeUVRenderTarget
      cubeMap = target.texture
    } else {
      const idx = clamp(Math.floor(options.level), 0, pmremGenerator.cubeLods.length)
      cubeMap = pmremGenerator.cubeLods[idx].texture
    }
  }
  if (options.mapping) cubeMap.mapping = options.mapping
  return cubeMap
}

function genCubeUrls(prefix, postfix) {
  return [
    prefix + 'px' + postfix,
    prefix + 'nx' + postfix,
    prefix + 'py' + postfix,
    prefix + 'ny' + postfix,
    prefix + 'pz' + postfix,
    prefix + 'nz' + postfix,
  ]
}
