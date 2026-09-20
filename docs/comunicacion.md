# Comunicación — mensajes + chat (teacher web)

*Teacher ↔ guardians/students. Schema owner: `weeon-tenants`. Families read
messages in `weeon-mobile`.*

## One line

Comunicación has **three** channels on `/comunicacion`:

- **Mensajes** — same mailbox UX as the school ERP (`weeon-tenants`): Para/Cc,
  bulk group picker, rich body, Dropbox + bottom attachment zone, folders,
  favorites, custom labels, signature, optional replies.
- **Chat encargados** — realtime 1:1 teacher ↔ guardian (`chat_*` tables).
- **Chat administración** — realtime school admin ↔ teacher
  (`admin_teacher_chat_*`). Either side can open the thread; unified in
  `/comunicacion/chat` with encargados.

Panel general **Comunicación** → `/comunicacion`. **Novedades** stays in aula
virtual — not part of Comunicación.

## Routes

| Route | Purpose |
| --- | --- |
| `/comunicacion` | Hub — **Mensajes** + **Chat** cards |
| `/comunicacion/mensajes` | Mailbox — `?folder=inbox\|sent\|trash\|favorite`, `?label=<uuid>` |
| `/comunicacion/nuevo` | Unified compose (`UnifiedMessageComposer`) |
| `/comunicacion/mensajes/[threadId]` | Thread detail + reply when `allow_replies` |
| `/comunicacion/circulares`, `/comunicacion/correo` | Legacy redirects → `/comunicacion/mensajes` |
| `/comunicacion/chat`, `/comunicacion/chat/[conversationId]` | Guardian + admin chat (one inbox) |
| `/comunicacion/chat-admin/*` | Redirect → `/comunicacion/chat` |

## Mensajes (parity with tenants)

Ported from `weeon-tenants/components/comms/*` (2026-09-19). Teacher scope:

- **Recipients:** `list_message_contacts()` — parents/students in assigned classes
  only. Bulk picker: **class-level** sections (e.g. 1A · Encargados); no
  school-wide broadcast lanes.
- **Multi bulk:** several section checkboxes in one send → one thread, deduped
  roster keys (`recipientsFromBulkSelections` in `lib/comms/recipient-catalog.ts`).
- **Compose:** To/Cc, subject, TipTap toolbar (`components/comms/rich-text.tsx`),
  **Permitir respuestas**, attachments via bottom dropzone + **Google Drive** +
  **Dropbox** (`NEXT_PUBLIC_GOOGLE_DRIVE_*`, `NEXT_PUBLIC_DROPBOX_APP_KEY`;
  APIs `POST /api/comms/google-drive-import`, `POST /api/comms/dropbox-import`).
  No duplicate “Content / Attach file” row on the body (`inlineEmbeds={false}`).
- **Mailbox:** search, unread filter, favorites, custom folders (labels), drag to
  folder, signature + auto-reply settings dialogs.

### Key files

| Area | Path |
| --- | ---- |
| Routes | `src/app/(app)/comunicacion/mensajes/`, `nuevo/`, `[threadId]/` |
| Mailbox UI | `components/comms/messages-workspace.tsx` |
| Compose | `components/comms/unified-message-composer.tsx` |
| Picker | `components/comms/recipient-picker-modal.tsx` |
| Loaders | `lib/dashboard/messages.ts`, `lib/dashboard/comms-groups.ts` |
| Actions | `lib/teachers/comms-actions.ts` |
| Shared lib | `lib/comms/*`, `lib/i18n/comms-messages.ts`, `use-i18n.ts` |
| Paths | `lib/comms/paths.ts` (`TEACHER_MESSAGES` = `/comunicacion/mensajes`) |

Legacy `components/messages/mailbox-workspace.tsx` and `message-composer.tsx`
were removed; **chat** still uses `components/messages/chat-*.tsx`.

## Data model (weeon-tenants)

Same as ERP — see `weeon-tenants/docs/data-access.md` (threads, messages,
thread_recipients, message_attachments, message_thread_state, message_labels,
message_mailbox_settings, `p_broadcast_filter` on group sends).

Apply migrations through **`20260920140000_school_documents.sql`** (and the
`20260919*` chain) on hosted `weeon-school` before production QA.

## Chat encargados

Realtime 1:1 teacher ↔ guardian. Loaders in `lib/dashboard/chat.ts`, UI
`components/messages/chat-workspace.tsx`.

## Chat administración

Same tables/RPCs as ERP **Chat docentes** (`weeon-tenants`). Teachers use
**Escribir a administración** in `chat-workspace.tsx` → RPC
`start_teacher_admin_chat()`. Loaders `lib/dashboard/admin-teacher-chat.ts`,
actions `lib/teachers/admin-teacher-chat-actions.ts`, merged list in
`lib/dashboard/chat.ts`.

## Env

```env
NEXT_PUBLIC_DROPBOX_APP_KEY=
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=
NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID=
```

Same platform credentials as `weeon-tenants`. Add **teachers.weeon.school** to
Dropbox Chooser domains and Google OAuth JS origins / API key referrers before
production deploy on teacher web.

CSP allowlists Dropbox in `next.config.ts`.

## Deferred

- Documents hub (admin-only in tenants for now).
- Realtime inbox for mail threads; mobile two-way reply UX polish.
- Cc in thread list metadata only until mobile consumes cc rows.
