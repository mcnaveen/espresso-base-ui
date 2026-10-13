// The editor molecule, after frappe-ui's src/molecules/editor: one place
// for the provider, the extension kit, and both editors built on them.
export { EditorContent, EditorProvider, useCurrentEditor } from "./core"
export type { EditorProviderProps } from "./core"
export { RichTextKit, type RichTextKitOptions } from "./kit"
export { Editor, editorVariants, type EditorProps } from "./field"
export { RichTextEditor, type RichTextEditorProps } from "./document"
export { BlockHandle } from "./block-handle"
export { TableControls } from "./table-controls"
export * from "./extensions"
