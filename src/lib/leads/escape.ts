/** Escape text for HTML email bodies. */
export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escape text for Telegram MarkdownV2. */
export function escapeMarkdownV2(input: string): string {
  return input.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
