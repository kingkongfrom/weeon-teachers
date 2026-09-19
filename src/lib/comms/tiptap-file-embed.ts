import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileEmbedNodeView } from "@/components/comms/file-embed-node-view";

/** Inline document card (PDF, Word, etc.) embedded in the circular body. */
export const FileEmbed = Node.create({
  name: "fileEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      path: { default: null },
      fileName: { default: "Documento" },
      mimeType: { default: null },
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-file-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-file-embed": "",
        class: "rte-file-embed",
      }),
      ["span", { class: "rte-file-embed-icon", "aria-hidden": "true" }, "📄"],
      ["span", { class: "rte-file-embed-name" }, HTMLAttributes.fileName ?? "Documento"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileEmbedNodeView);
  },
});
