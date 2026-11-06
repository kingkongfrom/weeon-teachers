import { mergeChatMessages } from "@/lib/comms/chat-live-messages";

/**
 * The sender's own reply must keep its quote when the socket echoes it back.
 *
 * The bug: the optimistic row carried `replyTo`, the broadcast echo did not, and
 * "incoming wins" replaced the full row with the emptier one — so the sender's
 * reply showed only their typed text until a reload fetched it back from the
 * database.
 */

type Row = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
  replyTo?: { id: string; senderName: string; preview: string; createdAt: string };
  reactions?: { emoji: string; count: number; names: string[]; mine: boolean }[];
};

const REPLY = {
  id: "orig-1",
  senderName: "Rodrigo Acosta",
  preview: "Recuerda traer materiales para la prueba",
  createdAt: "2026-11-06T20:00:00.000Z",
};

function optimistic(): Row {
  return {
    id: "m1",
    body: "awesome",
    createdAt: "2026-11-06T21:57:00.000Z",
    mine: true,
    authorName: "Tú",
    replyTo: REPLY,
    reactions: [],
  };
}

function echo(): Row {
  return {
    id: "m1",
    body: "awesome",
    createdAt: "2026-11-06T21:57:00.000Z",
    mine: true,
    authorName: "Tú",
    /* The broadcast payload has no replyTo and no reactions. */
  };
}

describe("mergeChatMessages", () => {
  it("keeps the reply quote when the socket echoes a message without one", () => {
    const merged = mergeChatMessages<Row>([optimistic()], [echo()]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.replyTo).toEqual(REPLY);
  });

  it("keeps reactions when the echo carries none", () => {
    const withReactions: Row = {
      ...optimistic(),
      reactions: [{ emoji: "👍", count: 2, names: ["Tú", "Ana"], mine: true }],
    };
    const merged = mergeChatMessages<Row>([withReactions], [{ ...echo(), reactions: [] }]);
    expect(merged[0]?.reactions).toHaveLength(1);
  });

  it("still takes genuinely new values from the echo", () => {
    const merged = mergeChatMessages<Row>([optimistic()], [{ ...echo(), body: "edited" }]);
    expect(merged[0]?.body).toBe("edited");
  });

  it("adds a message that is not already present", () => {
    const other: Row = {
      id: "m2",
      body: "hola",
      createdAt: "2026-11-06T21:58:00.000Z",
      mine: false,
      authorName: "Rodrigo",
    };
    const merged = mergeChatMessages<Row>([optimistic()], [other]);
    expect(merged.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("orders by createdAt", () => {
    const later: Row = {
      id: "m3",
      body: "later",
      createdAt: "2026-11-06T22:30:00.000Z",
      mine: false,
      authorName: "Rodrigo",
    };
    const merged = mergeChatMessages<Row>([later], [optimistic()]);
    expect(merged.map((m) => m.id)).toEqual(["m1", "m3"]);
  });

  it("returns the same array when there is nothing incoming", () => {
    const previous = [optimistic()];
    expect(mergeChatMessages<Row>(previous, [])).toBe(previous);
  });
});
