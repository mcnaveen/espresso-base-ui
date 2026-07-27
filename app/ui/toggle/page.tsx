"use client"

import { Bold, Italic, Underline } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function TogglePage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <div className="flex items-center gap-2">
          <Toggle aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle aria-label="Italic" defaultPressed>
            <Italic />
          </Toggle>
          <Toggle aria-label="Underline">
            <Underline />
          </Toggle>
        </div>
      </div>

      {/* Outline */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Outline</SectionTitle>
        <div className="flex items-center gap-2">
          <Toggle variant="outline" aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle variant="outline" aria-label="Italic" defaultPressed>
            <Italic />
          </Toggle>
        </div>
      </div>

      {/* Sizes */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Sizes</SectionTitle>
        <div className="flex items-center gap-2">
          <Toggle size="sm" aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle size="default" aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle size="lg" aria-label="Bold">
            <Bold />
          </Toggle>
        </div>
      </div>

      {/* With text */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With text</SectionTitle>
        <Toggle aria-label="Toggle italic">
          <Italic />
          Italic
        </Toggle>
      </div>

      {/* Disabled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <div className="flex items-center gap-2">
          <Toggle disabled aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle disabled defaultPressed aria-label="Italic">
            <Italic />
          </Toggle>
        </div>
      </div>
    </div>
  )
}
