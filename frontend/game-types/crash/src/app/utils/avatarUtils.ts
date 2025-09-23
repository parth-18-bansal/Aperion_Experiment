/**
 * Returns a specific avatar path from number or string.
 * Falls back to default if avatar is not provided.
 */
export function getAvatarPath(avatar: string | number | null | undefined) {
  if (avatar == null) {
    return 'avatars/default.png';
  }
  const num = avatar.toString().padStart(2, '0');
  return `avatars/av-${num}.png`;
}

/**
 * Returns a random avatar path (0–130).
 */
export function getRandomAvatarPath(): string {
  const random = Math.floor(Math.random() * 100); // 0–99
  const num = random.toString().padStart(2, '0');
  return `avatars/av-${num}.png`;
}