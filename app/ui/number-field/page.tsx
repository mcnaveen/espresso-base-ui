"use client"

import {
  NumberField,
  NumberFieldGroup,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function NumberFieldPage() {
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
    </div>
  )
}
