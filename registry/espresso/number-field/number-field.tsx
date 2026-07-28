"use client"

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { MinusIcon, PlusIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function NumberField({ ...props }: NumberFieldPrimitive.Root.Props) {
  return <NumberFieldPrimitive.Root data-slot="number-field" {...props} />
}

const numberFieldGroupVariants = cva(
  [
    "flex w-fit items-center rounded-md bg-background shadow-[0px_1px_1px_#0000000f,0px_0px_0px_1px_#00000012] dark:shadow-[0px_1px_1px_rgba(0,0,0,0.08),0px_0px_0px_1px_rgba(255,255,255,0.1)]",
    "has-[[data-slot=number-field-input][data-disabled]]:pointer-events-none has-[[data-slot=number-field-input][data-disabled]]:cursor-not-allowed has-[[data-slot=number-field-input][data-disabled]]:bg-input has-[[data-slot=number-field-input][data-disabled]]:text-popover-foreground",
    "has-[[data-slot=number-field-input][data-invalid]]:shadow-[0px_1px_1px_#0000000f,0px_0px_0px_1px_var(--error-outline)]!",
  ],
  {
    variants: {
      size: {
        sm: "h-7 rounded-md",
        default: "h-8 rounded-md",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function NumberFieldGroup({
  className,
  size = "default",
  ...props
}: NumberFieldPrimitive.Group.Props & VariantProps<typeof numberFieldGroupVariants>) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      className={cn(numberFieldGroupVariants({ size }), className)}
      {...props}
    />
  )
}

function NumberFieldDecrement({
  className,
  ...props
}: NumberFieldPrimitive.Decrement.Props) {
  return (
    <NumberFieldPrimitive.Decrement
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0 rounded-r-none", className)}
        />
      }
      {...props}
    >
      <MinusIcon />
    </NumberFieldPrimitive.Decrement>
  )
}

function NumberFieldIncrement({
  className,
  ...props
}: NumberFieldPrimitive.Increment.Props) {
  return (
    <NumberFieldPrimitive.Increment
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0 rounded-l-none", className)}
        />
      }
      {...props}
    >
      <PlusIcon />
    </NumberFieldPrimitive.Increment>
  )
}

function NumberFieldInput({
  className,
  ...props
}: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      className={cn(
        "w-16 flex-1 border-x border-border-soft bg-transparent text-center text-base leading-base font-normal tracking-normal text-secondary-foreground outline-none",
        className
      )}
      {...props}
    />
  )
}

export {
  NumberField,
  NumberFieldGroup,
  numberFieldGroupVariants,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
}
