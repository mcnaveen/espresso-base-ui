"use client"

import { Meter as MeterPrimitive } from "@base-ui/react/meter"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const meterVariants = cva(
  "group/meter flex flex-wrap items-center gap-2.5",
  {
    variants: {
      size: {
        sm: "",
        default: "",
        lg: "",
        xl: "",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Meter({
  className,
  children,
  size = "default",
  value,
  min,
  max,
  ...props
}: MeterPrimitive.Root.Props & VariantProps<typeof meterVariants>) {
  return (
    <MeterPrimitive.Root
      value={value}
      min={min}
      max={max}
      data-slot="meter"
      data-size={size}
      className={cn(meterVariants({ size }), className)}
      {...props}
    >
      {children}
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </MeterPrimitive.Root>
  )
}

function MeterTrack({ className, ...props }: MeterPrimitive.Track.Props) {
  return (
    <MeterPrimitive.Track
      data-slot="meter-track"
      className={cn(
        "relative flex w-full items-center overflow-x-hidden rounded-full bg-secondary",
        "group-data-[size=sm]/meter:h-0.5",
        "group-data-[size=default]/meter:h-1",
        "group-data-[size=lg]/meter:h-2",
        "group-data-[size=xl]/meter:h-3",
        className
      )}
      {...props}
    />
  )
}

function MeterIndicator({
  className,
  ...props
}: MeterPrimitive.Indicator.Props) {
  return (
    <MeterPrimitive.Indicator
      data-slot="meter-indicator"
      className={cn("h-full rounded-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function MeterLabel({ className, ...props }: MeterPrimitive.Label.Props) {
  return (
    <MeterPrimitive.Label
      data-slot="meter-label"
      className={cn(
        "text-base leading-base font-medium tracking-normal text-secondary-foreground",
        className
      )}
      {...props}
    />
  )
}

function MeterValue({ className, ...props }: MeterPrimitive.Value.Props) {
  return (
    <MeterPrimitive.Value
      data-slot="meter-value"
      className={cn(
        "ml-auto text-base leading-base font-medium tracking-normal text-accent-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Meter, MeterTrack, MeterIndicator, MeterLabel, MeterValue, meterVariants }
