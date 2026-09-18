/** Shared motion tokens for moving a thread to Papelera. */
export const messageTrashExit = {
  opacity: 0,
  x: 72,
  scale: 0.94,
} as const;

export const messageTrashTransition = {
  duration: 0.38,
  ease: [0.32, 0, 0.67, 0] as const,
};

export const messageTrashNoticeMs = 2400;
