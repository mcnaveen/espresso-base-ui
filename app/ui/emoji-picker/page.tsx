"use client"

import * as React from "react"
import { SmilePlus } from "lucide-react"

import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerTrigger,
} from "@/components/ui/emoji-picker"
import { Button } from "@/components/ui/button"
import {
  EmojiPicker as ReuiEmojiPicker,
  EmojiPickerCategories as ReuiEmojiPickerCategories,
  EmojiPickerContent as ReuiEmojiPickerContent,
  EmojiPickerList as ReuiEmojiPickerList,
  EmojiPickerSearch as ReuiEmojiPickerSearch,
  EmojiPickerTrigger as ReuiEmojiPickerTrigger,
} from "@/components/reui/emoji-picker"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return <p className="max-w-prose text-sm text-muted-foreground">{children}</p>
}

function ControlledExample() {
  const [emoji, setEmoji] = React.useState("🚀")
  return (
    <div className="flex items-center gap-3">
      <EmojiPicker value={emoji} onValueChange={setEmoji}>
        <EmojiPickerTrigger />
        <EmojiPickerContent />
      </EmojiPicker>
      <span className="text-sm text-muted-foreground">
        Picked: <span className="text-base">{emoji}</span>
      </span>
    </div>
  )
}

function ReactionExample() {
  const [reactions, setReactions] = React.useState<string[]>(["👍", "🎉"])
  return (
    <div className="flex items-center gap-1.5">
      {reactions.map((reaction, index) => (
        <span
          key={`${reaction}-${index}`}
          className="flex h-7 items-center rounded-full border border-border-soft bg-secondary px-2 text-sm"
        >
          {reaction}
        </span>
      ))}
      <EmojiPicker
        onValueChange={(emoji) =>
          setReactions((previous) => [...previous, emoji])
        }
      >
        <EmojiPickerTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add reaction"
              className="rounded-full text-muted-foreground"
            >
              <SmilePlus />
            </Button>
          }
        />
        <EmojiPickerContent />
      </EmojiPicker>
    </div>
  )
}

export default function EmojiPickerPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <SectionNote>
          A button trigger opening a searchable grid over the full emoji set —
          the picked emoji replaces the smile placeholder.
        </SectionNote>
        <EmojiPicker>
          <EmojiPickerTrigger />
          <EmojiPickerContent />
        </EmojiPicker>
      </div>

      {/* Controlled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <SectionNote>
          <code className="font-mono text-xs">value</code> /{" "}
          <code className="font-mono text-xs">onValueChange</code> make the
          selection external state.
        </SectionNote>
        <ControlledExample />
      </div>

      {/* ReUI picker on Base UI, in the espresso picker's clothes */}
      <div className="flex flex-col gap-4">
        <SectionTitle>ReUI Emoji Picker</SectionTitle>
        <SectionNote>
          The ReUI emoji picker (Base UI flavour), composed from the same
          espresso primitives and dressed exactly like the picker above —
          plus its own search engine, skin tones and virtualized grid.
        </SectionNote>
        <ReuiEmojiPicker
          columns={9}
          recentLimit={9}
          recentStorageKey="espresso-reui-recent-emoji"
        >
          <ReuiEmojiPickerTrigger />
          <ReuiEmojiPickerContent
            className="w-[284px]"
            sideOffset={6}
            panelStyle={
              {
                "--emoji-picker-cell": "30px",
                "--emoji-picker-emoji": "18px",
                "--emoji-picker-gutter": "7px",
                "--emoji-picker-header": "24px",
                "--emoji-picker-list-height": "224px",
              } as React.CSSProperties
            }
          >
            <ReuiEmojiPickerCategories className="border-b-0 px-0 pt-1 pb-0.5" />
            <div className="p-1.5">
              <ReuiEmojiPickerSearch
                variant="subtle"
                size="sm"
                icon={false}
                placeholder="Search by keyword"
              />
            </div>
            <ReuiEmojiPickerList />
          </ReuiEmojiPickerContent>
        </ReuiEmojiPicker>
      </div>

      {/* Custom trigger — reactions */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Custom Trigger (reactions)</SectionTitle>
        <SectionNote>
          Any element can open the picker via{" "}
          <code className="font-mono text-xs">render</code> — here a ghost
          button appends reactions instead of holding a single value.
        </SectionNote>
        <ReactionExample />
      </div>
    </div>
  )
}
