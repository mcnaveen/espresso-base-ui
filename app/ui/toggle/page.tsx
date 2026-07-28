"use client"

import * as React from "react"
import {
  Bold,
  Italic,
  Underline,
  Star,
  Bell,
  BellOff,
  Mic,
  MicOff,
} from "lucide-react"
import { Toggle } from "@/components/ui/toggle"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function TogglePage() {
  const [bold, setBold] = React.useState(false)
  const [starred, setStarred] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const [notifications, setNotifications] = React.useState(true)

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

      {/* Controlled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <div className="flex items-center gap-3">
          <Toggle
            variant="outline"
            aria-label="Toggle bold"
            pressed={bold}
            onPressedChange={setBold}
          >
            <Bold />
          </Toggle>
          <p className="text-sm text-muted-foreground">
            Bold is {bold ? "on" : "off"}
          </p>
        </div>
      </div>

      {/* Icon swap */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Icon swap</SectionTitle>
        <div className="flex items-center gap-2">
          <Toggle
            variant="outline"
            aria-label="Toggle notifications"
            pressed={notifications}
            onPressedChange={setNotifications}
          >
            {notifications ? <Bell /> : <BellOff />}
          </Toggle>
          <Toggle
            variant="outline"
            aria-label="Toggle mute"
            pressed={muted}
            onPressedChange={setMuted}
          >
            {muted ? <MicOff /> : <Mic />}
          </Toggle>
          <Toggle
            variant="outline"
            aria-label="Toggle favorite"
            pressed={starred}
            onPressedChange={setStarred}
          >
            <Star
              className={starred ? "fill-current" : undefined}
            />
          </Toggle>
        </div>
      </div>

      {/* All states */}
      <div className="flex flex-col gap-4">
        <SectionTitle>All states</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  State
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  default
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  outline
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  Off
                </td>
                <td className="px-4 py-3">
                  <Toggle aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
                <td className="px-4 py-3">
                  <Toggle variant="outline" aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  On
                </td>
                <td className="px-4 py-3">
                  <Toggle defaultPressed aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
                <td className="px-4 py-3">
                  <Toggle variant="outline" defaultPressed aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  Disabled off
                </td>
                <td className="px-4 py-3">
                  <Toggle disabled aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
                <td className="px-4 py-3">
                  <Toggle variant="outline" disabled aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  Disabled on
                </td>
                <td className="px-4 py-3">
                  <Toggle disabled defaultPressed aria-label="Bold">
                    <Bold />
                  </Toggle>
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    variant="outline"
                    disabled
                    defaultPressed
                    aria-label="Bold"
                  >
                    <Bold />
                  </Toggle>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
