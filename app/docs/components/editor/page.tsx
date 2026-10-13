"use client"

import { Editor } from "@/components/ui/editor"
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
        description="A tiptap rich-text editor. Three surface variants – outline, subtle, and ghost – with the formatting bar on top, at the bottom as a comment bar, or floating over the selection."
      />

      <DocSection title="Playground">
        <DocProse>
          Pick the editor with the controls beside it. The <code>ghost</code>{" "}
          variant stands on its own text – select a run of it to raise the
          floating bar.
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

      <DocSection title="Preview">
        <DocProse>
          The full bar carries marks, quote and code block, link and image,
          lists, alignment, and the Text and Highlight colour cards. The foot
          counts down what is left of the character limit, and the corner
          resizer drags the editor taller.
        </DocProse>
        <DocExample code={`<Editor placeholder="Type something..." />`}>
          <div className="w-full max-w-xl">
            <Editor />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Installation">
        <DocInstall name="editor" />
      </DocSection>

      <DocSection title="Usage">
        <CodeBlock code={`import { Editor } from "@/components/ui/editor"`} />
        <CodeBlock
          code={`<Editor
  variant="outline"
  toolbar="top"
  placeholder="Type something..."
  limit={450}
  onChange={(html) => console.log(html)}
/>`}
        />
      </DocSection>

      <DocSection title="Variants">
        <DocProse>
          <code>variant</code> picks the surface: <code>outline</code> draws a
          1px rule that darkens a step on hover under a small shadow and a step
          further when focused; <code>subtle</code> sits on a filled{" "}
          <code>bg-secondary</code> surface and turns white under the focused
          rule; <code>ghost</code> is the text alone – a selection washes amber
          and the full bar floats over it.
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
          <code>toolbar</code> places the bar. <code>top</code> is the full bar
          ruled beneath, with the character count and resizer in the foot.{" "}
          <code>bottom</code> is the comment bar – a shorter run of controls
          ruled above, with Discard and Comment on the right, wired to{" "}
          <code>onDiscard</code> and <code>onComment</code>. <code>none</code>{" "}
          leaves the text alone, which is how the ghost variant is drawn – its
          bar rises over the selection instead.
        </DocProse>
        <DocExample
          code={`<Editor
  toolbar="bottom"
  onComment={(html) => addComment(html)}
  onDiscard={() => {}}
/>`}
        >
          <div className="w-full max-w-xl">
            <Editor toolbar="bottom" />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Character limit">
        <DocProse>
          <code>limit</code> caps the text (450 by default). A change that
          would carry the text past it is refused at the ProseMirror level –
          typing, pasting or dropping – and the foot counts down what is left.
        </DocProse>
        <DocExample code={`<Editor limit={80} />`}>
          <div className="w-full max-w-xl">
            <Editor limit={80} />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="Disabled">
        <DocProse>
          <code>disabled</code> makes the document read-only and draws the
          whole editor at half opacity – bar, count and resizer included. The
          placeholder stays visible, as the design draws it on a disabled
          editor too.
        </DocProse>
        <DocExample code={`<Editor disabled />`}>
          <div className="w-full max-w-xl">
            <Editor disabled />
          </div>
        </DocExample>
      </DocSection>

      <DocSection title="API reference">
        <DocProse>
          <code>Editor</code> renders a tiptap editor with the espresso
          toolbar. Content is HTML in and HTML out.
        </DocProse>
        <PropsTable
          title="Editor"
          rows={[
            {
              prop: "variant",
              type: '"outline" | "subtle" | "ghost"',
              defaultValue: '"outline"',
              description:
                "Surface – ruled outline, filled subtle, or bare ghost with the floating selection bar.",
            },
            {
              prop: "toolbar",
              type: '"top" | "bottom" | "none"',
              defaultValue: '"top"',
              description:
                "Where the bar sits: the full bar on top with count and resizer, the comment bar at the bottom, or none.",
            },
            {
              prop: "content",
              type: "string",
              defaultValue: '""',
              description:
                "The HTML it opens with. Swapping it in later replaces the document.",
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
              description:
                "The most characters it holds; the foot counts down the rest.",
            },
            {
              prop: "disabled",
              type: "boolean",
              defaultValue: "false",
              description: "Read-only, drawn at half opacity.",
            },
            {
              prop: "onChange",
              type: "(html: string) => void",
              description: "Fires with the document HTML on every edit.",
            },
            {
              prop: "onComment",
              type: "(html: string) => void",
              description:
                "The bottom bar's Comment button – fires with the HTML, then clears the document.",
            },
            {
              prop: "onDiscard",
              type: "() => void",
              description:
                "The bottom bar's Discard button, after the document is cleared.",
            },
          ]}
        />
      </DocSection>

      <DocSection title="Styling hooks">
        <DocProse>
          The root carries <code>data-slot="editor"</code> and reflects its
          props as <code>data-variant</code> and <code>data-disabled</code>;
          the bar is <code>data-slot="editor-toolbar"</code>. The{" "}
          <code>editorVariants</code> cva helper is exported for custom
          compositions, and the toolbar glyphs ship as React components in{" "}
          <code>editor-icons</code>.
        </DocProse>
        <CodeBlock
          code={`import { editorVariants } from "@/components/ui/editor"
import { BoldIcon } from "@/components/ui/editor-icons"`}
        />
      </DocSection>
    </DocPage>
  )
}
