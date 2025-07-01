export type ImageRipplePlaygroundConfig = {
  imageSrc: string
  brushTextureUrl: string
  imageX: number
  imageY: number
  imageWidthScale: number
  imageHeightScale: number
  distortionStrength: number
  waveCount: number
  waveSize: number
  waveRotationSpeed: number
  waveFadeMultiplier: number
  waveGrowth: number
  waveSpawnThreshold: number
}

export const IMAGE_RIPPLE_DEFAULT_CONFIG: ImageRipplePlaygroundConfig = {
  imageSrc: "/ottr_logo.png",
  brushTextureUrl: "/brush.png",
  imageX: 0,
  imageY: 0,
  imageWidthScale: 0.42,
  imageHeightScale: 0.42,
  distortionStrength: 0.075,
  waveCount: 100,
  waveSize: 60,
  waveRotationSpeed: 0.025,
  waveFadeMultiplier: 0.95,
  waveGrowth: 0.155,
  waveSpawnThreshold: 0.1,
}

export const PRESETS: Array<{
  name: string
  config: ImageRipplePlaygroundConfig
}> = [
  {
    name: "Default",
    config: IMAGE_RIPPLE_DEFAULT_CONFIG,
  },
  {
    name: "Gentle",
    config: {
      ...IMAGE_RIPPLE_DEFAULT_CONFIG,
      distortionStrength: 0.05,
      waveFadeMultiplier: 0.965,
      waveGrowth: 0.12,
      waveRotationSpeed: 0.016,
    },
  },
  {
    name: "Punchy",
    config: {
      ...IMAGE_RIPPLE_DEFAULT_CONFIG,
      distortionStrength: 0.1,
      waveCount: 140,
      waveSize: 72,
      waveFadeMultiplier: 0.93,
      waveGrowth: 0.18,
      waveRotationSpeed: 0.034,
    },
  },
  {
    name: "Dense",
    config: {
      ...IMAGE_RIPPLE_DEFAULT_CONFIG,
      waveCount: 180,
      waveSize: 54,
      waveSpawnThreshold: 0.05,
      waveFadeMultiplier: 0.955,
    },
  },
]

export function configsMatch(
  a: ImageRipplePlaygroundConfig,
  b: ImageRipplePlaygroundConfig
) {
  return (
    a.imageSrc === b.imageSrc &&
    a.brushTextureUrl === b.brushTextureUrl &&
    a.imageX === b.imageX &&
    a.imageY === b.imageY &&
    a.imageWidthScale === b.imageWidthScale &&
    a.imageHeightScale === b.imageHeightScale &&
    a.distortionStrength === b.distortionStrength &&
    a.waveCount === b.waveCount &&
    a.waveSize === b.waveSize &&
    a.waveRotationSpeed === b.waveRotationSpeed &&
    a.waveFadeMultiplier === b.waveFadeMultiplier &&
    a.waveGrowth === b.waveGrowth &&
    a.waveSpawnThreshold === b.waveSpawnThreshold
  )
}
