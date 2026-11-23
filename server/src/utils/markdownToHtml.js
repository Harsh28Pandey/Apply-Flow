/**
 * Converts markdown text to safe HTML:
 * 1. Escape all HTML characters first (prevent XSS)
 * 2. Allow only **bold** and [text](https://...) links
 * 3. Support bullet points (- item or • item)
 * 4. Double newlines -> paragraphs
 * 5. Single newlines -> <br />
 */

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function markdownToSafeHtml(markdown) {
  if (!markdown) return '';

  // Escape all HTML to strictly prevent XSS
  const escaped = escapeHtml(markdown.trim());

  // Split into paragraphs by double newlines
  const rawParagraphs = escaped.split(/\n{2,}/);

  const formattedParagraphs = rawParagraphs.map(para => {
    let text = para.trim();

    // Check if paragraph is a bullet list (lines starting with - , * , or • )
    const lines = text.split('\n');
    const isBulletList = lines.length > 0 && lines.every(l => /^(\s*[-*•]\s+)/.test(l.trim()));

    if (isBulletList) {
      const items = lines.map(line => {
        let itemText = line.trim().replace(/^[-*•]\s+/, '');
        itemText = itemText.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #EA580C; text-decoration: underline; font-weight: 600;">$1</a>');
        itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return `<li style="margin-bottom: 6px; line-height: 1.6;">${itemText}</li>`;
      });
      return `<ul style="margin: 0 0 16px 20px; padding: 0; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px;">${items.join('')}</ul>`;
    }

    // Replace [text](https://...) links with brand orange
    text = text.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #EA580C; text-decoration: underline; font-weight: 600;">$1</a>');

    // Replace **bold**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Single newlines become <br />
    text = text.replace(/\n/g, '<br />');

    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px;">${text}</p>`;
  });

  return formattedParagraphs.join('\n');
}

/**
 * Produces plain text representation where links render as "text (url)"
 * and bold markdown delimiters are stripped.
 */
export function markdownToPlainText(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}
