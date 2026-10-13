"use client"

import { Editor } from "@/components/ui/editor"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const FILLED =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design.</p>"
// the ghost editor stands on its own text, as the design fills it
const GHOST =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design. Good typography enhances communication by guiding the reader's eye and emphasising important information.</p>"

export default function EditorPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Outline */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Outline</SectionTitle>
        <Editor variant="outline" />
      </div>

      {/* Subtle */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Subtle</SectionTitle>
        <Editor variant="subtle" />
      </div>

      {/* Ghost */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Ghost — select text to raise the bar</SectionTitle>
        <Editor variant="ghost" toolbar="none" content={GHOST} />
      </div>

      {/* Toolbar — Bottom */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Toolbar — Bottom (comment bar)</SectionTitle>
        <Editor variant="outline" toolbar="bottom" />
      </div>

      {/* Filled */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Filled</SectionTitle>
        <Editor variant="outline" content={FILLED} />
      </div>

      {/* Character limit */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Character limit (80)</SectionTitle>
        <Editor variant="outline" limit={80} />
      </div>

      {/* Disabled */}
      <div className="flex max-w-xl flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <Editor variant="outline" disabled />
        <Editor variant="subtle" disabled content={FILLED} />
      </div>
    </div>
  )
}
