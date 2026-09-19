"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { FileText } from "lucide-react";

/** WYSIWYG preview of an embedded document inside the circular editor. */
export function FileEmbedNodeView({ node }: NodeViewProps) {
  const fileName = (node.attrs.fileName as string) || "Documento";
  const src = (node.attrs.src as string) || "";

  return (
    <NodeViewWrapper className="rte-file-embed-node">
      <div className="rte-file-embed" contentEditable={false}>
        {src ? (
          <a href={src} target="_blank" rel="noopener noreferrer" className="rte-file-embed-link">
            <FileText className="rte-file-embed-icon-svg" aria-hidden />
            <span className="rte-file-embed-name">{fileName}</span>
          </a>
        ) : (
          <>
            <FileText className="rte-file-embed-icon-svg" aria-hidden />
            <span className="rte-file-embed-name">{fileName}</span>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
