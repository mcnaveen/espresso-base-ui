"use client"

import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@/lib/utils"

function ToggleGroup({
  className,
  orientation = "horizontal",
  ...props
}: ToggleGroupPrimitive.Props<string>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      orientation={orientation}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-secondary p-1 data-vertical:flex-col",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup }
