// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkGithubAlerts from 'remark-github-alerts';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import { remarkDefinitionList, defListHastHandlers } from 'remark-definition-list';
import remarkSupersub from 'remark-supersub';
import remarkFlexibleMarkers from 'remark-flexible-markers';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';

// SVG icon appended after external link text
const externalLinkIcon = {
  type: 'element',
  tagName: 'svg',
  properties: {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '13',
    height: '13',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    class: 'ext-link-icon',
    ariaHidden: 'true',
  },
  children: [
    { type: 'element', tagName: 'path', properties: { d: 'M15 3h6v6' }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M10 14 21 3' }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }, children: [] },
  ],
};

export default defineConfig({
  site: 'https://preahs.com',
  integrations: [sitemap()],
  markdown: {
    // Exclude 'math' (handled by rehype-katex) and 'mermaid' (rendered client-side)
    // from Shiki so those code blocks stay as plain <code class="language-*"> for
    // their respective renderers to process.
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['math', 'mermaid'],
    },
    // Disable built-in GFM so we can configure singleTilde: false,
    // which prevents ~text~ from being consumed as strikethrough before remark-supersub sees it.
    gfm: false,
    remarkPlugins: [
      [remarkGfm, { singleTilde: false }],
      remarkGithubAlerts,
      remarkMath,
      [remarkEmoji, { accessible: true }],
      remarkDefinitionList,
      remarkSupersub,
      remarkFlexibleMarkers,
    ],
    rehypePlugins: [
      rehypeKatex,
      [rehypeExternalLinks, {
        target: '_blank',
        rel: ['noopener', 'noreferrer'],
        content: externalLinkIcon,
        contentProperties: {},
      }],
    ],
    shikiConfig: {
      theme: 'one-dark-pro',
    },
    remarkRehype: {
      handlers: { ...defListHastHandlers },
    },
  },
});
