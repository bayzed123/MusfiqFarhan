/**
 * The small markdown subset used by article bodies, shared by the static
 * build and the browser so a page never renders differently in the two.
 *
 * Supports: ## / ### / #### headings, - and * lists, > quotes, **bold**,
 * *italic*, [text](url) links, and paragraphs. Everything is HTML-escaped
 * before any formatting is applied, so author input can never inject markup.
 */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ENTITIES[char]);
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

const HEADING = /^(#{2,6})\s+(.*)$/;
const LIST_ITEM = /^\s*[-*]\s+(.*)$/;
const QUOTE = /^&gt;\s?(.*)$/;

/**
 * Render markdown to HTML.
 *
 * Lines are classified individually rather than per blank-line block: authors
 * routinely write a heading with its paragraph on the very next line, and
 * treating that as one block leaves the "##" visible on the page.
 */
export function renderMarkdown(source) {
  const text = String(source || '').trim();
  if (!text) return '';

  const lines = escapeHtml(text).split('\n');
  const out = [];
  let paragraph = [];
  let list = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join('<br>'))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length, 6);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const listItem = trimmed.match(LIST_ITEM);
    if (listItem) {
      flushParagraph();
      flushQuote();
      list.push(listItem[1].trim());
      continue;
    }

    const quoted = trimmed.match(QUOTE);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushAll();
  return out.join('\n');
}
