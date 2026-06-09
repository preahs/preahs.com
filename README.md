# preahs.com

My personal website. A centralized home for my blog, portfolio, and identity on the web. Built with [Astro](https://astro.build/) and deployed to [Cloudflare Pages](https://pages.cloudflare.com/) via a self-hosted [Forgejo](https://forgejo.org/) instance.

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 |
| Styling | Vanilla CSS |
| Deployment | Cloudflare Pages (Direct Upload via Wrangler) |
| CI/CD | Forgejo Actions + self-hosted runner |
| DNS / CDN | Cloudflare |

## Project Structure

```
preahs.com/
├── .forgejo/
│   └── workflows/
│       └── deploy.yml        # CI/CD pipeline
├── public/                   # Static assets (images, favicons, files)
│   └── files/
│       └── preah_smith_resume.pdf
├── src/
│   ├── components/           # Reusable Astro components
│   ├── content/              # Markdown blog posts, organized by category
│   │   └── blog/
│   │       ├── essays/
│   │       ├── gaming/
│   │       ├── guides/
│   │       ├── homelab/
│   │       ├── notes/
│   │       ├── personal/
│   │       ├── recipes/
│   │       ├── tea/
│   │       ├── tech/
│   │       └── travel/
│   ├── layouts/              # Page and blog post layouts
│   ├── lib/                  # Shared utilities (blog helpers, etc.)
│   ├── pages/                # File-based routing (index, about, blog, portfolio)
│   └── styles/
│       └── global.css
├── astro.config.mjs
└── package.json
```

## Local Development

**Requires Node.js >= 22.12.0**

```bash
npm install
npm run dev       # starts dev server at http://localhost:4321
npm run build     # builds to ./dist
npm run preview   # serves the ./dist build locally
```

## Markdown Features

Blog posts are written in Markdown and support an extended feature set configured in `astro.config.mjs`:

- **Syntax highlighting** — Shiki with the One Dark Pro theme
- **Math** — `remark-math` + `rehype-katex` (KaTeX rendering in the browser)
- **GitHub-style alerts** — `> [!NOTE]`, `> [!WARNING]`, etc. via `remark-github-alerts`
- **Emoji** — `:shortcodes:` via `remark-emoji`
- **Definition lists** — `remark-definition-list`
- **Superscript / subscript** — `remark-supersub` (`^sup^` / `~sub~`)
- **Highlighted marks** — `remark-flexible-markers`
- **External links** — automatically open in a new tab with a small SVG icon appended (`rehype-external-links`)
- **GFM** — standard GitHub Flavored Markdown via `remark-gfm` (with `singleTilde: false` so `~text~` is reserved for subscript instead of strikethrough)

## Deployment

Pushes to `main` trigger the Forgejo Actions workflow at `.forgejo/workflows/deploy.yml`. The runner:

1. Checks out the repo
2. Installs dependencies with `npm ci`
3. Builds the site (`npm run build` → `./dist`)
4. Uploads `./dist` to Cloudflare Pages via `wrangler pages deploy`

Cloudflare serves the static output globally. The source code never touches Cloudflare, only the finished build artifact does.

See the [deployment guide](https://preahs.com/blog/guides/deploying-to-cloudflare-pages-from-a-self-hosted-forgejo-instance) for the full setup walkthrough, including how the Forgejo runner is configured.

## License

[MIT](LICENSE)
