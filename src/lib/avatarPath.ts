/**
 * Own-folder guard for avatar deletes (#516). Import-free so node:test can run it.
 *
 * The avatars storage policies (hardening 5) only allow a signed-in user to
 * touch `avatars/<their auth id>/...`. Anything else (legacy member-id
 * folders, another user's folder, odd URLs) is skipped instead of being sent
 * to storage, where it would be refused without an error.
 */
export function isOwnAvatarPath(path: string, authUserId: string): boolean {
  if (!authUserId || /[^A-Za-z0-9-]/.test(authUserId)) return false;
  if (!path) return false;
  const prefix = `avatars/${authUserId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  if (!rest || rest.includes("/") || rest.includes("\\") || rest.includes("..")) return false;
  return true;
}
