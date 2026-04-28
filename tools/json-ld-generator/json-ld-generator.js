// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

export function parseMetadata(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const block = doc.querySelector('div.metadata');
  if (!block) return {};

  const meta = {};
  const rows = block.querySelectorAll(':scope > div');
  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length < 2) return;
    const name = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (name) meta[name] = value;
  });
  return meta;
}

function pick(meta, ...keys) {
  return keys.map((k) => meta[k]).find(Boolean);
}

export function buildArticleSchema(meta, pageUrl, headlineFallback) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
  };

  const headline = pick(meta, 'title') || headlineFallback;
  if (headline) schema.headline = headline;

  const description = pick(meta, 'description');
  if (description) schema.description = description;

  const image = pick(meta, 'image', 'og:image');
  if (image) schema.image = image;

  if (pageUrl) schema.url = pageUrl;

  const datePublished = pick(meta, 'published-date', 'article:published_time');
  if (datePublished) schema.datePublished = datePublished;

  const dateModified = pick(meta, 'modified-date', 'article:modified_time');
  if (dateModified) schema.dateModified = dateModified;

  const author = pick(meta, 'author');
  if (author) schema.author = { '@type': 'Person', name: author };

  const publisher = pick(meta, 'publisher');
  if (publisher) schema.publisher = { '@type': 'Organization', name: publisher };

  return schema;
}

function getH1(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const h1 = doc.querySelector('h1');
  return h1 ? h1.textContent.trim() : '';
}

function buildSourceUrl(context) {
  const site = context.site || context.repo;
  return `https://admin.da.live/source/${context.org}/${site}${context.path}.html`;
}

function buildPageUrl(context) {
  const site = context.site || context.repo;
  return `https://main--${site}--${context.org}.aem.page${context.path}`;
}

function showError(statusEl, message) {
  statusEl.textContent = message;
  statusEl.classList.add('error');
}

function showFallbackTextarea(container, json) {
  const textarea = document.createElement('textarea');
  textarea.value = json;
  textarea.rows = 10;
  textarea.style.width = '100%';
  textarea.addEventListener('focus', () => textarea.select());
  container.appendChild(textarea);
}

async function init() {
  const statusEl = document.getElementById('status');
  const noteEl = document.getElementById('note');
  const previewEl = document.getElementById('preview');
  const copyBtn = document.getElementById('copy');

  const { context, actions } = await DA_SDK;

  let html;
  try {
    const response = await actions.daFetch(buildSourceUrl(context));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err) {
    showError(statusEl, 'Could not load page source.');
    return;
  }

  const meta = parseMetadata(html);
  if (Object.keys(meta).length === 0) {
    noteEl.textContent = 'No metadata block found — schema may be incomplete.';
    noteEl.hidden = false;
  }

  const pageUrl = buildPageUrl(context);
  const headlineFallback = getH1(html);
  const schema = buildArticleSchema(meta, pageUrl, headlineFallback);
  const json = JSON.stringify(schema, null, 2);

  statusEl.hidden = true;
  previewEl.textContent = json;
  previewEl.hidden = false;
  copyBtn.hidden = false;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(json);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    } catch (err) {
      copyBtn.hidden = true;
      const errMsg = document.createElement('p');
      errMsg.className = 'status error';
      errMsg.textContent = 'Clipboard write blocked. Select the text below and copy manually.';
      previewEl.parentNode.insertBefore(errMsg, previewEl);
      showFallbackTextarea(previewEl.parentNode, json);
    }
  });
}

init().catch(() => {
  const statusEl = document.getElementById('status');
  if (statusEl) showError(statusEl, 'Something went wrong loading the plugin.');
});
