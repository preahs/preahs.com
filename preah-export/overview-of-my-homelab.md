---
title: Overview of My Homelab
slug: overview-of-my-homelab
published_date: 2026-04-09T17:41:00+00:00
tags: homelab, selfhosting, tech
publish: true
make_discoverable: true
is_page: false
meta_description: I go over where my homelab and self-hosting services are now.
meta_image: https://preahs.com/assets/images/meta-image.png
---

I've had a homelab for quite some time now, although it hasn't been a linear process. I first got into it when I heard about Plex, which at first, I was under the impression of it being a free streaming service with *everything.*

I set it up with the installer on my computer and was frustrated and confused to learn that it
1. Wouldn't work unless my PC stayed on,
2. Didn't really have ad-free subscription-free streaming. Apparently you had to acquire the content yourself.

I gave up on it for who knows how long. Then, I heard about Jellyfin, which is an open-source version that a lot of people seemed to like. I wanted to learn more. I set up Jellyfin on my computer and loaded some movies onto it, then streamed them from the same PC hosting it. *Okay,* I thought. *So it provides a video player basically. Big deal. I have no idea how to access it from other devices or anything interesting.* So again I gave up.

It wasn't until me and my brother went halfsies on a Synology NAS on **June 14, 2024**[^1] and I had a few years of university and self-tinkering knowledge under my belt that I truly got into homelabbing and self-hosting. At that point, I knew full well what a server and client was, and all about networking.[^2] I set up the Synology NAS, at the time living with my parents, and installed both the 8TB HDD that I had bought for my items, and the 16TB HDD that my brother bought for his.[^3]

