"use client"

// The editor molecule's showcase: the field editor and the document
// editor, one under each tab.
import * as React from "react"

import { Editor, RichTextEditor } from "@/components/ui/editor"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { article } from "./demo-content"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const FILLED =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design.</p>"
// the ghost editor stands on its own text, as the design fills it
const GHOST =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design. Good typography enhances communication by guiding the reader's eye and emphasising important information.</p>"

function TextEditorSections() {
  return (
    <div className="flex flex-col gap-12">
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

function RichTextSection() {
  const [editable, setEditable] = React.useState(true)
  const [empty, setEmpty] = React.useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-secondary-foreground">
          Editable
          <Switch checked={editable} onCheckedChange={setEditable} />
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary-foreground">
          Empty document
          <Switch checked={empty} onCheckedChange={setEmpty} />
        </label>
      </div>
      <RichTextEditor
        key={String(empty)}
        content={empty ? "" : article}
        editable={editable}
        commenter={{ who: "You", image: "/images/rte/team-3.jpg" }}
        initialComments={[
          {
            id: "c1",
            replies: [
              {
                who: "James Fenimore",
                image: "/images/rte/team-1.jpg",
                when: "4d ago",
                text: "Okay cool, shall i finalise this design then?",
              },
              {
                who: "Bray Bill",
                image: "/images/rte/team-2.jpg",
                when: "6h ago",
                text: "No major issues. Let’s get feedback from the dev team once.",
              },
            ],
          },
        ]}
      />
    </div>
  )
}

export default function EditorPage() {
  return (
    <div className="flex flex-col p-8">
      <Tabs defaultValue="text">
        <TabsList size="default">
          <TabsIndicator />
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="rich-text">Rich Text</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="pt-4">
          <TextEditorSections />
        </TabsContent>
        <TabsContent value="rich-text" className="pt-4">
          <RichTextSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
