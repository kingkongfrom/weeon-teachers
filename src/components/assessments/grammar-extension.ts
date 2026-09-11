import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

/** Inline squiggly underline for grammar/spelling issues. */

export type GrammarDecoration = { from: number; to: number; message: string };

const grammarKey = new PluginKey<DecorationSet>("grammarCheck");

export const GrammarCheck = Extension.create({
  name: "grammarCheck",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: grammarKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (transaction, previous) => {
            const meta = transaction.getMeta(grammarKey) as DecorationSet | undefined;
            if (meta) return meta;
            return previous.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return grammarKey.getState(state);
          },
        },
      }),
    ];
  },
});

export function applyGrammarDecorations(
  editor: Editor,
  items: GrammarDecoration[],
) {
  const decorations = items.map((item) =>
    Decoration.inline(item.from, item.to, {
      class: "grammar-issue",
      title: item.message,
    }),
  );
  const set = DecorationSet.create(editor.state.doc, decorations);
  editor.view.dispatch(editor.state.tr.setMeta(grammarKey, set));
}

export function clearGrammarDecorations(editor: Editor) {
  editor.view.dispatch(
    editor.state.tr.setMeta(grammarKey, DecorationSet.empty),
  );
}