I used it as a network-attached storage, as intended at first. Backups and all that. However, I really wanted to get into hosting *services*. I had been following technical blogs at that point as well as [r/selfhosted](https://www.reddit.com/r/selfhosted/) and really wanted to sink my teeth into it.

The Synology NAS has limited resources, being mainly for storage. That didn't stop me from hosting some basic items. I started with Plex, then moved on to Jellyfin. I hosted both at the same time so that if Jellyfin didn't work, I could just use Plex. To this day I use Infuse on my Apple TV and other devices and have it hooked up to my Jellyfin server. Next, I tried Mealie, then switched to Tandoor, since I love to cook and bake at home. I also set up Actual Budget, which is probably one of my top-used services now. It completely changed the way I handle my money.

Eventually, I went in on a used Dell PowerEdge R730, which is a 2U rack-mounted enterprise server designed for data center and business-critical workloads. For me, it's a great noise-making machine that has lots of upgrade potential! Here is the boring technical details:

- 8 Bay 2.5" SFF
- H730 Raid Adapter
- Dual Xeon Processors
- Dual 750W PSU
- Total PCI Express X8 Slots: 3
- Optical Drive Type: DVD Player
- Number of Processor Cores: 16
- Total PCI Express X16 Slots: 1
- Memory Type: DDR4
- Memory Frequencies Supported: 1333, 1600, 1866, 2133
- Total USB Ports: 4
- Processor Series: Intel Xeon E5
- Total Serial Ports: 1
- Server CPU Model: E5-2667 v4
- Maximum # of Hard Drives: 8
- Total Memory Slots Available: 24
- Server Series: PowerEdge R730
- LAN Compatibility: 10/100/1000 Gigabit
- Maximum Hard Drive Size Supported (GB): 43200
- CPU Socket: Dual LGA 2011
- Front USB 2.0 Ports: 2
- Total Hot-Swap Bays: 8
- Total RAM (GB): 16
- Maximum Memory Supported (GB): 768

A year into using it, and it does exactly what I need it to do every time, no questions asked. Over time, I connected it to an APC UPS to protect it from power outages, and hooked up a used Dell Optiplex I had sitting around to the same UPS.

I used to call the Optiplex my "Minecraft Machine," because all it did was run Minecraft servers (and worked excellently). At this point, I've moved all my servers to the PowerEdge, managed by the service CraftyController for easy setup and server start-and-stop. The Optiplex now serves as a remote desktop solution, since my lab is at my parents',[^4] allowing me to access the network easily. I also use Tailscale to access several services remotely without fully exposing them. When I want to expose a service normally, I use free [cloudflare tunnels](https://developers.cloudflare.com/tunnel/).

For my hypervisor, I have Proxmox installed on the PowerEdge, and all of my services run in their own LXC containers. In the future, I hope to migrate most services to a more energy-efficient and compact mini computer running Ubuntu or Debian Server and managed with Docker instead. For now, Proxmox is very powerful and intuitive, and made it incredibly easy for me to set up snapshots and backups as well as monitor resource usage.

Finally, here is a list of my services:

| Service | Category | Description |
|---|---|---|
| [thelounge](https://thelounge.chat/) | Social | Web-based IRC client — stays connected 24/7 and logs your channels |
| [immich](https://immich.app/) | Media | Google Photos alternative for self-hosted photo and video backup with ML face/object recognition |
| [cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) | Infra | Cloudflare Tunnel daemon — exposes local services to the internet without opening firewall ports |
| [karakeep](https://karakeep.app/) | Productivity | Bookmark and read-later manager with tagging, full-text search, and article archiving |
| [paperless-ngx](https://docs.paperless-ngx.com/) | Docs | Document management system — scans, OCRs, and indexes physical and digital documents |
| [homepage](https://github.com/gethomepage/homepage) | Infra | Customizable self-hosted start page aggregating all your services with live status widgets |
| [freshrss](https://freshrss.org/index.html) | Productivity | RSS/Atom feed aggregator — self-hosted Google Reader replacement with mobile sync support |
| [actual](https://actualbudget.org/) | Finance | Local-first personal budgeting app with envelope-style budgeting and transaction import |
| [tandoor](https://tandoor.dev/) | Productivity | Recipe manager and meal planner with ingredient scaling, shopping lists, and nutrition tracking |
| [plex](https://plex.tv) | Media | Media server for streaming your personal movie, TV, and music library to any device |
| [audiobookshelf](https://www.audiobookshelf.org/) | Media | Self-hosted audiobook and podcast server with progress sync across devices |
| [joplin-server](https://joplinapp.org/) | Productivity | Sync server for Joplin, the open-source encrypted note-taking app |
| [seerr](https://docs.seerr.dev/) | Media | Media request frontend for Plex — lets users request new content |
| arr-stack | Media | Collection of *arr apps (Sonarr, Radarr, etc.) for automating media library management |
| [crafty-controller](https://craftycontrol.com/) | Infra | Web-based Minecraft server manager for creating and monitoring game server instances |
| [lubelogger](https://lubelogger.com/) | Productivity | Vehicle maintenance and fuel log tracker — records service history, mileage, and costs |
| [glance](https://github.com/glanceapp/glance) | Infra | Lightweight dashboard for aggregating feeds, bookmarks, and service status at a glance |

It's quite easy to get started yourself making a homelab or self-hosting services. Buying a VPS can make it even easier, like Hostinger's one-click deployment options. You can also simply install Linux with docker containers on an old laptop or other computer you don't use anymore. I know it's been more than worth it for me. Check out [r/selfhosted](https://www.reddit.com/r/selfhosted/), [self.hst](https://selfh.st/) newsletter, and YouTube if you want to learn more about selfhosting.
___
<div class="reply-button-container">
  <a class="reply-button" href="mailto:preah@preahs.com?subject=Re:%20{{ post_title }}">Reply via email</a>
</div>

[Subscribe via email](https://blog.preahs.com/subscribe-via-email/) or [RSS](https://blog.preahs.com/feeds/)

## Footnotes
[^1]: I went through my Amazon order history for this date.
[^2]: I would say my first experience hosting a server was hosting multiple Minecraft servers over the years for me and my friends. This is also where I learned basic networking concepts, like what a LAN is, what TCP/UDP is, port forwarding, etc.
[^3]: I thought this was enough storage to last a lifetime at the time. Scroll through [r/DataHoarder](https://www.reddit.com/r/DataHoarder/) and think again.
[^4]: My parents' house is powered by solar panels, making this a much cheaper and more manageable option for my poor student situation.