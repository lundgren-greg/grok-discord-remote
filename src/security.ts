/**
 * src/security.ts — allowlist and DM-only enforcement
 */

/** Returns true if the Discord user id is in the allowlist. */
export function isAllowed(userId: string, allowFrom: string[]): boolean {
  return allowFrom.includes(userId);
}

/**
 * Returns true if this is a Direct Message channel type.
 * Discord.js ChannelType.DM = 1
 */
export function isDM(channelType: number): boolean {
  return channelType === 1;
}

/**
 * Redact a Discord bot token for safe logging.
 * Keeps the first 8 chars, masks the rest.
 */
export function redactToken(token: string): string {
  if (token.length <= 8) return "***";
  return token.slice(0, 8) + "***";
}
