"use client"

import * as React from "react"
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"
import { Field, FieldLabel } from "@/components/ui/field"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function NumberFieldPage() {
  const [quantity, setQuantity] = React.useState<number | null>(3)

  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <NumberField defaultValue={10}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Sizes */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Sizes</SectionTitle>
        <div className="flex items-center gap-4">
          <NumberField defaultValue={10}>
            <NumberFieldGroup size="sm">
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <NumberField defaultValue={10}>
            <NumberFieldGroup size="default">
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </div>
      </div>

      {/* Min / max / step */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Min / max / step</SectionTitle>
        <NumberField defaultValue={0} min={0} max={100} step={5}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Disabled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <NumberField defaultValue={10} disabled>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Read-only */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Read-only</SectionTitle>
        <NumberField defaultValue={42} readOnly>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Currency */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Currency</SectionTitle>
        <NumberField
          defaultValue={49.99}
          min={0}
          step={1}
          format={{ style: "currency", currency: "USD" }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* Percentage */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Percentage</SectionTitle>
        <NumberField
          defaultValue={0.25}
          min={0}
          max={1}
          step={0.05}
          format={{ style: "percent" }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </div>

      {/* With label */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With label</SectionTitle>
        <Field className="max-w-56">
          <FieldLabel htmlFor="quantity-field">Quantity</FieldLabel>
          <NumberField
            id="quantity-field"
            min={1}
            max={20}
            value={quantity}
            onValueChange={setQuantity}
          >
            <NumberFieldGroup className="w-full">
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </Field>
      </div>

      {/* Large / small step */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Large / small step</SectionTitle>
        <NumberField defaultValue={0} smallStep={0.1} step={1} largeStep={10}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
        <p className="text-sm text-muted-foreground">
          Hold Shift for ±10, Meta/Ctrl for ±0.1.
        </p>
      </div>
    </div>
  )
}
