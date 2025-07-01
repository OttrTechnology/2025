import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  configsMatch,
  PRESETS,
  type ImageRipplePlaygroundConfig,
} from "@/lib/image-ripple-settings"

type RippleControlsProps = {
  value: ImageRipplePlaygroundConfig
  onChange: (next: ImageRipplePlaygroundConfig) => void
  onReset: () => void
}

function NumberSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  format = (n) => n.toString(),
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono text-[11px] tabular-nums">{format(value)}</span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => {
          const parsed = Array.isArray(next) ? next[0] : next
          if (typeof parsed === "number") onChange(parsed)
        }}
      />
    </div>
  )
}

export function RippleControls({ value, onChange, onReset }: RippleControlsProps) {
  const patch = (partial: Partial<ImageRipplePlaygroundConfig>) =>
    onChange({ ...value, ...partial })

  return (
    <Card
      size="sm"
      className="flex max-h-full w-[min(calc(100vw-1.5rem),280px)] flex-col overflow-hidden bg-card/85 backdrop-blur-md"
    >
      <CardHeader className="shrink-0 border-b">
        <CardTitle>Ripple</CardTitle>
        <CardAction>
          <Button variant="ghost" size="xs" onClick={onReset}>
            <RotateCcw />
            Reset
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Preset
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const active = configsMatch(value, preset.config)
              return (
                <Button
                  key={preset.name}
                  size="xs"
                  variant={active ? "default" : "outline"}
                  onClick={() => onChange(preset.config)}
                >
                  {preset.name}
                </Button>
              )
            })}
          </div>
        </div>

        <NumberSlider
          id="imageX"
          label="Image X"
          value={value.imageX}
          min={-0.5}
          max={0.5}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(imageX) => patch({ imageX })}
        />
        <NumberSlider
          id="imageY"
          label="Image Y"
          value={value.imageY}
          min={-0.5}
          max={0.5}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(imageY) => patch({ imageY })}
        />
        <NumberSlider
          id="imageWidthScale"
          label="Width scale"
          value={value.imageWidthScale}
          min={0.1}
          max={0.8}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(imageWidthScale) => patch({ imageWidthScale })}
        />
        <NumberSlider
          id="imageHeightScale"
          label="Height scale"
          value={value.imageHeightScale}
          min={0.1}
          max={0.9}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(imageHeightScale) => patch({ imageHeightScale })}
        />
        <NumberSlider
          id="distortionStrength"
          label="Distortion"
          value={value.distortionStrength}
          min={0.01}
          max={0.25}
          step={0.005}
          format={(n) => n.toFixed(3)}
          onChange={(distortionStrength) => patch({ distortionStrength })}
        />
        <NumberSlider
          id="waveCount"
          label="Wave count"
          value={value.waveCount}
          min={20}
          max={240}
          step={1}
          onChange={(waveCount) => patch({ waveCount })}
        />
        <NumberSlider
          id="waveSize"
          label="Wave size"
          value={value.waveSize}
          min={24}
          max={120}
          step={1}
          onChange={(waveSize) => patch({ waveSize })}
        />
        <NumberSlider
          id="waveRotationSpeed"
          label="Rotation speed"
          value={value.waveRotationSpeed}
          min={0}
          max={0.08}
          step={0.001}
          format={(n) => n.toFixed(3)}
          onChange={(waveRotationSpeed) => patch({ waveRotationSpeed })}
        />
        <NumberSlider
          id="waveFadeMultiplier"
          label="Fade"
          value={value.waveFadeMultiplier}
          min={0.85}
          max={0.99}
          step={0.001}
          format={(n) => n.toFixed(3)}
          onChange={(waveFadeMultiplier) => patch({ waveFadeMultiplier })}
        />
        <NumberSlider
          id="waveGrowth"
          label="Growth"
          value={value.waveGrowth}
          min={0.05}
          max={0.3}
          step={0.005}
          format={(n) => n.toFixed(3)}
          onChange={(waveGrowth) => patch({ waveGrowth })}
        />
        <NumberSlider
          id="waveSpawnThreshold"
          label="Spawn threshold"
          value={value.waveSpawnThreshold}
          min={0.01}
          max={0.5}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(waveSpawnThreshold) => patch({ waveSpawnThreshold })}
        />
      </CardContent>
    </Card>
  )
}
