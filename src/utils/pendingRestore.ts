// Holds the raw text of a backup file the user just picked, for the short hop between
// SettingsScreen (file picker) and BackupPasswordModal (password prompt + decrypt).
// Kept out of navigation route params so a multi-MB backup string is never serialized
// through React Navigation's params.
let pendingRestoreText: string | null = null;

export function setPendingRestoreText(text: string): void {
  pendingRestoreText = text;
}

export function takePendingRestoreText(): string | null {
  const text = pendingRestoreText;
  pendingRestoreText = null;
  return text;
}
