"use client"

// The Text editor page, as the timeless-gowtham branch draws it: one
// editor and beside it the controls that pick which of the file's editors
// it is — outline, subtle or ghost; the bar on top or at the bottom; empty
// or filled; enabled or disabled. Hover, focus and typing are live.
import * as React from "react"

import { Editor } from "@/components/ui/editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const FILLED =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design.</p>"
// the ghost editor stands on its own text, as the file fills it
const GHOST =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design. Good typography enhances communication by guiding the reader's eye and emphasising important information. It also sets the tone and mood of the text Good typography enhances communication by guiding the reader's eye and emphasising important</p>"

const VARIANTS = [
  { label: "Outline", value: "outline" },
  { label: "Subtle", value: "subtle" },
  { label: "Ghost", value: "ghost" },
] as const
const TOOLBARS = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
] as const

export default function EditorPage() {
  const [variant, setVariant] =
    React.useState<(typeof VARIANTS)[number]["value"]>("outline")
  const [toolbar, setToolbar] =
    React.useState<(typeof TOOLBARS)[number]["value"]>("top")
  const [filled, setFilled] = React.useState(false)
  const [disabled, setDisabled] = React.useState(false)

  const ghost = variant === "ghost"
  const content = ghost ? GHOST : filled ? FILLED : ""
  // the editor takes its text when it is made, so a change of what it
  // holds makes it afresh; a change of how it is drawn does not
  const key = ghost ? "ghost" : String(filled)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[964px] flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Text editor
          </h1>
          <p className="text-base text-secondary-foreground">
            {ghost
              ? "Select some text to raise the bar over it."
              : "Pick the editor with the controls beside it."}
          </p>
        </header>

        <div className="flex flex-wrap items-start gap-10">
          <div
            className={
              ghost
                ? "max-w-[604px] min-w-0 flex-1 basis-[480px]"
                : "max-w-[600px] min-w-0 flex-1 basis-[480px]"
            }
          >
            <Editor
              key={key}
              variant={variant}
              toolbar={ghost ? "none" : toolbar}
              content={content}
              disabled={disabled}
            />
          </div>

          {/* the preview control's card, in the page rather than over it */}
          <aside
            aria-label="Controls"
            className="sticky top-6 flex w-[272px] shrink-0 flex-col gap-4 rounded-2xl border border-border-soft bg-card px-4 pt-4 pb-[13px]"
          >
            <p className="text-lg font-semibold text-foreground">Controls</p>
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-[15px] text-muted-foreground">
                Editor
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-base text-secondary-foreground">
                    Variant
                  </span>
                  <Select
                    items={VARIANTS.map((v) => ({ label: v.label, value: v.value }))}
                    value={variant}
                    onValueChange={(value) =>
                      setVariant(value as typeof variant)
                    }
                  >
                    <SelectTrigger size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIANTS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {!ghost && (
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-base text-secondary-foreground">
                      Toolbar
                    </span>
                    <Select
                      items={TOOLBARS.map((t) => ({ label: t.label, value: t.value }))}
                      value={toolbar}
                      onValueChange={(value) =>
                        setToolbar(value as typeof toolbar)
                      }
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOOLBARS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>
              <hr className="border-border-soft" />
              <p className="text-sm leading-[15px] text-muted-foreground">
                State
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex h-7 items-center justify-between gap-3">
                  <span className="text-base text-secondary-foreground">
                    Filled
                  </span>
                  <Switch
                    checked={filled}
                    onCheckedChange={setFilled}
                    disabled={ghost}
                  />
                </label>
                <label className="flex h-7 items-center justify-between gap-3">
                  <span className="text-base text-secondary-foreground">
                    Disabled
                  </span>
                  <Switch checked={disabled} onCheckedChange={setDisabled} />
                </label>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
