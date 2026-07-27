"use client"

import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function ToggleGroupPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Single selection */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Single selection</SectionTitle>
        <ToggleGroup defaultValue={["left"]}>
          <Toggle value="left" aria-label="Align left">
            <AlignLeft />
          </Toggle>
          <Toggle value="center" aria-label="Align center">
            <AlignCenter />
          </Toggle>
          <Toggle value="right" aria-label="Align right">
            <AlignRight />
          </Toggle>
        </ToggleGroup>
      </div>

      {/* Multiple selection */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Multiple selection</SectionTitle>
        <ToggleGroup multiple defaultValue={["bold"]}>
          <Toggle value="bold" aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle value="italic" aria-label="Italic">
            <Italic />
          </Toggle>
        </ToggleGroup>
      </div>

      {/* Vertical */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Vertical</SectionTitle>
        <ToggleGroup orientation="vertical" defaultValue={["left"]}>
          <Toggle value="left" aria-label="Align left">
            <AlignLeft />
          </Toggle>
          <Toggle value="center" aria-label="Align center">
            <AlignCenter />
          </Toggle>
          <Toggle value="right" aria-label="Align right">
            <AlignRight />
          </Toggle>
        </ToggleGroup>
      </div>

      {/* Disabled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <ToggleGroup disabled defaultValue={["left"]}>
          <Toggle value="left" aria-label="Align left">
            <AlignLeft />
          </Toggle>
          <Toggle value="center" aria-label="Align center">
            <AlignCenter />
          </Toggle>
        </ToggleGroup>
      </div>
    </div>
  )
}
