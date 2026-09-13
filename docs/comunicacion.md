# Comunicación — email-style messaging (teacher web)

*Sprint 7. Teacher ↔ parents, with individual and group recipients. Schema is
owned by `weeon-tenants`; the parent/student consumption is the next phase in
`weeon-mobile`.*

## One line

Teachers send **email-style messages** — subject + rich-text body — to hand-picked
**people** (parents of their students) or a whole **group** (a class's guardians).
Each message is a `threads` row with a `messages` history; recipients read their
own copy.

## Routes

| Route | Purpose |
| --- | --- |
| `/comunicacion` | Inbox / Sent list (`?folder=sent`) |
| `/comunicacion/nuevo` | Compose (recipients + subject + rich body) |
| `/comunicacion/[threadId]` | Thread view + reply |

Panel general's **Comunicación** card → `/comunicacion`.

## Data model (weeon-tenants, additive)

- `threads`: `tenant_id`, `subject`, `class_id` (group sends), `audience`
  (`individual` \| `group`), `created_by`, `allow_replies`, `last_message_at`,
  timestamps.
- `messages`: `thread_id`, `author_profile_id`, `body` **jsonb ProseMirror doc**
  (same safe format as assessments — never HTML), `created_at`.
- `thread_recipients`: `thread_id`, `profile_id`, `role` (`to`/`cc`), `read_at`;
  unique `(thread_id, profile_id)`. Recipients are `profiles` — parents already
  have one via `parent_student_links.parent_profile_id`.

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

## Deferred (follow-ups)

- Cc UI (column + roles exist), drafts, trash/folders, star/favorite.
- Realtime + notifications; the parent/student side in `weeon-mobile`.
- `allow_replies = false` threads: the author can still post; recipients cannot.
