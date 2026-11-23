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

  const escaped = escapeHtml(markdown.trim());
  const rawParagraphs = escaped.split(/\n{2,}/);

  const formattedParagraphs = rawParagraphs.map((para) => {
    let text = para.trim();

    const lines = text.split('\n');
    const isBulletList = lines.length > 0 && lines.every((l) => /^(\s*[-*•]\s+)/.test(l.trim()));

    if (isBulletList) {
      const items = lines.map((line) => {
        let itemText = line.trim().replace(/^[-*•]\s+/, '');
        itemText = itemText.replace(
          /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 font-semibold underline">$1</a>'
        );
        itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
        itemText = itemText.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-800">$1</em>');
        return `<li class="mb-1 leading-relaxed">${itemText}</li>`;
      });
      return `<ul class="list-disc pl-5 my-3 space-y-1 text-slate-800 font-sans">${items.join('')}</ul>`;
    }

    text = text.replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 font-semibold underline">$1</a>'
    );
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-800">$1</em>');
    text = text.replace(/\n/g, '<br />');

    return `<p class="mb-3 leading-relaxed text-slate-800 font-sans">${text}</p>`;
  });

  return formattedParagraphs.join('\n');
}