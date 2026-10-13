"use client"

// The editor molecule's root, after frappe-ui's Editor.vue: it owns the
// tiptap instance and hands it to whatever is composed inside — a toolbar,
// the content, a counter — through context or a render prop.
import * as React from "react"
import type { Editor as TiptapEditor, Extensions } from "@tiptap/core"
import { useEditor } from "@tiptap/react"

const EditorContext = React.createContext<TiptapEditor | null>(null)

/** the editor the nearest EditorProvider holds */
export function useCurrentEditor() {
  return React.useContext(EditorContext)
}

export interface EditorProviderProps {
  extensions: Extensions
  /** what it opens with; swapped in later, it replaces the document */
  content?: string
  editable?: boolean
  onUpdate?: (html: string) => void
  onTransaction?: (editor: TiptapEditor) => void
  /** recreates the editor when these change */
  deps?: React.DependencyList
  children:
    | React.ReactNode
    | ((editor: TiptapEditor | null) => React.ReactNode)
}

export function EditorProvider({
  extensions,
  content = "",
  editable = true,
  onUpdate,
  onTransaction,
  deps = [],
  children,
}: EditorProviderProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      content,
      extensions,
      onTransaction: ({ editor: ed }) => onTransaction?.(ed),
      onUpdate: ({ editor: ed }) => onUpdate?.(ed.getHTML()),
    },
    deps
  )

  React.useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  // only when the caller swaps the content in later — the first run would
  // re-set what the editor opened with, and leave the caret at the end of
  // the document instead of its start
  const contentSettled = React.useRef(false)
  React.useEffect(() => {
    if (!editor) return
    if (!contentSettled.current) {
      contentSettled.current = true
      return
    }
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor])

  return (
    <EditorContext.Provider value={editor}>
      {typeof children === "function" ? children(editor) : children}
    </EditorContext.Provider>
  )
}

export { EditorContent } from "@tiptap/react"
