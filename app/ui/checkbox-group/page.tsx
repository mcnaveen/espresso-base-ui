"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckboxGroup } from "@/components/ui/checkbox-group"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const FRUITS = ["apple", "banana", "cherry"]

export default function CheckboxGroupPage() {
  const [value, setValue] = React.useState<string[]>(["apple"])

  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <CheckboxGroup defaultValue={["banana"]}>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="apple" size="sm" />
            Apple
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="banana" size="sm" />
            Banana
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="cherry" size="sm" />
            Cherry
          </label>
        </CheckboxGroup>
      </div>

      {/* Controlled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <CheckboxGroup value={value} onValueChange={setValue}>
          {FRUITS.map((fruit) => (
            <label
              key={fruit}
              className="flex items-center gap-2 text-sm text-secondary-foreground capitalize"
            >
              <Checkbox name={fruit} size="sm" />
              {fruit}
            </label>
          ))}
        </CheckboxGroup>
        <p className="text-sm text-muted-foreground">
          Selected: {value.length > 0 ? value.join(", ") : "none"}
        </p>
      </div>

      {/* Disabled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <CheckboxGroup disabled defaultValue={["banana"]}>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="apple" size="sm" />
            Apple
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="banana" size="sm" />
            Banana
          </label>
        </CheckboxGroup>
      </div>
    </div>
  )
}
