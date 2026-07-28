"use client"

import * as React from "react"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Grid2x2,
  List,
  Rows3,
} from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function ToggleGroupPage() {
  const [view, setView] = React.useState<string[]>(["grid"])

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

      {/* Disabled item */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled item</SectionTitle>
        <ToggleGroup multiple defaultValue={["bold"]}>
          <Toggle value="bold" aria-label="Bold">
            <Bold />
          </Toggle>
          <Toggle value="italic" aria-label="Italic" disabled>
            <Italic />
          </Toggle>
          <Toggle value="underline" aria-label="Underline">
            <Underline />
          </Toggle>
        </ToggleGroup>
      </div>

      {/* With text */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With text</SectionTitle>
        <ToggleGroup defaultValue={["list"]}>
          <Toggle value="grid" aria-label="Grid view">
            <Grid2x2 />
            Grid
          </Toggle>
          <Toggle value="list" aria-label="List view">
            <List />
            List
          </Toggle>
        </ToggleGroup>
      </div>

      {/* Sizes */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Sizes</SectionTitle>
        <div className="flex items-center gap-4">
          <ToggleGroup defaultValue={["left"]}>
            <Toggle value="left" size="sm" aria-label="Align left">
              <AlignLeft />
            </Toggle>
            <Toggle value="center" size="sm" aria-label="Align center">
              <AlignCenter />
            </Toggle>
            <Toggle value="right" size="sm" aria-label="Align right">
              <AlignRight />
            </Toggle>
          </ToggleGroup>
          <ToggleGroup defaultValue={["left"]}>
            <Toggle value="left" size="lg" aria-label="Align left">
              <AlignLeft />
            </Toggle>
            <Toggle value="center" size="lg" aria-label="Align center">
              <AlignCenter />
            </Toggle>
            <Toggle value="right" size="lg" aria-label="Align right">
              <AlignRight />
            </Toggle>
          </ToggleGroup>
        </div>
      </div>

      {/* Controlled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <div className="flex items-center gap-3">
          <ToggleGroup value={view} onValueChange={setView}>
            <Toggle value="grid" aria-label="Grid view">
              <Grid2x2 />
            </Toggle>
            <Toggle value="list" aria-label="List view">
              <List />
            </Toggle>
            <Toggle value="rows" aria-label="Rows view">
              <Rows3 />
            </Toggle>
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">
            View: {view[0] ?? "none"}
          </p>
        </div>
      </div>
    </div>
  )
}
