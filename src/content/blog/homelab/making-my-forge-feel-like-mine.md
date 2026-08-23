---
title: "Making my code forge feel like mine"
description: "I gave my self-hosted Forgejo instance a coat of paper and rust so it matches the rest of my site, further cementing my little corner online."
date: 2026-08-23T16:36:00
tags: [homelab, self-hosting, forgejo, tech, "2026"]
---

I run my own Git host. It runs at [git.preahs.com](https://git.preahs.com), my GitHub mirrors it, and it runs security scans on my pushes while allowing for a pipeline for CI/CD. For months it has looked like the Default Forgejo, with a splash page telling anonymous visitors it was "building for more than just a product," all that stuff you've probably seen before if you're around people who self-host Git alternatives. Perfectly nice software. Just not *mine*.

Today I fixed that, and it turned out to be a smaller job than I expected.

## The paper and rust

The whole site you're reading is on one palette: a warm paper background, ink-brown text, a rust accent, dashed hand-drawn rules, and a faint dot grid like an old sketchbook page. It's defined in a single `global.css` full of OKLCH variables. I wanted the forge look like my website for cohesion and personalization.

Forgejo turns out to be friendly about this. You drop a `theme-whatever.css` into the custom assets folder, import the built-in light theme so you inherit everything you don't touch, and then override the handful of variables that carry the look. I mapped my `--accent` onto its primary color, my paper values onto the backgrounds, my ink onto the text, and built out a full rust shade ramp. Then a few extra flourishes: dashed borders on the boxes to echo the sketchbook rules, the tan "folder" color painted onto the directory icons in the file browser, headings set in Newsreader to match my display type. Add the theme name to `app.ini`, restart, pick it in settings. Done.

Are the dotted lines too much? Maybe. Send me an email if you think it's just way too ugly. I kind of like it.

## The front door

The other change was even smaller but something that has been bothering me for sure. By default, a logged-out visitor to the root of a Forgejo instance gets that generic marketing splash. I added a line in `app.ini`, `LANDING_PAGE = /preah`, and now anyone who visits the root domain lands on my profile instead. My repos, my face, my corner. Not a product pitch for software I happen to be using, especially because it's really just me using this site.

## Why bother

I could have left it how it was. Nobody's grading my Git, I mean I guess an employer or recruiter or someone like that, but they don't have an eye for this kind of detail.

But I've been thinking a lot lately about owning your area of the internet instead of renting it. Self-hosting is usually framed as being about control or privacy, and sure, it is. What I think motivates me personally, is that it's also about *care* and personalization. When the tool is yours, you get to make it feel like a place rather than a service, or the countless bland startup tech landing pages. The dashed borders don't make my code any better, but they just make me happy to open the tab.
