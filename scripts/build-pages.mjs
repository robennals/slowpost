#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES_DIR = join(__dirname, '..', 'pages');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'pages');

// Configure marked to convert relative .md links to .html
marked.use({
  renderer: {
    link({ href, title, text }) {
      // Convert .md links to .html
      if (href && typeof href === 'string' && href.endsWith('.md')) {
        href = href.replace(/\.md$/, '.html');
      }
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    }
  },
  gfm: true,
  breaks: false,
});

// HTML template matching the site's vintage aesthetic
function createHtmlTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Slowpost</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      padding: 0;
      margin: 0;
    }

    html, body {
      max-width: 100vw;
      overflow-x: hidden;
    }

    :root {
      --font-playfair: 'Playfair Display', serif;
      --font-crimson: 'Crimson Text', serif;
      --color-paper: #F5F0E6;
      --color-paper-border: #D9D0C1;
      --color-text-dark: #4A3B30;
      --color-text-medium: #6B5B47;
      --color-wax-seal: #A84437;
      --color-wax-seal-hover: #8B3A2F;
    }

    body {
      color: var(--color-text-dark);
      background: var(--color-paper);
      font-family: var(--font-crimson), serif;
      line-height: 1.6;
      background-image: radial-gradient(circle at 1px 1px, rgba(74, 59, 48, 0.05) 1px, transparent 0);
      background-size: 20px 20px;
      padding: 2rem 1.5rem;
      min-height: 100vh;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--color-paper);
      border-radius: 12px;
      padding: 3rem 2rem;
      background-image: radial-gradient(circle at 1px 1px, rgba(74, 59, 48, 0.03) 1px, transparent 0);
      background-size: 20px 20px;
      box-shadow: 0 2px 8px rgba(74, 59, 48, 0.1);
    }

    .header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--color-paper-border);
    }

    .back-link {
      display: inline-block;
      color: var(--color-wax-seal);
      text-decoration: none;
      font-weight: 600;
      margin-bottom: 1rem;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--color-wax-seal-hover);
    }

    h1 {
      font-family: var(--font-playfair);
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--color-text-dark);
      margin-bottom: 0.5rem;
    }

    h2 {
      font-family: var(--font-playfair);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--color-text-dark);
      margin: 2rem 0 1rem;
    }

    h3 {
      font-family: var(--font-playfair);
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-dark);
      margin: 1.5rem 0 0.75rem;
    }

    p {
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    a {
      color: var(--color-wax-seal);
      text-decoration: none;
      transition: color 0.2s;
    }

    a:hover {
      color: var(--color-wax-seal-hover);
      text-decoration: underline;
    }

    ul, ol {
      margin: 1rem 0 1rem 2rem;
    }

    li {
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    code {
      background: rgba(74, 59, 48, 0.1);
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }

    pre {
      background: rgba(74, 59, 48, 0.05);
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid var(--color-paper-border);
      padding-left: 1.5rem;
      margin: 1rem 0;
      font-style: italic;
      color: var(--color-text-medium);
    }

    hr {
      border: none;
      border-top: 2px solid var(--color-paper-border);
      margin: 2rem 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid var(--color-paper-border);
      text-align: center;
      font-size: 0.95rem;
    }

    .footerLinks {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .footerLink {
      color: var(--color-wax-seal);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .footerLink:hover {
      color: var(--color-wax-seal-hover);
    }

    .footerSeparator {
      color: var(--color-text-medium);
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .container {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.5rem;
      }

      h3 {
        font-size: 1.25rem;
      }

      p, li {
        font-size: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="/" class="back-link">← Back to Slowpost</a>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <div class="footerLinks">
        <a href="/pages/how-it-works.html" class="footerLink">How it works</a>
        <span class="footerSeparator">·</span>
        <a href="/pages/why-slowpost.html" class="footerLink">Why Slowpost?</a>
        <span class="footerSeparator">·</span>
        <a href="/pages/about.html" class="footerLink">About</a>
        <span class="footerSeparator">·</span>
        <a href="/pages/legal.html" class="footerLink">Legal</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function extractTitle(markdownContent) {
  // Try to extract title from first H1 or H2 heading
  const match = markdownContent.match(/^##?\s+(.+)$/m);
  if (match) {
    return match[1];
  }
  return 'Page';
}

function buildPages() {
  console.log('Building pages from markdown...');

  // Create output directory if it doesn't exist
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  // Read all markdown files
  const files = readdirSync(PAGES_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No markdown files found in pages/ directory');
    return;
  }

  let successCount = 0;

  for (const file of files) {
    const inputPath = join(PAGES_DIR, file);
    const outputFilename = basename(file, '.md') + '.html';
    const outputPath = join(OUTPUT_DIR, outputFilename);

    try {
      const markdown = readFileSync(inputPath, 'utf-8');
      const title = extractTitle(markdown);
      const htmlContent = marked.parse(markdown);
      const fullHtml = createHtmlTemplate(title, htmlContent);

      writeFileSync(outputPath, fullHtml, 'utf-8');
      console.log(`✓ Generated ${outputFilename}`);
      successCount++;
    } catch (err) {
      console.error(`✗ Failed to process ${file}:`, err.message);
    }
  }

  console.log(`\nSuccessfully generated ${successCount}/${files.length} pages`);
}

// Run the build
buildPages();
