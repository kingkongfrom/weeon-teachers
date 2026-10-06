# Comunicación — mensajes + chat (teacher web)

*Teacher ↔ guardians/students. Schema owner: `weeon-tenants`. Families read
messages in `weeon-mobile`.*

## One line

Comunicación has **three** channels on `/comunicacion`:

- **Mensajes** — same mailbox UX as the school ERP (`weeon-tenants`): Para/Cc,
  bulk group picker, rich body, Dropbox + bottom attachment zone, folders,
  favorites, custom labels, signature, optional replies.
- **Chat** — one inbox for **dirección escolar** (school admins), encargados, and
  estudiantes. Two-way realtime on `admin_teacher_chat_*` (teacher ↔ admin) and
  `chat_*` (teacher ↔ roster).

Panel general **Comunicación** → `/comunicacion`. **Novedades** stays in aula
virtual — not part of Comunicación.

### Nav + hub feedback (Oct 2026)

- **Sidebar:** `AppSidebar` shows an unread count on **Comunicación** (inbox +
  guardian/admin chat). Counts come from `loadPanelAttention()` in the app
  layout; `TeacherCommsNavRealtime` debounces `router.refresh()` on mail/chat
  table changes.
- **Hub (`/comunicacion`):** optional `PanelAttentionStrip`, full-width **channel rails**
  (`comunicacion-hub-channels.tsx`), then a **dual-pane preview** — Recibidos |
  Chats activos (`comunicacion-hub-activity.tsx`). Empty when both panes are empty.

## Routes

| Route | Purpose |
| --- | --- |
| `/comunicacion` | Hub — **Email** + **Chat** cards |
| `/comunicacion/mensajes` | Mailbox — default **Recibidos** (`inbox` when `folder` omitted); `?folder=sent\|trash\|favorite`, `?label=<uuid>` |
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
- **Quién leyó:** a message this teacher sent shows **{n} de {total} leyeron**. Each name is **Leyó** or **Sin abrir**. `read_at` is set when that person opens the thread in the app or on the web. The email notice does not count.
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

## Email notice

After `createMessageThread` or `sendThreadMessage` in `lib/teachers/comms-actions.ts`, the server calls `POST {WEEON_APP_ORIGIN}/api/comms/message-notice` with the teacher’s session. The school ERP mails the same short notice it sends for an admin circular (first 180 characters; the thread stays in Mensajes). A mail failure does not block the send. Contract: `weeon-tenants/docs/email-delivery-strategy.md`. **Production verified Oct 2026** (recipient real inbox + `message_email_deliveries`).

## Data model (weeon-tenants)

Same as ERP — see `weeon-tenants/docs/data-access.md` (threads, messages,
thread_recipients, message_attachments, message_thread_state, message_labels,
message_mailbox_settings, `p_broadcast_filter` on group sends).

Apply migrations through **`20260920140000_school_documents.sql`** (and the
`20260919*` chain) on hosted `weeon-school` before production QA.

## Chat

One inbox titled **Chat**. Sidebar: **Nuevo chat** (encargados / estudiantes) and
**Chat con dirección** (`start_teacher_admin_chat` → `admin_teacher_chat_*`).
School admins reply from the ERP **Comunicación → Chat** (`AdminTeacherChatWorkspace`).
Encargados use `chat_*` via `start_chat_conversation`.

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
