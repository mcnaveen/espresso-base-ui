"use client"

// The document's stylesheet, ported from the branch's RichTextEditor.vue
// <style> block and RteTableControls.vue, translated to this project's
// tokens (the theme file maps them: surface-gray-1 → --input, ink-gray-5 →
// --accent-foreground, outline-gray-1 → --border-soft, and so on). One
// injection, shared by every document editor on the page.
import * as React from "react"

const CELL_TINTS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "cyan",
  "blue",
  "violet",
  "purple",
  "pink",
  "gray",
]

const cellTintRules = CELL_TINTS.map(
  (hue) => `
.rte-doc td[data-bg='${hue}'], .rte-doc th[data-bg='${hue}'] { background-color: var(--color-${hue}-100); }
.dark .rte-doc td[data-bg='${hue}'], .dark .rte-doc th[data-bg='${hue}'] { background-color: var(--color-${hue}-900); }`
).join("\n")

const CSS = `
/* ---- bold runs: the prose scale's 600, in the headings' ink — the
   browser's 700 reads a step too heavy at the file's sizes ---- */
.rte-doc strong,
.rte-doc b {
  font-weight: 600;
  color: var(--foreground);
}

/* ---- mentions and links take the file's text grounds ---- */
/* a mention (32467:13501): a 22px gray-100 chip on 6px corners, the
   name in medium gray-600; under the pointer or picked, gray-700 */
.rte-doc .mention {
  background: var(--secondary);
  border-radius: 6px;
  padding: 0 3px;
  line-height: 22px;
  font-weight: 500;
  color: var(--muted-foreground);
}
.rte-doc .mention:hover,
.rte-doc .mention.ProseMirror-selectednode {
  background: var(--secondary);
  color: var(--secondary-foreground);
  box-shadow: none;
}
/* a link: medium gray-700 on its rule, gray-800 under the pointer; the one
   the caret is in, or its card is editing, sits on a 22px gray-100 ground
   on 4px corners */
.rte-doc a:not([data-attachment]) {
  color: var(--secondary-foreground);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: var(--border-normal);
}
.rte-doc a:not([data-attachment]):hover {
  color: var(--foreground);
}
.rte-doc .rte-link-on {
  color: var(--foreground);
  background: var(--secondary);
  border-radius: 4px;
  padding: 1.5px 0;
  box-shadow:
    -2px 0 0 var(--secondary),
    2px 0 0 var(--secondary);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* ---- the audio player: a 42px bar, its slider the file's 2px track and
   14px knob on a soft shadow, the range in gray-900 ---- */
.rte-doc .rte-player {
  margin: 8px 0;
}
.rte-player.ProseMirror-selectednode {
  outline: 2px solid var(--border);
  outline-offset: 2px;
}
.rte-player-track {
  height: 2px;
  border-radius: 16px;
  background-color: var(--muted);
}
.rte-player-track > * {
  background-color: var(--foreground);
}
.rte-player-knob {
  width: 14px;
  height: 14px;
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.14),
    0 0 1.5px rgba(0, 0, 0, 0.16),
    inset 0 0.25px 1.5px rgba(255, 255, 255, 0.16);
}
.rte-player-knob:hover {
  box-shadow:
    0 0 0 6px rgba(82, 82, 82, 0.12),
    0 2px 5px rgba(0, 0, 0, 0.14),
    0 0 1.5px rgba(0, 0, 0, 0.16);
}

/* ---- a callout: gray-50, 12px in, the emoji leading its first line ---- */
.rte-doc [data-type='callout'] {
  position: relative;
  margin: 8px 0;
  padding: 12px 12px 12px 36px;
  border-radius: 8px;
  background: var(--input);
}
.rte-doc [data-type='callout']::before {
  content: attr(data-emoji);
  position: absolute;
  left: 12px;
  top: 12px;
  font-size: 15px;
  line-height: 24px;
}
.rte-doc [data-type='callout'] > p:first-child {
  font-weight: 600;
  color: var(--foreground);
}
.rte-doc [data-type='callout'] > p + p {
  margin-top: 4px;
}

/* ---- columns: side by side on a 24px gutter, a hairline between ---- */
.rte-doc [data-type='columns'] {
  display: grid;
  gap: 24px;
  margin: 8px 0;
}
.rte-doc [data-type='columns'][data-count='2'] {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.rte-doc [data-type='columns'][data-count='3'] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.rte-doc [data-type='columns'][data-count='4'] {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.rte-doc [data-type='column'] {
  min-width: 0;
  border-left: 1px solid var(--border);
  padding-left: 12px;
}
.rte-doc [data-type='column']:first-child {
  border-left: 0;
  padding-left: 0;
}
.rte-doc [data-type='column'] > *:first-child {
  margin-top: 0;
}
.rte-doc [data-type='column'] > *:last-child {
  margin-bottom: 0;
}
@media (max-width: 640px) {
  .rte-doc [data-type='columns'] {
    grid-template-columns: 1fr !important;
  }
  .rte-doc [data-type='column'] {
    border-left: 0;
    padding-left: 0;
  }
}

/* a row of pictures (32243:108985): cells 16 apart with no rule between
   them, and every picture fills the cell it is given without stretching */
.rte-doc [data-type='columns'][data-media='true'] {
  gap: 16px;
}
.rte-doc [data-type='columns'][data-media='true'] [data-type='column'] {
  border-left: 0;
  padding-left: 0;
}
.rte-doc [data-type='columns'][data-media='true'] img {
  width: 100%;
  aspect-ratio: 342 / 170;
  object-fit: cover;
  border-radius: 6px;
  margin: 0;
}
.rte-doc [data-type='columns'][data-media='true'] [data-type='column'] > p {
  margin: 0;
}
.rte-doc [data-type='columns'][data-media='true'] [data-type='column'] > p + p {
  margin-top: 8px;
}
.rte-doc [data-type='columns'][data-media='true'] .ProseMirror-trailingBreak {
  display: none;
}

/* ---- expand / collapse: a 16px chevron before the summary, the content
   indented under it and folded away when closed ---- */
.rte-details {
  position: relative;
  padding-left: 22px;
  margin: 2px 0;
}
.rte-details-toggle {
  position: absolute;
  left: 0;
  top: 4px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--muted-foreground);
  transition:
    transform 150ms ease-out,
    background-color 150ms;
}
.rte-details-toggle:hover {
  background: var(--secondary);
}
.rte-details.is-open .rte-details-toggle {
  transform: rotate(90deg);
}
.rte-details.ProseMirror-selectednode {
  border-radius: 6px;
  box-shadow: 0 0 0 2px var(--border);
  background-color: transparent;
}
.rte-details summary {
  list-style: none;
  font-weight: 500;
  color: var(--foreground);
  cursor: text;
}
.rte-details summary::-webkit-details-marker {
  display: none;
}
.rte-details [data-type='details-content'] {
  display: none;
  padding-top: 4px;
  color: var(--secondary-foreground);
}
.rte-details.is-open [data-type='details-content'] {
  display: block;
}
/* an empty toggle says what it is, as Notion's does — in the editor's own
   placeholder gray, gone the moment there is text. Not in read mode. */
.rte:not(.is-readonly)
  .rte-details
  summary:has(> .ProseMirror-trailingBreak:only-child)::before {
  content: 'Toggle';
  float: left;
  height: 0;
  font-weight: 400;
  color: var(--card-foreground);
  pointer-events: none;
}
.rte:not(.is-readonly)
  .rte-details
  [data-type='details-content']
  > p:only-child:has(> .ProseMirror-trailingBreak:only-child)::before {
  content: 'Empty toggle. Click or drop blocks inside.';
  float: left;
  height: 0;
  color: var(--card-foreground);
  pointer-events: none;
}

/* ---- the attachment row (31457:33634): the close shown while the pointer
   is on the row, and rows stacked close ---- */
.rte-doc .node-attachment {
  margin: 8px 0;
}
/* rows stacked close: the next row sits right on the last */
.rte-doc .node-attachment + .node-attachment {
  margin-top: -8px;
}
.rte-doc .rte-attachment > a {
  text-decoration: none;
  font-weight: 400;
}
.rte-attachment .rte-attachment-close {
  margin-left: auto;
  opacity: 0;
  transition: opacity 120ms ease-out;
}
.rte-attachment:hover .rte-attachment-close,
.rte-attachment:focus-within .rte-attachment-close {
  opacity: 1;
}
/* a selected row is its button on the same gray-100 ground as under the
   pointer — the same width and corners — not the block's wider halo */
.rte-doc .rte-attachment.ProseMirror-selectednode {
  background-color: transparent;
  box-shadow: none;
}
.rte-attachment.ProseMirror-selectednode > a {
  background-color: var(--secondary);
}

/* ---- sub- and superscript ---- */
.rte-doc sup,
.rte-doc sub {
  font-size: 0.75em;
  line-height: 0;
}

/* ---- tables (32157:9144): a 12px-radius card on a gray-100 hairline,
   cells ruled right and beneath — never on the outer edge — 6/8 in; the
   header row 32px of 13/15 gray-500, body rows 40px of 14/21 gray-600 that
   grow with their lines. The card is the table's viewport. ---- */
.rte-doc .tableWrapper {
  --rte-sbar: 9px;
  position: relative;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  margin: 16px 0;
  overflow-x: auto;
  /* the card never scrolls its rows: it is as tall as they are */
  overflow-y: hidden;
  container-type: scroll-state;
}
/* the card's scrollbar (32179:58872): a 4px gray-200 pill 5px up from the
   card's bottom edge, on no track, the card's inner width */
@supports not selector(::-webkit-scrollbar) {
  .rte-doc .tableWrapper {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
}
.rte-doc .tableWrapper::-webkit-scrollbar {
  height: var(--rte-sbar);
}
.rte-doc .tableWrapper::-webkit-scrollbar-track {
  background: transparent;
}
.rte-doc .tableWrapper::-webkit-scrollbar-thumb {
  background: var(--border);
  background-clip: padding-box;
  border: 0 solid transparent;
  border-bottom-width: 5px;
  border-radius: 2px / 2px 2px 7px 7px;
}
.rte-doc table {
  margin: 0;
  width: 100%;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  line-height: 21px;
}
@container scroll-state(scrollable: x) {
  .rte-doc table {
    margin-bottom: calc(-1 * var(--rte-sbar));
  }
}
.rte-doc table td,
.rte-doc table th {
  position: relative;
  height: 40px;
  min-width: 48px;
  padding: 6px 8px;
  border: 0;
  border-right: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
  vertical-align: middle;
  text-align: left;
  background: transparent;
}
.rte-doc table tr > :last-child {
  border-right: 0;
}
.rte-doc table tr:last-child > * {
  border-bottom: 0;
}
.rte-doc table th {
  height: 32px;
  font-weight: 400;
}
.rte-doc table td p {
  font-size: 14px;
  line-height: 21px;
  margin: 0;
  color: var(--muted-foreground);
}
.rte-doc table th p {
  font-size: 13px;
  line-height: 15px;
  margin: 0;
  color: var(--accent-foreground);
}
/* the row's border option: one rule, or none */
.rte-doc table tr[data-border] > * {
  border-right: 0;
  border-bottom: 0;
}
.rte-doc table tr[data-border='top'] > * {
  border-top: 1px solid var(--border-soft);
}
.rte-doc table tr[data-border='right'] > * {
  border-right: 1px solid var(--border-soft);
}
.rte-doc table tr[data-border='bottom'] > * {
  border-bottom: 1px solid var(--border-soft);
}
.rte-doc table tr[data-border='left'] > * {
  border-left: 1px solid var(--border-soft);
}
${cellTintRules}

/* ---- a block picked up by its grip, or selected by a click on it: a
   gray-100 ground 4px past its edges ---- */
.rte-doc .ProseMirror-selectednode:not(img):not(video) {
  background-color: var(--secondary);
  border-radius: 4px;
  box-shadow: 0 0 0 4px var(--secondary);
}
.rte-doc.rte-dragging .ProseMirror-selectednode:not(img):not(video) {
  opacity: 0.4;
}

/* ---- the table selection: a 1px gray-500 line around the cell or the run
   of cells; at the card's corners it turns on the card's inner 11px radius ---- */
.rte-doc .selectedCell::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 2;
  border-radius: 0;
  box-shadow: inset 0 0 0 1px var(--accent-foreground);
}
.rte-doc.table-cell-range .selectedCell::after {
  box-shadow: none;
}
.rte-doc .table-selection-box {
  position: absolute;
  pointer-events: none;
  z-index: 3;
  border-radius: 0;
  box-sizing: content-box;
  box-shadow: inset 0 0 0 1px var(--accent-foreground);
}
/* the cell's ring lies on the rules around it; on the card's edge, where
   there is no rule and the card would clip it, it stays on the cell's own
   edge */
.rte-doc .selectedCell::after {
  inset: -1px;
}
.rte-doc table tr > :first-child.selectedCell::after {
  left: 0;
}
.rte-doc table tr:first-child > .selectedCell::after {
  top: 0;
}
.rte-doc table tr > :last-child.selectedCell::after {
  right: 0;
}
.rte-doc table tr:last-child > .selectedCell::after {
  bottom: 0;
}
@container scroll-state(scrollable: x) {
  .rte-doc table tr:last-child > .selectedCell::after {
    bottom: var(--rte-sbar);
  }
}
.rte-doc table tr:first-child > :first-child.selectedCell::after {
  border-top-left-radius: 11px;
}
.rte-doc table tr:first-child > :last-child.selectedCell::after {
  border-top-right-radius: 11px;
}
.rte-doc table tr:last-child > :first-child.selectedCell::after {
  border-bottom-left-radius: 11px;
}
.rte-doc table tr:last-child > :last-child.selectedCell::after {
  border-bottom-right-radius: 11px;
}
/* tiptap's column resize handle: a 1px gray-600 line on the edge under the
   pointer, the cell's height, taken 1px past so each segment reaches the
   next, and lifted over the cells' own grounds */
.rte-doc .column-resize-handle {
  position: absolute;
  top: 0;
  bottom: -1px;
  right: -1px;
  width: 1px;
  background-color: var(--muted-foreground);
  pointer-events: none;
  z-index: 2;
}
.rte-doc table tr:last-child > * > .column-resize-handle {
  bottom: 0;
}
.rte-doc table tr > :last-child > .column-resize-handle {
  right: 0;
}
.rte-doc.resize-cursor {
  cursor: col-resize;
}

/* ---- a comment's run: amber beneath, as the file marks it ---- */
.rte-comment {
  background: var(--color-amber-100);
  border-bottom: 1px solid var(--color-amber-500);
  cursor: pointer;
}
.dark .rte-comment {
  background: var(--color-amber-900);
}

/* the document's pictures keep the prose scale's 2em rhythm */
.rte-doc > img,
.rte-doc .rte-figure,
.rte-doc [data-type='columns'][data-media='true'] {
  margin-top: 2em;
  margin-bottom: 2em;
}
.rte-doc .rte-figure > img {
  margin: 0;
}

/* a caption under a frame: 14px gray-500, centred 8px below */
.rte-doc .rte-media-caption {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  line-height: 21px;
  color: var(--accent-foreground);
}

/* an embed and the players keep the column */
.rte-doc iframe {
  max-width: 100%;
}

/* read only: the document as it is, no caret */
.rte.is-readonly .ProseMirror {
  caret-color: transparent;
}

/* ================= the table's controls (RteTableControls) ================ */
/* a handle: a 3×14 gray-500 pill on full corners under a 2px white stroke,
   straddling the edge's line. Hovered or open it is the file's grip: a
   10×20 (20×10) gray-500 pill on 4px corners with three 3px white dots */
.rte-tc-handle {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: background-color 150ms;
  overflow: visible;
  cursor: grab;
  touch-action: none;
}
.rte-tc-handle.is-cell {
  cursor: pointer;
}
.rte-tc-anchor {
  position: fixed;
  pointer-events: none;
}
body.rte-tc-dragging,
body.rte-tc-dragging .rte-tc-handle {
  cursor: grabbing;
  user-select: none;
}
.rte-tc-drop {
  position: fixed;
  z-index: 75;
  border-radius: 9999px;
  pointer-events: none;
  background-color: var(--border-stronger);
  opacity: 0;
  transition:
    top 120ms cubic-bezier(0.2, 0, 0, 1),
    left 120ms cubic-bezier(0.2, 0, 0, 1),
    opacity 120ms;
}
.rte-tc-drop.is-on {
  opacity: 1;
}
/* the ghost: the row or column lifted, on the card's surface under the lg
   shadow, fading up as it rises and down as it lands */
.rte-tc-ghost {
  position: fixed;
  z-index: 70;
  pointer-events: none;
  overflow: hidden;
  border-radius: 6px;
  background-color: var(--card);
  box-shadow: var(--shadow-elevation-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1));
  opacity: 0;
  transition: opacity 140ms;
  will-change: transform;
}
.rte-tc-ghost.is-up {
  opacity: 0.85;
}
.rte-tc-ghost table {
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  line-height: 21px;
}
.rte-tc-ghost td,
.rte-tc-ghost th {
  height: 40px;
  padding: 6px 8px;
  border: 0;
  border-right: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
  vertical-align: middle;
  text-align: left;
  background: transparent;
}
.rte-tc-ghost th {
  height: 32px;
  font-weight: 400;
}
.rte-tc-ghost td p {
  font-size: 14px;
  line-height: 21px;
  margin: 0;
  color: var(--muted-foreground);
}
.rte-tc-ghost th p {
  font-size: 13px;
  line-height: 15px;
  margin: 0;
  color: var(--accent-foreground);
}
.rte-tc-ghost tr > :last-child {
  border-right: 0;
}
.rte-tc-ghost tr:last-child > * {
  border-bottom: 0;
}
@media (prefers-reduced-motion: reduce) {
  .rte-tc-drop,
  .rte-tc-ghost {
    transition: none;
  }
}
.rte-tc-handle.is-row {
  width: 10px;
  height: 20px;
}
.rte-tc-handle.is-col {
  width: 20px;
  height: 10px;
}
.rte-tc-pill {
  position: absolute;
  display: block;
  border-radius: 9999px;
  background-color: var(--accent-foreground);
  /* the gaps either side are the editor's own ground */
  box-shadow: 0 0 0 2px var(--background);
}
/* on the table's edge the dash is drawn by .rte-tc-edge, not the pill */
.rte-tc-handle.is-row:not(.is-cell) .rte-tc-pill,
.rte-tc-handle.is-col .rte-tc-pill {
  display: none;
}
/* the edge's dash: a 1px gray-500 length of the table's rule — the
   selection's own colour — laid on the wrapper's own edge with the
   wrapper's own 1px border, so it lands on the rule's device pixels at any
   zoom, or a pixel in, on the ring, where the ring runs along that edge */
.rte-tc-edge {
  position: fixed;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--background);
}
.rte-tc-edge.is-row {
  width: 0;
  height: 14px;
  border-left: 1px solid var(--accent-foreground);
}
.rte-tc-edge.is-col {
  width: 14px;
  height: 0;
  border-top: 1px solid var(--accent-foreground);
}
.rte-tc-handle:hover + .rte-tc-edge,
.rte-tc-handle.is-open + .rte-tc-edge {
  display: none;
}
.rte-tc-handle.is-row .rte-tc-pill {
  left: 3px;
  top: 2px;
  width: 1px;
  height: 14px;
}
/* the cell's handle on the selection's ring is, like the edge's, a 1px
   length of that ring */
.rte-tc-handle.is-row.is-cell .rte-tc-pill {
  left: 4px;
  width: 1px;
  background-color: var(--accent-foreground);
}
.rte-tc-dots {
  position: absolute;
  inset: -1px;
  display: none;
}
.rte-tc-handle.is-row .rte-tc-dots {
  background-image:
    radial-gradient(circle at 5px 5px, #fff 1.5px, transparent 1.75px),
    radial-gradient(circle at 5px 10px, #fff 1.5px, transparent 1.75px),
    radial-gradient(circle at 5px 15px, #fff 1.5px, transparent 1.75px);
}
.rte-tc-handle.is-col .rte-tc-dots {
  background-image:
    radial-gradient(circle at 5px 5px, #fff 1.5px, transparent 1.75px),
    radial-gradient(circle at 10px 5px, #fff 1.5px, transparent 1.75px),
    radial-gradient(circle at 15px 5px, #fff 1.5px, transparent 1.75px);
}
.rte-tc-handle:hover,
.rte-tc-handle.is-open {
  background-color: var(--accent-foreground);
}
.rte-tc-handle:hover .rte-tc-pill,
.rte-tc-handle.is-open .rte-tc-pill {
  display: none;
}
.rte-tc-handle:hover .rte-tc-dots,
.rte-tc-handle.is-open .rte-tc-dots {
  display: block;
}
/* a strip: the plus alone, gray-400 over the page, darkening under the
   pointer — the glyph is the whole control */
.rte-tc-strip {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  color: var(--card-foreground);
  transition: color 150ms;
}
.rte-tc-strip:hover {
  color: var(--muted-foreground);
}
/* the Colour submenu: Default and the palette, 24px on 8px corners — six
   24px columns spread edge to edge */
.rte-tc-swatches {
  display: grid;
  gap: 6px;
  padding: 4px;
  grid-template-columns: repeat(6, 24px);
  justify-content: space-between;
}
.rte-tc-swatch {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 14px;
  line-height: 1;
  color: var(--secondary-foreground);
  transition: box-shadow 150ms;
  background-color: var(--sw, transparent);
}
.rte-tc-swatch:hover {
  box-shadow: 0 0 0 2px var(--border-normal);
}
.dark .rte-tc-swatch {
  background-color: var(--sw-dark, transparent);
}

/* ================= the comment thread card ================ */
/* the header's rule is drawn inside its 32px, as the file's inside stroke
   is, and its controls are 24px on an 8px radius */
.rte-thread-head {
  box-shadow: inset 0 -1px 0 var(--border-soft);
}
.rte-thread-btn {
  display: flex;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--accent-foreground);
  transition: background-color 150ms, color 150ms;
}
.rte-thread-btn:hover {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

/* ================= the toolbar (RichTextToolbar) ================ */
/* a plain control: 28px, the glyph centred; pressed or open on gray-100 */
.rte-btn {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--secondary-foreground);
  transition: background-color 150ms;
}
.rte-btn:hover {
  background-color: var(--secondary);
}
.rte-btn:disabled {
  opacity: 0.4;
}
.rte-btn:disabled:hover {
  background-color: transparent;
}
.rte-btn[aria-pressed='true'],
.rte-btn.is-open,
.rte-btn[data-popup-open] {
  background-color: var(--muted);
}
/* a select: its glyph or word, 4px, the chevron; 8px in either side */
.rte-select {
  display: flex;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  padding: 0 8px;
  color: var(--secondary-foreground);
  transition: background-color 150ms;
}
.rte-select:hover {
  background-color: var(--secondary);
}
.rte-select.is-open,
.rte-select[data-popup-open] {
  background-color: var(--muted);
}
/* the colour select is tighter: 2px around its 24px glyph box, which is
   the file's outline button — ruled in outline-gray-2, darker under the
   pointer — while the frame around it takes no fill of its own */
.rte-select-tight,
.rte-select-tight.is-open,
.rte-select-tight[data-popup-open] {
  gap: 2px;
  background-color: transparent;
  padding: 0 2px;
}
.rte-select-tight:hover {
  background-color: transparent;
}
.rte-select-tight > :first-child {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border);
  transition: border-color 150ms;
}
.rte-select-tight:hover > :first-child,
.rte-select-tight.is-open > :first-child,
.rte-select-tight[data-popup-open] > :first-child {
  border-color: var(--border-normal);
}
/* the size stepper's − and +: 24px on gray-100 */
.rte-step {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: var(--secondary);
  color: var(--secondary-foreground);
  transition: background-color 150ms;
}
.rte-step:hover {
  background-color: var(--muted);
}
.rte-tb-divider {
  margin: 0 4px;
  height: 20px;
  width: 1px;
  flex-shrink: 0;
  background-color: var(--muted);
}

/* ================= the floating bar (RteBubbleMenu) ================ */
.rte-bubble {
  display: flex;
  height: 28px;
  align-items: center;
  border-radius: 10px;
  background-color: var(--card);
  padding: 2px;
  box-shadow: var(--shadow-elevation-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1));
}
/* the select: at least 100×24, 6/4 in, the label and chevron 4 apart on a
   6px radius; filled gray-100 under the pointer and while its menu is open */
.rte-bubble-select {
  display: flex;
  height: 24px;
  min-width: 100px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  border-radius: 6px;
  padding: 4px 4px 4px 6px;
  color: var(--secondary-foreground);
  transition: background-color 150ms;
}
.rte-bubble-select:hover,
.rte-bubble-select.is-open,
.rte-bubble-select[data-popup-open] {
  background-color: var(--secondary);
}
.rte-bubble-btn {
  display: flex;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--secondary-foreground);
  transition: background-color 150ms;
}
.rte-bubble-btn:hover,
.rte-bubble-btn[aria-pressed='true'],
.rte-bubble-btn.is-open,
.rte-bubble-btn[data-popup-open] {
  background-color: var(--secondary);
}
/* a 9px slot: 4, the hairline, 4 */
.rte-bubble-divider {
  margin: 0 4px;
  height: 16px;
  width: 1px;
  flex-shrink: 0;
  background-color: var(--border-soft);
}

/* ================= the block grip (RteBlockHandle) ================ */
/* the grip: 16×24 on 4px corners, gray-400 dots that darken on a gray-100
   ground under the pointer */
.rte-bh-handle {
  pointer-events: auto;
  position: fixed;
  display: flex;
  height: 24px;
  width: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--card-foreground);
  transition: background-color 150ms, color 150ms;
  cursor: grab;
}
.rte-bh-handle:hover {
  background-color: var(--secondary);
  color: var(--muted-foreground);
}
.rte-bh-handle:active {
  cursor: grabbing;
}
/* on a picture it is the media's own chrome: white dots on the 36% black
   overlay, darker under the pointer, one look in either theme */
.rte-bh-handle.is-on-media {
  background-color: rgb(0 0 0 / 0.36);
  color: #fff;
}
.rte-bh-handle.is-on-media:hover {
  background-color: rgb(0 0 0 / 0.48);
  color: #fff;
}
.rte-bh-handle.is-on-media:active {
  background-color: rgb(0 0 0 / 0.6);
}
/* out of sight, not out of the way: the browser ends a drag whose source
   stops taking pointer events */
.rte-bh-handle.is-dragging {
  opacity: 0;
}
/* the copy that follows the pointer: the block at half strength, and the
   line at the edge it would land on, 3px of gray-900 across the block */
.rte-bh-ghost {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 70;
  pointer-events: none;
  opacity: 0.5;
  will-change: transform;
}
.rte-bh-line {
  position: fixed;
  z-index: 65;
  height: 3px;
  border-radius: 9999px;
  pointer-events: none;
  background-color: var(--border-stronger);
}
/* beside: the vertical line at the edge the block would stand at */
.rte-bh-line.is-side {
  width: 3px;
}
/* the picture a swap would trade with, ringed as a selected picture is */
.rte-bh-line.is-swap {
  border-radius: 6px;
  background-color: transparent;
  box-shadow: 0 0 0 2px var(--border-stronger);
}
/* the blocks of a run while they are carried, as a carried block is */
.rte-doc .rte-bh-carried {
  opacity: 0.4;
}

/* ================= the slots (RteImageSlot / RteEmbedSlot) ================ */
/* the file's 700×36 row: surface-gray-1 on a 6px radius, 10px in, the 16px
   glyph and the 14px ink-gray-5 word 10px apart */
.rte-slot {
  margin: 8px 0;
}
.rte-slot-face {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 10px;
  height: 36px;
  border-radius: 6px;
  background: var(--input);
  color: var(--accent-foreground);
  font-size: 14px;
  line-height: 16px;
  text-align: start;
}
.rte-slot-face:hover:not(:disabled),
.rte-slot-face.is-open {
  background: var(--secondary);
}
.rte-slot-face:disabled {
  cursor: default;
}
/* in a column the slot is the file's cell: the dashed outline holds the
   342 × 170 shape and the panel sits 8px inside it */
[data-type='column'] .rte-slot {
  margin: 0;
  border: 1px dashed var(--border-normal);
  border-radius: 6px;
  padding: 8px;
  aspect-ratio: 342 / 170;
}
[data-type='column'] .rte-slot .rte-slot-face {
  height: 100%;
  justify-content: center;
  border-radius: 6px;
}

/* ================= the column bar (RteColumnResizer) ================ */
/* the hand's target is 12px across the gap; the bar in it is 3px on full
   corners, gray-400, gray-600 under the pointer and while it drags */
.rte-cr {
  position: fixed;
  z-index: 54;
  display: flex;
  width: 12px;
  margin-left: -6px;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
}
.rte-cr-bar {
  width: 3px;
  height: 100%;
  border-radius: 9999px;
  background: var(--border-strong);
  transition: background-color 120ms;
}
.rte-cr:hover .rte-cr-bar,
.rte-cr.is-dragging .rte-cr-bar {
  background: var(--muted-foreground);
}
body.rte-col-drag {
  cursor: col-resize;
  user-select: none;
}

/* ================= the link card (RteLinkPanel) ================ */
/* the file keeps the field on gray-100 with no rule while it is edited */
.rte-link input:focus,
.rte-link input:hover {
  background-color: var(--secondary) !important;
  box-shadow: none !important;
}
.rte-link-shake {
  animation: rte-link-shake 160ms ease-in-out;
}
@keyframes rte-link-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rte-link-shake {
    animation: none;
  }
}

/* ================= the colour card (RteColorPanel) ================ */
/* a swatch: the file's 24px outline button — white, ruled in the colour's
   tint, an 8px radius — and, for a background, filled with its wash */
.rte-swatch {
  --sw-ink: var(--foreground);
  --sw-line: var(--border);
  --sw-fill: var(--card);
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid;
  background-color: var(--card);
  font-size: 14px;
  line-height: 1;
  transition: box-shadow 150ms;
  color: var(--sw-ink);
  border-color: var(--sw-line);
}
.rte-swatch-fill {
  background-color: var(--sw-fill);
}
.rte-swatch:hover,
.rte-swatch:focus-visible {
  box-shadow: 0 0 0 1px var(--sw-line);
  outline: none;
}
.rte-swatch[aria-pressed='true'] {
  box-shadow: 0 0 0 2px var(--border-normal);
}
.dark .rte-swatch {
  color: var(--sw-ink-dark, var(--sw-ink));
  border-color: var(--sw-line-dark, var(--sw-line));
}
.dark .rte-swatch-fill {
  background-color: var(--sw-fill-dark, var(--sw-fill));
}
`

let injected = false

/** Injects the editor stylesheet once per document. */
export function EditorStyles() {
  React.useInsertionEffect(() => {
    if (injected || document.getElementById("espresso-rte-styles")) {
      injected = true
      return
    }
    const style = document.createElement("style")
    style.id = "espresso-rte-styles"
    style.textContent = CSS
    document.head.appendChild(style)
    injected = true
  }, [])
  return null
}
