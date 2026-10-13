"use client"

import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  CodeBlock,
  DocExample,
  DocHeader,
  DocInstall,
  DocPage,
  DocProse,
  DocSection,
  PropsTable,
} from "../../_components/doc"
import {
  DocPlayground,
  type PlaygroundValues,
} from "../../_components/playground"

const SAMPLE = `
<h1>Building Better Software</h1>
<p>Modern businesses need software that adapts to their processes instead of forcing teams to change the way they work.</p>
<ul>
  <li><p>Open by default</p></li>
  <li><p>Built for customization</p></li>
</ul>
<blockquote><p><em>“Software should empower organisations to innovate, not limit them”</em></p></blockquote>
`

function playgroundCode(v: PlaygroundValues) {
  const attrs = [
    v.empty ? "" : ` content={article}`,
    v.editable ? "" : ` editable={false}`,
  ].join("")
  return `<RichTextEditor${attrs} />`
}

function PlaygroundPreview(v: PlaygroundValues) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border-soft">
      <RichTextEditor
        key={String(Boolean(v.empty))}
        content={v.empty ? "" : SAMPLE}
        editable={Boolean(v.editable)}
        className="h-full"
      />
    </div>
  )
}

export default function RichTextEditorDocsPage() {
  return (
    <DocPage>
      <DocHeader
        title="Rich Text Editor"
        description="A tiptap document editor under a fixed formatting bar – block styles, fonts and sizes, colours, lists, alignment, tables, task lists, media, and more."
      />

      <DocSection title="Playground">
        <DocProse>
          The full document editor. Toggle <code>editable</code> to see the
          read-only document (the bar is only drawn when it can be used), or
          start it from an empty page.
        </DocProse>
        <DocPlayground
          controls={{
            editable: { type: "boolean", defaultValue: true },
            empty: { type: "boolean", defaultValue: false },
          }}
          renderPreview={PlaygroundPreview}
          renderCode={playgroundCode}
        />
      </DocSection>

      <DocSection title="Preview">
        <DocProse>
          The bar runs the editor&apos;s commands: insert menu, block style
          select, font family and size, marks, text and background colour,
          inline code, quote and divider, list, alignment and line-spacing
          menus, to-do lists, links, tables, the espresso emoji picker,
          images, YouTube video, highlighter, and a <code>⋯</code> menu with
          undo/redo, sub- and superscript and clear formatting.
        </DocProse>
        <DocExample code={`<RichTextEditor content={article} />`}>
          <div className="h-[380px] w-full overflow-hidden rounded-xl border border-border-soft">
            <RichTextEditor content={SAMPLE} className="h-full" />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Installation">
        <DocInstall name="rich-text-editor" />
      </DocSection>

      <DocSection title="Usage">
        <CodeBlock
          code={`import { RichTextEditor } from "@/components/ui/rich-text-editor"`}
        />
        <CodeBlock
          code={`<RichTextEditor
  content={html}
  onChange={(html) => save(html)}
/>`}
        />
        <DocProse>
          The component fills its parent and scrolls the document under the
          sticky bar, so give it a bounded height (<code>h-full</code> in a
          sized container, or a fixed height).
        </DocProse>
      </DocSection>

      <DocSection title="Read-only">
        <DocProse>
          <code>editable={`{false}`}</code> renders the document alone — the
          bar is omitted and the content cannot be changed, which suits
          rendering saved documents.
        </DocProse>
        <DocExample
          code={`<RichTextEditor content={article} editable={false} />`}
        >
          <div className="h-[260px] w-full overflow-hidden rounded-xl border border-border-soft">
            <RichTextEditor
              content={SAMPLE}
              editable={false}
              className="h-full"
            />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="API reference">
        <PropsTable
          title="RichTextEditor"
          rows={[
            {
              prop: "content",
              type: "string",
              defaultValue: '""',
              description:
                "The HTML it opens with. Swapping it in later replaces the document.",
            },
            {
              prop: "editable",
              type: "boolean",
              defaultValue: "true",
              description:
                "Whether the document can be edited; read-only also hides the bar.",
            },
            {
              prop: "placeholder",
              type: "string",
              defaultValue: '"Type something, ..."',
              description: "Shown while the document is empty.",
            },
            {
              prop: "onChange",
              type: "(html: string) => void",
              description: "Fires with the document HTML on every edit.",
            },
          ]}
        />
      </DocSection>

      <DocSection title="Styling hooks">
        <DocProse>
          The root carries <code>data-slot="rich-text-editor"</code> (and{" "}
          <code>data-readonly</code> when not editable); the bar is{" "}
          <code>data-slot="rich-text-editor-toolbar"</code>. The toolbar
          glyphs are the design file&apos;s own, shipped as React components
          in <code>rich-text-editor-icons</code>.
        </DocProse>
      </DocSection>
    </DocPage>
  )
}
