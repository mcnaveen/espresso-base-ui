"use client"

// RichTextKit, after frappe-ui's: one extension bundle for every editor in
// the project, configured per use. The field editor turns the document's
// blocks off; the document editor takes the lot. `false` drops a feature,
// an object configures it.
import { Extension, type AnyExtension } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import Mention from "@tiptap/extension-mention"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { TableCell, TableHeader, TableKit } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import {
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from "@tiptap/extension-text-style"
import Youtube from "@tiptap/extension-youtube"
import { Placeholder } from "@tiptap/extensions"

import {
  Attachment,
  Audio,
  Callout,
  Video,
  Column,
  Columns,
  Embed,
  Limit,
  PEOPLE,
  SlashCommands,
  suggestionPopup,
} from "./extensions"

export interface RichTextKitOptions {
  /** heading levels, or false for none */
  heading?: { levels: (1 | 2 | 3 | 4 | 5 | 6)[] } | false
  placeholder?: { placeholder?: string; showOnlyWhenEditable?: boolean } | false
  textAlign?: false
  color?: false
  fontFamily?: false
  fontSize?: false
  lineHeight?: false
  highlight?: false
  image?: false
  table?: false
  taskList?: false
  details?: false
  columns?: false
  callout?: false
  attachment?: false
  audio?: false
  embed?: false
  /** the YouTube video node */
  video?: false
  mention?: false
  slashCommands?: false
  subscript?: false
  superscript?: false
  /** the most characters the document holds */
  limit?: number | false
}

export const RichTextKit = Extension.create<RichTextKitOptions>({
  name: "richTextKit",
  addOptions() {
    return {}
  },
  addExtensions() {
    const options = this.options
    const extensions: AnyExtension[] = [
      StarterKit.configure({
        heading:
          options.heading === false
            ? false
            : (options.heading ?? { levels: [1, 2, 3, 4, 5, 6] }),
        link: { openOnClick: false },
      }),
      TextStyle,
    ]
    if (options.color !== false) extensions.push(Color)
    if (options.fontFamily !== false) extensions.push(FontFamily)
    if (options.fontSize !== false) extensions.push(FontSize)
    if (options.lineHeight !== false) extensions.push(LineHeight)
    if (options.highlight !== false)
      extensions.push(Highlight.configure({ multicolor: true }))
    if (options.image !== false) extensions.push(Image)
    if (options.textAlign !== false)
      extensions.push(TextAlign.configure({ types: ["paragraph", "heading"] }))
    if (options.table !== false) {
      // the cells carry the menu's colour as an attribute
      const colouredCell = {
        backgroundColor: {
          default: null as string | null,
          parseHTML: (el: HTMLElement) =>
            el.style.backgroundColor || null,
          renderHTML: (attrs: Record<string, unknown>) =>
            attrs.backgroundColor
              ? { style: `background-color: ${attrs.backgroundColor}` }
              : {},
        },
      }
      extensions.push(
        TableKit.configure({
          table: { resizable: true },
          tableCell: false,
          tableHeader: false,
        }),
        TableCell.extend({
          addAttributes() {
            return { ...this.parent?.(), ...colouredCell }
          },
        }),
        TableHeader.extend({
          addAttributes() {
            return { ...this.parent?.(), ...colouredCell }
          },
        })
      )
    }
    if (options.taskList !== false)
      extensions.push(TaskList, TaskItem.configure({ nested: true }))
    if (options.details !== false)
      extensions.push(
        Details,
        DetailsSummary,
        // the source writes its content as div[data-type="details-content"]
        DetailsContent.extend({
          parseHTML() {
            return [
              { tag: 'div[data-type="details-content"]' },
              { tag: 'div[data-type="detailsContent"]' },
            ]
          },
        })
      )
    if (options.columns !== false) extensions.push(Columns, Column)
    if (options.callout !== false) extensions.push(Callout)
    if (options.attachment !== false) extensions.push(Attachment)
    if (options.audio !== false) extensions.push(Audio)
    if (options.embed !== false) extensions.push(Embed)
    if (options.video !== false)
      extensions.push(Youtube.configure({ nocookie: true }), Video)
    if (options.subscript !== false) extensions.push(Subscript)
    if (options.superscript !== false) extensions.push(Superscript)
    if (options.mention !== false)
      extensions.push(
        Mention.configure({
          HTMLAttributes: { class: "mention" },
          renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
          suggestion: {
            items: ({ query }) =>
              PEOPLE.filter((person) =>
                person.label.toLowerCase().startsWith(query.toLowerCase())
              ),
            command: ({ editor, range, props }) =>
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: "mention",
                    attrs: { id: props.id, label: props.label },
                  },
                  { type: "text", text: " " },
                ])
                .run(),
            render: suggestionPopup,
          },
        })
      )
    if (options.slashCommands !== false) extensions.push(SlashCommands)
    if (options.placeholder !== false)
      extensions.push(
        Placeholder.configure({
          placeholder: "Type something...",
          showOnlyWhenEditable: false,
          ...options.placeholder,
        })
      )
    if (options.limit) extensions.push(Limit.configure({ limit: options.limit }))
    return extensions
  },
})
