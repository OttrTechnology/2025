import { Moon, Sun } from "lucide-react"
import { useMemo, useState } from "react"

import { RippleControls } from "@/components/ripple-controls"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { ImageRippleEffect } from "@/components/ui/image-ripple-effect"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { IMAGE_RIPPLE_DEFAULT_CONFIG } from "@/lib/image-ripple-settings"

const THEME_CLEAR_COLORS = {
  dark: "#0a0a0a",
  light: "#ffffff",
} as const

const THEME_LOGOS = {
  dark: "/ottr_logo-dark.png",
  light: "/ottr_logo.png",
} as const

export function App() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(IMAGE_RIPPLE_DEFAULT_CONFIG)
  const applied = useDebouncedValue(settings, 150)
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const clearColor = isDark ? THEME_CLEAR_COLORS.dark : THEME_CLEAR_COLORS.light
  const logoSrc = isDark ? THEME_LOGOS.dark : THEME_LOGOS.light

  const images = useMemo(
    () => [
      {
        src: logoSrc,
        x: applied.imageX,
        y: applied.imageY,
        widthScale: applied.imageWidthScale,
        heightScale: applied.imageHeightScale,
      },
    ],
    [applied, logoSrc]
  )

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <ImageRippleEffect
        className="h-svh w-full"
        clearColor={clearColor}
        images={images}
        brushTextureUrl={applied.brushTextureUrl}
        distortionStrength={applied.distortionStrength}
        waveCount={applied.waveCount}
        waveSize={applied.waveSize}
        waveRotationSpeed={applied.waveRotationSpeed}
        waveFadeMultiplier={applied.waveFadeMultiplier}
        waveGrowth={applied.waveGrowth}
        waveSpawnThreshold={applied.waveSpawnThreshold}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <p className="pointer-events-none text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Ottr
        </p>
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex p-4 pt-16">
        <div className="pointer-events-auto ml-auto flex h-full min-h-0 items-end">
          <RippleControls
            value={settings}
            onChange={setSettings}
            onReset={() => setSettings(IMAGE_RIPPLE_DEFAULT_CONFIG)}
          />
        </div>
      </div>
    </div>
  )
}

export default App
