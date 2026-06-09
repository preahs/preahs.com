---
title: "(Guide) Intro To Social Blogging"
description: "A general guide to getting started blogging for the purpose of creating a social network, AKA Blog Feeds."
date: 2025-10-07
category: guides
toc: true
---

## Introduction

Social networks have rapidly become so vital to many people's lives on the internet. People want to see what their friends are doing, where they are, and photos of what they're doing. They also want to share these same things with their friends, all without having to go through the manual and sometimes awkward process of messaging them directly and saying "Hey, how're you doing?"

Developers and companies have complied with this desire for instant connection. We see the launch of **Friendster** in 2002, **MySpace** and a job-centered one we all know, **LinkedIn**, in 2003. Famously, **Facebook** in 2004, **YouTube** in 2005, **Twitter (now X)** in 2006. Followed by **Instagram**, **Snapchat**, **Google+** (RIP), **TikTok**, and **Discord**.

People were extremely excited about this. We are more connected than ever. But we are losing in several ways. These companies that own these platforms want to make maximum profit, leading them to offer subscription-based services in some cases, or more distressing, sell their users' data to advertisers. They use algorithms to serve cherry-picked content that creates dangerous echo-chambers, and instill the need for users to remain on their device for sometimes hours just to see what's new, exacerbating feelings of FOMO and wasting precious time.

Facebook has been found to conduct experiments on its users to fuel rage and misinformation for the purpose of engagement.[^1] [^2] When did socializing online with friends and family become arguing with strangers, spreading misinformation, and experiencing panic attacks because of the constant feed of political and social unrest?

I don't expect anyone to drop their social media. Plenty of people use it in healthy ways. We even have decentralized social media, such as the [fediverse](https://jointhefediverse.net) (think Mastodon) and the [AT Protocol](https://atproto.com/guides/faq) (think Bluesky) to reduce the problem of one person or company owning everything. I think this helps, and seeing a feed of your friends' short thoughts or posts occasionally is nice if you're not endlessly scrolling. I also think it's vital to many people to be able to explore recommendations frequently to get out of their bubble and experience variety.

## Blog Feeds

There is another option, one I am personally more fond of. It can sit nicely alongside your existing social media or replace it. It serves a different purpose than something like Twitter (X) or Instagram. It's meant to be a slower, more nuanced form of socializing and communicating, inspired by the pre-social media era, or at least the early one.

