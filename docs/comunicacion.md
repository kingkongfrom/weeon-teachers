# Comunicación — email-style messaging (teacher web)

*Sprint 7. Teacher ↔ parents, with individual and group recipients. Schema is
owned by `weeon-tenants`; the parent/student consumption is the next phase in
`weeon-mobile`.*

## One line

Comunicación has **two** channels, shown as two cards on `/comunicacion`:

- **Correo** — email-style threads (subject + rich body + attachments) to
  hand-picked people or a whole group's guardians.
- **Chat** — realtime 1:1 teacher ↔ guardian conversations (iMessage-style), a
  separate data model (no subject/folders).

Panel general's **Comunicación** card → `/comunicacion` (the hub). **Novedades
stays in the aula virtual** (class stream) — it is not part of Comunicación.

## Routes

| Route | Purpose |
| --- | --- |
| `/comunicacion` | Hub — cards for **Correo** and **Chat** |
| `/comunicacion/correo` | Mailbox — folder `?folder=inbox\|sent\|trash` |
| `/comunicacion/nuevo` | Compose email (recipients + subject + rich body) |
| `/comunicacion/correo/[threadId]` | Email thread view + reply |
| `/comunicacion/chat` | Chat list + **Nuevo chat** picker (guardians only) |
| `/comunicacion/chat/[conversationId]` | Chat thread + composer |

## Mailbox (sidebar + folders + drag & drop)

`mailbox-workspace.tsx` renders the **sidebar layout** — gradient **Redactar**,
then the folder list — with the thread list on the right:

- **Folders:** Recibidos (`inbox`), Enviados (`sent`), Papelera (`trash`). A
  thread's default folder is derived (authored → sent, received → inbox) and can
  be overridden in `message_thread_state`.
- **Drag & drop:** each thread row is `draggable` (`application/x-weeon-thread`);
  the folder entries are drop targets that call `setThreadFolder`.
- **Colors match the app:** `brand-gradient` for every primary CTA (Redactar,
  confirm selection, send) and `TONE_PILL.purple` (the shared brand-violet pill
  from `lib/dashboard/tones.ts`) for active folders and the audience toggle, so
  the mailbox sits in the same purple→blue family as the Redactar button. Unread
  dots and tags use the teal accent. Categories were removed; the layout is
  unchanged.

## Data model (weeon-tenants, additive)

- `threads`: `tenant_id`, `subject`, `class_id` (group sends), `audience`
  (`individual` \| `group`), `created_by`, `allow_replies`, `last_message_at`,
  timestamps.
- `messages`: `thread_id`, `author_profile_id`, `body` **jsonb ProseMirror doc**
  (same safe format as assessments — never HTML), `created_at`.
- `thread_recipients`: `thread_id`, `profile_id` (nullable), **`recipient_key`**
  (roster account id, or a profile id) + **`display_name` snapshot**, `role`
  (`to`/`cc`), `read_at`; unique `(thread_id, recipient_key)`. Students and
  guardians are **roster-keyed** (they usually have no Auth profile yet), so a
  teacher can pick **parents and students**; a recipient matches once they sign
  in (`my_identity_keys()` = profile id + linked `roster_accounts`).

Helpers `is_thread_participant()` / `owns_thread()` are **SECURITY DEFINER** so
the `threads` ↔ `thread_recipients` policies never recurse. A recipient may mark
their own row read; the author manages the recipient list.

RPCs:

- `create_message_thread(subject, body, class_id, audience, recipient_ids, allow_replies)`
  — inserts the thread + recipients + first message atomically and expands a
  group send to the class guardians' profiles.
- `list_message_contacts()` — parents of the teacher's students, for the picker.

Migration: `20260913160000_messaging.sql`.

## Teacher web

- `lib/dashboard/messages.ts` — `loadMessageSummaries(folder)`,
  `loadThreadDetail(id)` (previews via `docToPlainText`).
- `lib/teachers/message-actions.ts` — `createMessageThread`, `sendThreadMessage`,
  `markThreadRead` (Zod-validated; the RPC derives tenant/author).
- `components/messages/message-composer.tsx` — audience toggle (Personas /
  Grupo), a modal **recipient picker** (`recipient-picker.tsx`: search, select,
  confirm) with selected chips, subject, the shared **`RichTextEditor`** (TipTap,
  from the assessment builder), allow-replies, and the **attachment dropzone**.
- `components/messages/attachment-dropzone.tsx` — always-available **drag & drop**
  (plus click-to-browse) file staging, with chips and remove.
- `components/messages/thread-view.tsx` — history rendered with `RichTextView`,
  the thread's **attachments** (signed URLs) as chips, and a reply composer with
  its own dropzone; marks the thread read on open.
- Attachments: `uploadMessageAttachment(formData)` stores the file under
  `{tenant}/{thread}/{uuid}-{name}` in the private **`message-attachments`**
  bucket and records a `message_attachments` row. 20 MB limit. The inbox list
  shows a paperclip + count per thread.

## Chat (realtime, teacher ↔ guardian)

Separate from email: no subject, no folders, plain-text bubbles, **guardians
only**. One conversation per `(teacher, guardian roster key)`.

- Schema in `weeon-tenants` (`20260914050000_chat.sql`): `chat_conversations`,
  `chat_messages`; writes only through SECURITY DEFINER RPCs
  (`start_chat_conversation`, `send_chat_message`, `mark_chat_read`) and
  `list_chat_conversations()` for the list. `my_identity_keys()` matches the
  roster-keyed guardian. `chat_messages` is in the `supabase_realtime`
  publication.
- Teacher web: `lib/dashboard/chat.ts` (loaders), `lib/teachers/chat-actions.ts`
  (actions), `components/messages/chat-list.tsx` (list + picker) and
  `chat-thread.tsx` (bubbles, day separators, pinned composer, live inserts).
- **Realtime:** `lib/supabase/browser.ts` builds one `createBrowserClient` from
  the public URL + anon key, which the server route passes down (this app keeps
  Supabase env vars server-only). Subscriptions filter by `conversation_id`.
  The client must pass `cookieOptions: authCookieOptions()` (custom cookie name
  `sb-weeon-teachers-auth`, same as `createSessionClient`), and callers must use
  `getAuthedRealtimeClient()` and only then create the channel. `realtime-js`
  attaches the access token only to channels subscribed *after* the token is
  resolved (or when it later changes), so subscribing before the async cookie
  session resolves joins unauthenticated and RLS drops every incoming row —
  i.e. the teacher would only see new guardian messages after a page reload.
- Contacts come from `list_message_contacts()` filtered to `kind = 'parent'`
  (the same RPC the email composer uses). That RPC is admin-aware as of
  `20260914060000_message_contacts_admin.sql` — a school admin (who sees every
  class via RLS) now gets the full parent list, not an empty picker.
- Teacher-initiated only for now.
- Parent side is built in `weeon-mobile` (`features/chat`, `/parent/chat`), also
  realtime.

## Deferred (follow-ups)

- Cc UI (column + roles exist), drafts, trash/folders, star/favorite.
- Realtime + notifications for **email threads**; the parent/student email side in
  `weeon-mobile` (Chat already ships teacher web + parent mobile, realtime).
- Guardian-initiated chats (mobile "new chat with a teacher") and chat search.
- `allow_replies = false` threads: the author can still post; recipients cannot.
