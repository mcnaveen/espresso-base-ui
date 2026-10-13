"use client"

import { Editor, RichTextEditor } from "@/components/ui/editor"
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

const FILLED =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design.</p>"
// the ghost editor stands on its own text, as the design fills it
const GHOST =
  "<p>Typography is the art of arranging type to make written language legible, readable, and visually appealing. It involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing to create a harmonious and effective design. Good typography enhances communication by guiding the reader's eye and emphasising important information.</p>"

const ARTICLE = `
<h1>Building Better Software</h1>
<p>Modern businesses need software that adapts to their processes instead of forcing teams to change the way they work.</p>
<ul>
  <li><p>Open by default</p></li>
  <li><p>Built for customization</p></li>
</ul>
<blockquote><p><em>“Software should empower organisations to innovate, not limit them”</em></p></blockquote>
<div data-type="callout" data-emoji="\u{1F4A1}"><p><strong>Tip</strong></p><p>Type / for the insert menu, or @ to mention someone.</p></div>
`

function editorPlaygroundCode(v: PlaygroundValues) {
  const ghost = v.variant === "ghost"
  const attrs = [
    v.variant !== "outline" ? ` variant="${v.variant}"` : "",
    ghost
      ? ` toolbar="none"`
      : v.toolbar !== "top"
        ? ` toolbar="${v.toolbar}"`
        : "",
    (ghost || v.filled) && ` content={content}`,
    v.disabled ? ` disabled` : "",
  ]
    .filter(Boolean)
    .join("")

  return `<Editor${attrs} />`
}

function EditorPlaygroundPreview(v: PlaygroundValues) {
  const ghost = v.variant === "ghost"
  const content = ghost ? GHOST : v.filled ? FILLED : ""
  // the editor takes its text when it is made, so a change of what it
  // holds makes it afresh; a change of how it is drawn does not
  const key = ghost ? "ghost" : String(Boolean(v.filled))
  return (
    <div className="w-full max-w-xl">
      <Editor
        key={key}
        variant={v.variant as "outline" | "subtle" | "ghost"}
        toolbar={ghost ? "none" : (v.toolbar as "top" | "bottom" | "none")}
        content={content}
        disabled={Boolean(v.disabled)}
      />
    </div>
  )
}

