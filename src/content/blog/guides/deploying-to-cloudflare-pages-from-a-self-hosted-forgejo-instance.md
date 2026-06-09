---
title: "Deploying to Cloudflare Pages From A Self-Hosted Forgejo Instance"
description: "How I hooked up a full CI/CD pipeline through Forgejo to deploy to Cloudflare Pages."
date: 2026-06-09
category: guides
toc: true
---

I got fed up with GitHub and their outages lately. And honestly, the direction Microsoft has been taking things hasn't sat right with me for a while. So a bit ago, I set up a Forgejo instance on my homelab and moved my repos over. A bit of the control freak in me. I might mirror my repos on GitHub soon to at least have the presence.

The one thing I hadn't figured out yet was deployments. I'd been relying on GitHub Pages and its tight integration with Actions to rebuild and serve my site on every push. When I moved my posts and life to a personal website, I needed a different pipeline, and I needed it to make my life easier.

Cloudflare Pages has native integrations for GitHub and GitLab, but nothing for Forgejo. What it *does* support is Direct Upload via Wrangler — their CLI tool — which means you can push a build from literally anywhere, including a runner on your own hardware. I'm documenting it here for my own learning, and in case anyone else is interested in it.

For context, I deployed this site built with [Astro](https://astro.build/) to my own domain. The bones of this would apply to any framework with a build step, or even a plain static site.

---

## Relevant Resources

- [Cloudflare Docs — Astro](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Astro Docs](https://docs.astro.build/en/getting-started/)
- [Forgejo Docs — Runner Configuration](https://forgejo.org/docs/next/admin/actions/configuration/)

---

## Prerequisites

- A running Forgejo instance (self-hosted)
- A Cloudflare account with [your domain's DNS already pointed there](https://developers.cloudflare.com/dns/get-started/)
- A machine to run the Forgejo runner. I used an LXC container on my Proxmox node
- Docker installed on that machine
- Some comfort with Node.js if your site has a build step

---

## Step 1: Initialize the Cloudflare Pages project

Before your CI can deploy anything, Cloudflare needs to know the project exists. I couldn't connect a Forgejo repo through the dashboard the way you would with GitHub, so I used the **Direct Upload** path instead.

In the Cloudflare dashboard:

1. Go to **Workers & Pages → Create → Pages → Direct Upload**
2. Name the project — I used `preahs-com`
3. Upload something just to initialize it. A placeholder `index.html` works fine.

You can also do this initial setup from your local machine with Wrangler if you'd rather skip the dashboard, or if your project is flagged as too large to import all at once:

```bash
cd ~/your-repo-path
npm install        # if you haven't already)
npm run build      # generates the ./dist folder
```

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy ./dist --project-name=preahs-com
```

---

## Step 2: Get your Cloudflare credentials

Two values, and you'll want them somewhere safe before the end of this step.

**Account ID** — this shows up in the right sidebar of any domain page in the dashboard, or in the URL when you're inside Workers & Pages.

**API Token** — go to **My Profile → User API Tokens → Create Token**. I started with the *Edit Cloudflare Workers* template and made sure it had:
- Cloudflare Pages: Edit
- Account: Read

Scope it to your account, create it, and copy the token. You will not see it again after you close that page.

---

## Step 3: Store the secrets in Forgejo

In your Forgejo repo, go to **Settings → Actions → Secrets** and add:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

These get injected as environment variables when the workflow runs. They won't appear in any logs, so don't try to echo them out to verify.

---

## Step 4: Get a runner running

This is the part that takes the most time, and it's also the most interesting piece of the whole setup. The runner is what makes Forgejo Actions work at all; it's a process that sits on your hardware, polls Forgejo for jobs, and executes them locally in Docker containers. Cloudflare never sees your source code, it only ever receives the finished build artifact.

### Make sure Actions is enabled

Check your Forgejo `app.ini` for:

```ini
[actions]
ENABLED = true
```

If it's missing, add it and restart Forgejo.

### Install the runner binary

Runner compatibility with Forgejo versions is a consideration. Always check the [releases page](https://code.forgejo.org/forgejo/runner/releases) and cross-reference with your Forgejo version's release notes before downloading.

```bash
wget https://code.forgejo.org/forgejo/runner/releases/download/vX.X.X/forgejo-runner-X.X.X-linux-amd64 -O forgejo-runner
chmod +x forgejo-runner
sudo mv forgejo-runner /usr/local/bin/forgejo-runner
```

### Register the runner

In your Forgejo repo: **Settings → Actions → Runners → Create new runner**. You get a **UUID** and a **Token**.

Generate the config and edit it:

```bash
forgejo-runner generate-config > /etc/forgejo-runner/config.yml
nano /etc/forgejo-runner/config.yml
```

Fill in the `server` section:

```yaml
server:
  connections:
    preahs-com:
      url: https://git.yourdomain.com/
      uuid: YOUR-UUID-HERE
      token: YOUR-TOKEN-HERE
```

Then set up your runner labels. If the label on your runner doesn't match what the workflow asks for in `runs-on:`, jobs just sit in a `Waiting for a runner` state forever with no error. Make sure they match:

```yaml
runner:
  labels:
    - ubuntu-latest:docker://node:20-bullseye
```

Before doing anything else, test it manually:

```bash
forgejo-runner --config /etc/forgejo-runner/config.yml daemon
```

Watch for it to show up as online in **Settings → Actions → Runners**. Once it's idle in the dashboard, the connection is solid.

### Wire it up as a systemd service

Once it was working manually, I set it up as a service so it'd survive reboots:

```bash
sudo nano /etc/systemd/system/forgejo-runner.service
```

```ini
[Unit]
Description=Forgejo Runner
After=network.target docker.service
Requires=docker.service

[Service]
ExecStart=/usr/local/bin/forgejo-runner --config /etc/forgejo-runner/config.yml daemon
WorkingDirectory=/etc/forgejo-runner
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now forgejo-runner
```

---

## Step 5: The workflow file

Create `.forgejo/workflows/deploy.yml` in your repo. Here's what mine looks like for an Astro site:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24.4.1'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and deploy
        run: |
          npm run build
          npx wrangler pages deploy ./dist \
            --project-name=preahs-com \
            --branch=main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

A couple of notes from my own experience:

- I pinned Node to `24.4.1` (LTS) rather than `latest`. Newer releases sometimes have rough edges with the npm ecosystem until packages catch up, and I didn't want deploy failures from something unrelated to my actual code. In general, do the latest version that succeeds doing a build locally, and that should build fine when deployed to Cloudflare Pages.
- If you have a plain HTML site with no build step, drop the install/build steps and swap `./dist` for `.`.
- If your framework outputs somewhere other than `dist`, check your config file — Astro uses `outDir` in `astro.config.mjs`.

---

## How it all actually flows

Once this is all together, the sequence looks like this:

```
git push to main
    → Forgejo receives the push
    → Forgejo Actions queues a job
    → Runner picks it up
    → Runner spins up a Docker container
    → npm install + npm run build runs inside the container
    → Wrangler uploads ./dist to Cloudflare
    → Cloudflare serves site globally
```

Cloudflare receives a zip of your built output. It never touches your source, never talks to your Forgejo instance. Everything that matters, the cloning, the building, the uploading, happens on hardware I control.

---

## Step 6: Point your domain at it

After a successful deployment, go to **Workers & Pages → your project → Custom Domains** and add your domain. Since my DNS is already on Cloudflare, it created the records automatically and provisioned an SSL cert within a few minutes. Couldn't have been easier.

---

## Reflections

The whole thing took me an afternoon, and most of that time was sorting out the runner. Getting the right version, figuring out the config format, understanding how it all wires together. Once the runner was registered and healthy, the rest fell into place pretty quickly.

There's something satisfying about pushing a commit and watching a pipeline run on my own server, in my own LXC, on hardware I own. I don't miss the GitHub dependency at all. The setup is more involved than connecting a repo through a UI, but I actually understand every piece of it now, which wasn't true before.

I'm planning to keep building the site out with more Astro features. The pipeline will handle it all the same way.
