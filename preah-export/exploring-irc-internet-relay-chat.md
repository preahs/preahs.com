---
title: Exploring IRC (Internet Relay Chat)
slug: exploring-irc-internet-relay-chat
published_date: 2025-10-20T18:00:00+00:00
tags: 2025, guides, thoughts
publish: true
make_discoverable: true
is_page: false
meta_description: I have been having fun trying out IRC and IRC clients, including a self-hosted option.
meta_image: https://preahs.com/assets/images/meta-image.png
---

My history with IRC is spotty. I've explored it a couple different times, but I always struggled with 1. understanding it, 2. setting it up, and 3. finding channels that I actually enjoy.

I thought I would give it another go recently. I saw a mention of a modern client called [Halloy](https://halloy.chat/) on [HackerNews](https://news.ycombinator.com/item?id=45590949) the other day, and it has a beautiful interface. I'm not a huge fan of how the windows open and arrange, as it becomes very confusing very fast, but I enjoy the appearance and theme selections. Overall, it's very functional.

![A screenshot of the Halloy IRC client on macOS](https://preahs.com/assets/images/halloy.png)

## Okay, but what is IRC?

IRC, or Internet Relay Chat, is one of the oldest forms of online communication, created back in 1988, long before social media or modern messaging apps existed. Think of it as a giant network of chat rooms (called channels) where people can talk in real time about shared interests, ask questions, or just hang out. Each channel usually focuses on a specific topic. This is anything from technology and gaming to books or music, and you can join any that interest you.

Although it might look simple compared to apps like Discord or Slack, IRC remains popular among certain communities for a few key reasons. It’s fast, lightweight, and distraction-free: there are no ads, algorithms, or constant notifications (unless you want to be notified of new messages by your client). You connect, chat, and leave when you want. Many developers, hobbyists, and open-source communities especially still use IRC because it works everywhere, even on very old or low-power devices, and doesn’t rely on any one company’s servers or apps. It's **decentralized**. If you know me, you know I love decentralization.

## How it works on a more technical level

IRC works using a simple client–server model. When you connect to IRC, you use a **client**, which is a piece of software on your computer or phone, to join an IRC server. That server is part of a larger **network** made up of many connected servers that share messages between each other. When you send a message in a channel (a public chat room that usually starts with a “#”, like `#music` or `#linux`), your client sends it to the server you’re connected to. The server then relays that message to all other servers on the same network, which deliver it to everyone else currently in that channel.

Each person on IRC has a **nickname**, or colloquially referred to as a **nick**, and messages can be sent either to an entire channel or directly to another user in private (DM or direct message). Communication happens entirely in plain text, and commands, like joining a channel, changing your nickname, or setting up your status, are typed manually, usually starting with a slash (for example, `/join #chatroom`, like Minecraft commands lol). Because the system is decentralized, there’s no single company controlling IRC. Anyone can set up their own server or network, and clients simply connect using the IRC protocol, which runs over standard internet ports (usually 6667 or 6697 for encrypted connections). This design makes IRC lightweight, flexible, and still functional decades after it was first created.

[Check out the Basics of IRC from Libera Chat](https://libera.chat/guides/basics).

>Libera Chat is a Swedish nonprofit organisation... Libera Chat’s purpose is to provide services such as a community platform for free open-source software and peer directed projects on a volunteer basis.

-- [About Libera Chat page](https://libera.chat/about/)

## Using IRC today

So, how do I know what network and channels to join? Uh, I don't know. Well, I do know, but I haven't found anything super intriguing yet. You kind of have to find your niche, and a lot of channels have very few people or not much conversation going on. I think your best bet is 

1. Find a channel that is somewhat active and start talking, asking questions, and answering questions. If you're in `#python`, ask for thoughts on something you're coding, or help a new programmer if you're a Python expert. I don't use my real name on IRC channels, so that makes it a bit easier to explore chatting publicly with strangers, not to mention keeping my identity a little safer. Also,

2. Find or create an invite-only channel/network. This leads to more tight-knit and active communities sometimes, like a Discord server. [Starting your own IRC network](https://ubuntu.com/tutorials/irc-server#1-overview) is a bit more difficult, especially considering security hardening and uptime, but most people can make a channel on an existing network such as Libera Chat without too much issue.

And maybe you're a self-hosting wizard who wants to tinker with a network, then do it!! It's cool! It also gives you full control over your chats, in the same way self-hosting anything does. If you just want to make a channel, you can very easily do so on a network like Libera Chat. They have a guide to check out at their [Creating Channels](https://libera.chat/guides/creatingchannels) page.

## Be safe

To stay safe and secure while using IRC, it’s important to treat it much like any other public online space. First, always **connect using SSL/TLS encryption** (usually by using port 6697) to protect your messages from being intercepted. Choose a **strong, unique nickname** and avoid sharing personal information like your real name, location, or email address in public channels or profiles. Because IRC is open and often anonymous, anyone can join a channel, so it’s best to assume everything you say is public. Many networks let you **register your nickname** with a service like **NickServ**, which helps prevent others from impersonating you. If someone is bothering or harassing you, you can **use the `/ignore` command** to block them or contact a network operator for help. Finally, use a **trusted client** (software used to connect to IRC) and avoid clicking suspicious links shared in chat, since IRC usually has no built-in spam or malware protection.

### Finding networks

Here is what I used to find the most active channels and networks.

- [netsplit.de](https://netsplit.de/) has a whole directory of networks and channels to look at. They have [Libera.Chat channels sorted by number of users](https://netsplit.de/channels/?net=Libera.Chat) and [Top 100 IRC networks](https://netsplit.de/networks/top100.php), for example.

- You can use the `/list` in whatever network you're already in to see all (discoverable) channels.

In general, check out this [list of awesome IRC sources](https://github.com/davisonio/awesome-irc). It has client recommendations, both hosted and self-hosted, a collection of networks and links for other ways to find channels and networks, frameworks for bots and managing your own channel or network, and more.

## IRC clients

I would say clients are even more intimidating than trying to find channels and networks. Usability, appearance, features... so much to balance. I would still check [awesome-irc](https://github.com/davisonio/awesome-irc) for client research, but also [Libera Chat's little guide](https://libera.chat/guides/clients) about choosing a client. I tried Halloy briefly and enjoyed it, and frankly haven't tried too many clients but I went with TheLounge.

It's self-hosted and has modern features like

- Push notifications, link previews, and file uploads.

- Always connected to your servers while you're offline, removing the need for [bouncers](https://libera.chat/guides/clients#bouncers) and allowing you to reconnect from any device.

- Free and open-source under the MIT license.

- Works wherever Node.js runs. I have it running on my Proxmox-running home server in an LXC container I spun up in like 30 minutes.

- Multi-user support, so you can share it with friends without intersecting chats and server connections.

- Theme selection. There are custom, user-made themes, and two generic "light" and "dark" themes you can choose.

If you enjoy IRC for the retro feel, then you can still choose a retro-looking theme for TheLounge if you want. I enjoy visual customization quite a bit. It looks nice, it feels nice to use, it's organized, and I _really_ like always being connected.

Hey, check out this game I found on Rizon.Net. It's an "idle RPG", where the aim is to always idle. This means no chatting, try not to run commands, anything. This is the only way to level up. Then, random little events can happen. You can choose your character name, class, and alignment, which affects your gameplay. It's a really fun start if you're nervous about actually chatting but want to get into IRC a bit.

>The Idle RPG is just what it sounds like: an RPG in which the players idle. In addition to merely gaining levels, players can find items and battle other players. However, this is all done for you; you just idle. There are no set classes; you can name your character anything you like, and have its class be anything you like, as well.

-- [#rizonirpg Idle RPG: Game Info](http://idlerpg.rizon.net/)

## Short set-up guide

Let's say you already have a client. I'm using mine as an example. To join something like Idle RPG, it's simple.

1. Connect to a network. TheLounge has these nice "+" signs you can just click to add, but it will vary on your client.

![Connecting to the Rizon network](https://preahs.com/assets/images/connecttoserver.png)

2. In the image above, I added the channel to connect to automatically. However, you can add other channels using either a UI button like a "+" sign or usually just running a command like `/join #RizonIRPG` or whatever the channel name is.

As you can see, my character Kagrenak, who is a Sorcerer, is struggling a bit. Oh well.

![IRPG Screenshot](https://preahs.com/assets/images/irpg.png)

## Setting up TheLounge as a self-hosted IRC client

I was going to write a guide on setting up TheLounge as self-hosted but the docs really have everything you need. [TheLounge docs](https://thelounge.chat/docs/install-and-upgrade) is basically what I used.

Mine is a Debian-based LXC container with 2 CPU cores, 2GB of RAM, and 4GB of storage. You can also set up a VPS with a reverse proxy, or use an old computer laying around, whatever you want to containerize and run it. You can actually use Docker too I believe. I personally used [Cloudflare tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose it safely.

To close, have fun, try out cool platforms, and please let me know if you have a cool channel or would be interested in an invite-only one to hang out! If you have trouble or questions with setting up, feel free to email me as well.
___
<div class="reply-button-container">
  <a class="reply-button" href="mailto:preah@preahs.com?subject=Re:%20{{ post_title }}">Reply via email</a>
</div>

[Subscribe via email](https://blog.preahs.com/subscribe-via-email/) or [RSS](https://blog.preahs.com/feeds/)