export default function EditorDocsPage() {
  return (
    <DocPage>
      <DocHeader
        title="Editor"
        description="The editor molecule, on tiptap: an EditorProvider core, the RichTextKit extension bundle, the field editor in three variants, and the full document editor with block drag, tables, mentions and slash commands."
      />

      <DocSection title="Playground">
        <DocProse>
          The field editor. Pick it with the controls beside it — the{" "}
          <code>ghost</code> variant stands on its own text; select a run of
          it to raise the floating bar.
        </DocProse>
        <DocPlayground
          controls={{
            variant: {
              type: "options",
              options: ["outline", "subtle", "ghost"],
              defaultValue: "outline",
            },
            toolbar: {
              type: "options",
              options: ["top", "bottom", "none"],
              defaultValue: "top",
            },
            filled: { type: "boolean", defaultValue: false },
            disabled: { type: "boolean", defaultValue: false },
          }}
          renderPreview={EditorPlaygroundPreview}
          renderCode={editorPlaygroundCode}
        />
      </DocSection>

      <DocSection title="Installation">
        <DocInstall name="editor" />
      </DocSection>

      <DocSection title="Usage">
        <CodeBlock
          code={`import { Editor, RichTextEditor } from "@/components/ui/editor"`}
        />
        <CodeBlock
          code={`// a field: comments, descriptions
<Editor variant="subtle" limit={450} onChange={(html) => save(html)} />

// a document
<RichTextEditor content={article} onChange={(html) => save(html)} />`}
        />
        <DocProse>
          Both are compositions over the same core. For a custom editor,
          compose it yourself the same way — the provider owns the tiptap
          instance, <code>RichTextKit</code> is one configurable extension
          bundle where <code>false</code> drops a feature and an object
          configures it:
        </DocProse>
        <CodeBlock
          code={`import { EditorContent, EditorProvider, RichTextKit } from "@/components/ui/editor"

<EditorProvider
  extensions={[RichTextKit.configure({ table: false, mention: false, limit: 280 })]}
  content={html}
  onUpdate={(html) => save(html)}
>
  {(editor) => (
    <>
      <MyToolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  )}
</EditorProvider>`}
        />
      </DocSection>

      <DocSection title="Variants">
        <DocProse>
          <code>variant</code> picks the field&apos;s surface:{" "}
          <code>outline</code> draws a 1px rule that darkens on hover and
          focus; <code>subtle</code> sits on a filled surface and turns white
          focused; <code>ghost</code> is the text alone — a selection washes
          amber and the full bar floats over it.
        </DocProse>
        <DocExample
          code={`
<Editor variant="outline" />
<Editor variant="subtle" />
<Editor variant="ghost" toolbar="none" content={content} />`}
        >
          <div className="flex w-full max-w-xl flex-col gap-6">
            <Editor variant="outline" />
            <Editor variant="subtle" />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Toolbar">
        <DocProse>
          <code>toolbar</code> places the field&apos;s bar: <code>top</code>{" "}
          is the full bar with the character count and corner resizer,{" "}
          <code>bottom</code> is the comment bar with Discard and Comment
          (wired to <code>onDiscard</code> / <code>onComment</code>), and{" "}
          <code>none</code> leaves the text alone.
        </DocProse>
        <DocExample code={`<Editor toolbar="bottom" onComment={(html) => addComment(html)} />`}>
          <div className="w-full max-w-xl">
            <Editor toolbar="bottom" />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Character limit">
        <DocProse>
          <code>limit</code> caps the text (450 by default) at the
          ProseMirror level — typing, pasting or dropping — and the foot
          counts down what is left.
        </DocProse>
        <DocExample code={`<Editor limit={80} />`}>
          <div className="w-full max-w-xl">
            <Editor limit={80} />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Rich text editor">
        <DocProse>
          The document editor takes the whole kit: the fixed bar (block
          styles, fonts and sizes, colours, lists, alignment, tables with
          the size picker, the emoji picker, media, highlighter), Notion-style
          block drag handles, table row/column grips, a floating bar over
          selections, <code>@</code> mentions and <code>/</code> slash
          commands, callouts, toggle lists, columns, attachments, audio and
          embeds.
        </DocProse>
        <DocExample code={`<RichTextEditor content={article} />`}>
          <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border-soft [&_[data-slot=rich-text-editor]]:h-full">
            <RichTextEditor content={ARTICLE} />
          </div>
        </DocExample>
        <DocProse>
          <code>editable={`{false}`}</code> renders the document alone — the
          bar and handles are omitted — which suits rendering saved content.
          The component fills its parent; give it a bounded height for an
          internal scroll, or none to lay the document out full-length.
        </DocProse>
        <DocExample
          code={`<RichTextEditor content={article} editable={false} />`}
        >
          <div className="h-[260px] w-full overflow-hidden rounded-xl border border-border-soft [&_[data-slot=rich-text-editor]]:h-full">
            <RichTextEditor content={ARTICLE} editable={false} />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="API reference">
        <PropsTable
          title="Editor"
          rows={[
            {
              prop: "variant",
              type: '"outline" | "subtle" | "ghost"',
              defaultValue: '"outline"',
              description:
                "Surface — ruled outline, filled subtle, or bare ghost with the floating selection bar.",
            },
            {
              prop: "toolbar",
              type: '"top" | "bottom" | "none"',
              defaultValue: '"top"',
              description:
                "The full bar on top with count and resizer, the comment bar at the bottom, or none.",
            },
            {
              prop: "content",
              type: "string",
              defaultValue: '""',
              description: "The HTML it opens with.",
            },
            {
              prop: "placeholder",
              type: "string",
              defaultValue: '"Type something..."',
              description: "Shown while the document is empty, even disabled.",
            },
            {
              prop: "limit",
              type: "number",
              defaultValue: "450",
              description: "The most characters it holds.",
            },
            {
              prop: "disabled",
              type: "boolean",
              defaultValue: "false",
              description: "Read-only, drawn at half opacity.",
            },
            {
              prop: "onChange / onComment / onDiscard",
              type: "(html?: string) => void",
              description:
                "Edits, the comment bar's Comment (then clears), and its Discard.",
            },
          ]}
        />
        <PropsTable
          title="RichTextEditor"
          rows={[
            {
              prop: "content",
              type: "string",
              defaultValue: '""',
              description: "The HTML it opens with.",
            },
            {
              prop: "editable",
              type: "boolean",
              defaultValue: "true",
              description:
                "Read-only hides the bar, the grips and the table controls.",
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
        <DocProse>
          <code>EditorProvider</code> takes <code>extensions</code>,{" "}
          <code>content</code>, <code>editable</code>, <code>onUpdate</code>,{" "}
          <code>onTransaction</code> and a render-prop child;{" "}
          <code>useCurrentEditor()</code> reads the instance from context.{" "}
          <code>RichTextKit</code> accepts a flag per feature —{" "}
          <code>heading</code>, <code>table</code>, <code>taskList</code>,{" "}
          <code>details</code>, <code>columns</code>, <code>callout</code>,{" "}
          <code>attachment</code>, <code>audio</code>, <code>embed</code>,{" "}
          <code>video</code>, <code>mention</code>,{" "}
          <code>slashCommands</code>, <code>fontFamily</code>,{" "}
          <code>fontSize</code>, <code>lineHeight</code>,{" "}
          <code>subscript</code>, <code>superscript</code>,{" "}
          <code>placeholder</code> and <code>limit</code>.
        </DocProse>
      </DocSection>

      <DocSection title="Styling hooks">
        <DocProse>
          The field carries <code>data-slot="editor"</code> with{" "}
          <code>data-variant</code> / <code>data-disabled</code>; the
          document <code>data-slot="rich-text-editor"</code> (and{" "}
          <code>data-readonly</code>), its bar{" "}
          <code>data-slot="rich-text-editor-toolbar"</code>. The{" "}
          <code>editorVariants</code> cva and both icon sets are exported.
        </DocProse>
        <CodeBlock
          code={`import { editorVariants } from "@/components/ui/editor"`}
        />
      </DocSection>
    </DocPage>
  )
}
