"use client"

// The Rich text editor page, as the timeless-gowtham branch draws it: the
// full document editor with its fixed bar, and above it the switches that
// make it read-only or start it empty.
import * as React from "react"

import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Switch } from "@/components/ui/switch"

import { article } from "./demo-content"

export default function RichTextEditorPage() {
  const [editable, setEditable] = React.useState(true)
  const [empty, setEmpty] = React.useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-6 border-b border-border-soft px-6 py-3">
        <label className="flex items-center gap-2 text-sm text-secondary-foreground">
          Editable
          <Switch checked={editable} onCheckedChange={setEditable} />
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary-foreground">
          Empty document
          <Switch checked={empty} onCheckedChange={setEmpty} />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-6">
        <RichTextEditor
          key={String(empty)}
          content={empty ? "" : article}
          editable={editable}
          className="h-full"
        />
      </div>
    </div>
  )
}