For the purposes of this guide, I will refer to this as "Blog Feeds." A little intro in one page can be explained by [blogfeeds.net](https://blogfeeds.net/),[^3] which includes an aggregation of blogs to follow, essentially creating a network of people similar to a webring.[^4] This will help you explore new blogs you find interesting and create a tighter group. Another gem is [ooh.directory](https://ooh.directory/), which sorts blogs by category and interest, allows you to flip through random blogs, and visit the most recently-updated blogs for ideas of who to follow.

Basically, a blog feed involves making a personal blog, which can have literally whatever you want on it, and following other people. The "following" aspect can be done through RSS (most common), or email newsletter if their site supports it. If the blog is part of the AT Protocol, you may be able to follow it using a Bluesky account. More about that later.

## Making a blog

Making a blog sounds scary and technical, but it doesn't have to be. If you know web development or want to learn, you can customize a site to be [whatever](https://melonking.net/) [your](https://badgraph1csghost.neocities.org/) [heart](https://chronodove.neocities.org/) desires. If you're not into that, there are many services that make it incredibly easy to get going. You can post about your day, about traveling, about gaming, theme it a specific way, or post short thoughts on nothing much at all if you want.

_All I ask is that you do this because you want to, not solely because you might make a profit off of your audience. Also, please reconsider using AI to write posts if you are thinking of doing that! It's fully up to you, but in my opinion, why should I read something no one bothered to write?_

**Hosted Services:**
- [Bear Blog:](https://bearblog.dev/) In the creator's own words, "A privacy-first, no-nonsense, super-fast blogging platform." Sign up, select a pre-made theme if you want and modify it to your liking, make post templates, and connect a custom domain if desired. Comes with ready-to-go RSS, and pretty popular among bloggers currently. This site runs on it.

- [Pika:](https://pika.page/) "An editor that makes you want to write, designed to get out of your way and perfectly match what readers will see." With Pika you can sign up, choose a theme, customize without code, write posts in a clean editor, export your content, and connect your own domain, with a focus on privacy and design. You can start for free (up to ~50 posts) and upgrade later if you want unlimited posts, newsletter subscribers, analytics, etc.

- [Substack:](https://substack.com/home) You might have seen this around before, it's quite popular. It's a platform built for people to publish posts and sometimes make money doing it. You can start a newsletter or blog, choose what's free and what's paid, send posts (and even podcasts or video) to subscribers' inboxes, build a community, and access basic analytics. It's simple and user-friendly, with a 10% fee if you monetize. This may not be the most loved option by other small bloggers due to its association with newsletter-signup popups and making a profit. It is also the [most similar to other social media among blogging options](https://post.substack.com/p/substack-is-a-social-media-app).

- [Ghost:](https://ghost.org/) An open-source platform focused on publishing and monetization. Ghost provides an editor (with live previews, Markdown + embeds, and an admin UI), built-in SEO, newsletter tools, membership & subscription support, custom themes, and control over your domain and data. You can self-host (free, for full flexibility) or use their managed Ghost(Pro) hosting, and benefit from faster performance, email delivery, and extensible APIs.

- [Wordpress:](https://wordpress.com/) The world's most popular website and blogging platform, [powering over 40% of the web.](https://wordpress.com/blog/2025/04/17/wordpress-market-share/#:~:text=Quick%20facts,a%20CMS) WordPress lets you create a simple blog or a business site using free and premium themes and plugins. You can host it yourself with full control, or use their hosted service (WordPress.com) for convenience. It supports custom domains, rich media, SEO tools, and extensibility through code or plugins.

- [Squarespace:](https://www.squarespace.com/) You might have heard of this on your favorite YouTuber's channel during a sponsorship (you don't sit through those, do you?). It is a platform for building websites, blogs, and online stores with no coding required. Squarespace offers templates, a drag-and-drop editor, built-in SEO, analytics, and e-commerce tools under a subscription. You can connect a custom domain, publish blog posts, and manage newsletters.

**Self-hosted, if you're more technical:**
- [Astro:](https://astro.build/) A modern web framework built for speed, content, and flexibility. Astro lets you build blogs, portfolios, and full sites using any UI framework, or none at all, with zero JavaScript by default.[^5] It supports Markdown, MDX, and server-side rendering, plus integrations for CMSs, themes, and deployment platforms.

- [Hugo:](https://gohugo.io/) An open-source static site generator built for efficiency and flexibility. It lets you create blogs and websites using Markdown, shortcodes, and templates. It supports themes, taxonomies, custom content types, and control over site structure without needing a database.

- [Zola:](https://www.getzola.org/) Another open-source static site generator. Zola uses Markdown for content, Tera templates for layouts, and comes with built-in features like taxonomies, RSS feeds, and syntax highlighting. It requires no database, and is easy to configure.

- [11ty:](https://www.11ty.dev/) Pronounced Eleventy. A flexible static site generator that lets you build content-focused websites using plain HTML, Markdown, or templating languages like Nunjucks, Liquid, and others. 11ty requires no database, supports custom data structures, and gives full control over your site's output.

- [Jekyll:](https://jekyllrb.com/) A popular static site generator that transforms plain text into self-hosted websites and blogs. Jekyll uses Markdown, Liquid templates, and simple configuration to generate content without a database. It supports themes, plugins, and custom layouts, and integrates seamlessly with GitHub Pages for free hosting.

**Honorable mention:**
- [Neocities:](https://neocities.org/) This is a modern continuation of [Geocities](https://en.wikipedia.org/wiki/GeoCities), mainly focused on hand-coding HTML and CSS to create a custom site from scratch. Not ideal for blogging, but cool for showcasing a site and learning web development. It's free and open-source, and you can choose to pay for custom domains and more bandwidth, with no ads or data selling.

Wow, that's a lot of options! Don't get overwhelmed. Here are the basics for a simple site like Bear Blog or a static site generator.

You write a post. This post tends to be in Markdown, which is a markup language (like HTML) for creating formatted text. It's actually not too far from something like Microsoft Word. In this case, if you want a header, you can put a pound symbol `#` in front of your header text to tell your site that it should be formatted as one. Same with quotation blocks, bolding, italics and all that. Here is a simple [Markdown cheatsheet provided by Bear Blog.](https://herman.bearblog.dev/markdown-cheatsheet/) Some other blogging platforms have even more options for formatting, like informational or warning boxes.

![Examples of using Markdown](/images/markdownexamples.png)

After you've written it, you can usually preview it before posting. While you're writing, you might want to use a [live-preview](https://markdownlivepreview.com/) to make sure you're formatting it how you intend. After posting, people can go read your post and possibly interact with it in some ways if you want that.

### AT Protocol Blogging

I'm not going to attempt to describe AT Protocol when [there is another post](https://overreacted.io/open-social/) that does an excellent job. But what I am going to mention, briefly, is using this protocol to follow blogs via Bluesky or another AT Protocol handle. Using something like [leaflet.pub](https://leaflet.pub/discover), you can create a blog on there, and follow other similar blogs. Here is an [example of a blog on leaflet](https://lab.leaflet.pub/), and if you have Bluesky, go ahead and test subscribing using it. They also support comments and RSS.

## RSS

You don't have to memorize what RSS stands for (Really Simple Syndication, if you're curious). This is basically how you create a feed, like a Twitter (X) timeline or a Facebook homepage. When you subscribe to someone's blog,[^6] you can get a simple, consolidated aggregation of new posts. At this point, RSS is pretty old but still works exactly as intended, and most sites have RSS feeds.

What you need to start is a newsreader app. There are a lot of options, so it depends on what you value most. When you subscribe to a website, you put that into your newsreader app, and it fetches the content and displays it for you, among other neat features. Usually they include nice themes, no ads to bother you, and folder or tag organization. You may have to find a site's feed and copy the link, like `https://blog.preahs.com/feed/`, or your reader app may be able to find it automatically from a browser shortcut or from pasting in the normal link for the website. To learn more about adding a new subscription, see my [feeds page](https://blog.preahs.com/feeds/).

Here are some suggestions. Feel free to explore multiple and see what sticks:

- [Feedly:](https://feedly.com/) A cloud-based, freemium RSS aggregator with apps and a browser interface. You can use a free account that supports a limited number of sources (about 100 feeds) and basic folders, but many advanced features—such as hiding ads, notes/highlights, power search, integration with Evernote/Pocket, and "Leo" AI filtering—require paid tiers. It supports iOS, Android, and web (desktop browsers). Feedly is not open source, it is a commercial service.

- [Inoreader:](https://www.inoreader.com/) Also a freemium service, available via web and on iOS and Android, with synchronization of your reading across devices. The free plan includes many of the core features (RSS subscription, folders, basic filtering), while more powerful features (such as advanced rules, full-text search, premium support, more feed limits) are gated behind paid tiers. Inoreader is not open source, it is a proprietary service with a freemium model.

- [NetNewsWire:](https://netnewswire.com/) A native, free, and open-source RSS reader for Apple platforms (macOS, iPhone, iPad). It offers a clean, native experience and tracks your read/unread status locally or via syncing. Because it's open source (MIT-licensed), you can inspect or contribute to its code. Its main limitation is platform since it's focused on Apple devices. It's also not very visually flashy, if you care about that.

- [feeeed (with four Es)](https://feeeed.nateparrott.com/): An iOS/iPadOS (and recent macOS) app that emphasizes a private, on-device reading experience without requiring servers or accounts. It is free (no ads or in-app purchases) and supports RSS subscriptions, YouTube, Reddit, and other sources, plus some AI summarization. Because it is designed to run entirely on device, there is no paid subscription for backend features, and it is private by design. It is not open-source. One personal note from me, I use this as my daily driver, and it has some minor bugs you may notice. It's developed by one person, so it happens.

- [Reeder:](https://reederapp.com/) A client app (primarily for Apple platforms: iOS, iPadOS, macOS) that fetches feed data from external services, such as Feedly, Inoreader, or local RSS sources. The new Reeder version supports unified timeline, filters, and media integration. It is not itself a feed-hosting service but a front end; thus, many of its features (such as sync or advanced filtering) depend on which backend you use. It uses iCloud to sync subscription and timeline state between devices. Reeder is proprietary (closed source) and uses a paid model or in-app purchases for more advanced versions.

- [Unread:](https://www.goldenhillsoftware.com/unread/) Another client app for Apple platforms with a focus on elegant reading. It relies on external feed services for syncing (you provide your own RSS or use a service like Feedly). Because Unread is a reader app, its features are more about presentation and gesture support; many of the syncing, feed limits, or premium capabilities depend on your chosen backend service. I would say Unread is my favorite so far, as it offers a lot for being free, has great syncing, tag organization, and a pleasing interface. It also fetches entire website content to get around certain limitations with some websites' feeds, allowing you to read everything in the app without visiting the website directly.

- [FreshRSS:](https://freshrss.org/index.html) A self-hostable, open-source RSS/Atom aggregator that you run on your own server (like via Docker) and which supports reading through its own web interface or via third-party client apps. It allows full control over feed limits, filtering, theming, extensions, and it can generate feeds by scraping or filtering content. Because it is open source, there is no paid tier in the software itself (though you may incur hosting costs). Many client apps can connect to a FreshRSS instance for mobile or desktop reading. If you're interested in something interesting you can do with its API, check out [Steve's post about automating feeds with FreshRSS.](https://stevedylandev.bearblog.dev/automating-feeds-with-freshrss/)

[Click this for a more detailed breakdown of available RSS newsreaders.](https://lighthouseapp.io/blog/feed-reader-deep-dive)

[Additional resource on RSS and Feeds.](https://aboutfeeds.com/)

## Connecting everything together

Okay, soooo... I have a blog, I have RSS stuff, now what do I subscribe to, and how do I make this social? I'll let blogfeeds.net describe this:

>This takes us to our final point: Feeds. You can probably get away with just the first two items and then sharing it with people you already know, but what about meeting or talking to people you don't know? That's where Feeds come in. The idea is to create another page on your blog that has all the RSS feeds you're subscribed to. By keeping this public and always up to date, someone can visit your page, find someone new and follow them. Perhaps that person also has a feeds page, and the cycle continues until there is a natural and organic network of people all sharing with each other. So if you have a blog, consider making a feeds page and sharing it! If your RSS reader supports OPML file exports and imports, perhaps you can share that file as well to make it easier to share your feeds.

Steve has an [example of a feeds page](https://bearblog.stevedylan.dev/feeds/), and blogfeeds.net has an [aggregation of known blogs using feeds pages](https://blogfeeds.net/feeds), to create a centralized place to follow blogs who have this same mindset. Once you make a feeds page, you can submit it to the site to get added to it. Then people can find your blog!

## Interaction

There is debate on the best method for interaction with others via blogs. You have a few options.

- **Email:** Share an email people can contact you at, and when someone has something to say, they can email you about it. This allows for intential, nuanced discussion. Here is a template I use at the end of every post to facilitate this [(totally stolen from Steve, again)](https://stevedylandev.bearblog.dev/captains-log-1759799708/):

```html
<div class="reply-button-container">
  <a class="reply-button" href="mailto:preah@preahs.com?subject=Re:%20{{ post_title }}">Reply via email</a>
</div>
```

And the accompanying CSS,[^7] which Bear Blog lets you edit:

```css
.reply-button-container {
    margin-top: 30px;
}

.reply-button {
    display: inline-block;
    font-family: var(--font-main);
    font-size: 1em;
    color: #fff;
    background-color: var(--main-color);
    text-decoration: none;
    border: 2px solid var(--main-color);
    padding: 6px 14px;
    border-radius: 4px;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.reply-button:hover {
    background-color: #cc0000;
    border-color: #cc0000;
}
```

For each post, it updates automatically to whatever the post title is. That way, someone can click the button and open their mail client already ready to go with a subject line pertaining to the post they want to talk about.

Change the values `background-color:` and `border-color:` to whatever colors you want to match your site! See the bottom of this post to see what it looks like. Next:

- **Comments:** Comments are a tricky one. It's looked down on by some because of their lack of nuance and moderation stress, which is why Bear Blog doesn't natively have them. There are various ways to do comments, and it _heavily_ depends on what blogging platform you choose, so here is [Bear Blog's stance on it and some recommendations for setting up comments if you want](https://docs.bearblog.dev/comments/).

- **Guestbooks:** This is an old form of website interaction that dates back to at least [Geocities](https://en.wikipedia.org/wiki/GeoCities). The concept is that visitors to your site can leave a quick thought, their name, and optionally their own website to let you know they visited. You can see [an example on my website](https://blog.preahs.com/guestbook/), and my recommended service for a free guestbook is [Guestbooks](https://guestbooks.meadowing.club/). You can choose a default theme and edit it if you want to match the rest of your site, implement spam protection, and access a dashboard for managing and deleting comments if needed.

## Extras

Here are some ideas to get you started and inspired:

- Add new pages, like a link to your other social media or music listening platforms, or a page dedicated to your pet.

- Email a random person on a blog to give your thoughts on a post of theirs or simply tell them their site is cool. Create an email just for this and for your website for privacy and separation, if desired.

- Add a Now page. It's a section specifically to tell others what you are focused on at this point of your life. Read more about it at [nownownow.com](https://nownownow.com/about). [See an example on Clint McMahon's blog](https://clintmcmahon.com/now).
>A /now page shares what you'd tell a friend you hadn't seen in a year.

- Write a post about a cool rock you found in your yard, or something similarly asinine. Revel in the lack of effort. Or,

- Make a post containing 1-3 sentences only.

- Join a [webring](https://wiki.melonland.net/webring).

- Make a page called Reviews, to review movies, books, TV shows, games, kitchen appliances, etc.

- Check out some [Bear Blog resources](https://departure.blog/bearblog-resources/) for ideas on how to further customize your blog, and [Bear Blog plugins](https://github.com/HermanMartinus/bear-plugins) (not fully tested or official).

That's all from me for now. [Subscribe to my RSS feed](https://blog.preahs.com/feed/), email me using the button at the bottom to tell me this post sucks, or that it's great, or if you have something to suggest to edit it, and **bring back a better web.**

[^1]: **Washington Post** – *Five points for anger, one for a 'like': How Facebook's formula fostered rage and misinformation.* [Link](https://www.washingtonpost.com/technology/2021/10/26/facebook-angry-emoji-algorithm/). • [Unpaywalled](http://archive.today/vULTo).

[^2]: **The Guardian** – *Facebook reveals news feed experiment to control emotions.* [Link](https://www.theguardian.com/technology/2014/jun/29/facebook-users-emotions-news-feeds).

[^3]: This website was created by Steve, who has their own [Bear Blog](https://stevedylandev.bearblog.dev/). Read [Resurrect the Old Web](https://stevedylandev.bearblog.dev/resurrect-the-old-web/), which inspired this post.

[^4]: A webring is a collection of websites linked together in a circular structure, organized around a specific theme. Each site has navigation links to the next and previous members, forming a ring. A central site usually lists all members to prevent breaking the ring if someone's site goes offline.

[^5]: Take a look at this [Reddit discussion on why less JavaScript can be better](https://www.reddit.com/r/webdev/comments/mfnxnj/why_your_website_should_work_without_javascript/).

[^6]: Or news site, podcast, or supported social media platform like Bluesky, and even subreddits.

[^7]: If you don't know what HTML and CSS is, basically, the first snippet of code I shared is HTML, used for the basic text and formatting of a website; CSS is used to apply fancy styles and color, among other things.
