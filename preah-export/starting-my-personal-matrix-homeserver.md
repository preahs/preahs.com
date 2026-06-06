---
title: Starting My Personal Matrix Homeserver
slug: starting-my-personal-matrix-homeserver
published_date: 2026-03-10T20:30:00+00:00
tags: 2026, long, thoughts
publish: true
make_discoverable: true
is_page: false
meta_description: I made my own homeserver using the Matrix protocol to move my chats from Discord.
meta_image: https://preahs.com/assets/images/meta-image.png
---

I initially explored Matrix several years ago. It seemed promising, yet about as active as your average IRC channel and lacking most features one would like in a chat platform. Since [Discord's relatively recent announcement about age-verification](https://support.discord.com/hc/en-us/articles/38332670254231-Age-Assurance-Update-FAQ), and their more long-standing problem of slowly boiling their users like frogs with more and more paywalling basic features, I have revisited any and all alternatives for the platform.

Out of all the ones I've tried so far, Matrix is the most promising to me. It can be self-hosted, it is federated so that I can communicate with communities outside of my server, and moderation has improved significantly. There are also more features and better clients since I last checked on it; even more clients are getting an increase of attention due to Discord expats. Because of its improvements, I would say it has reached a point that it fits my needs. I have also learned so much and can confidently handle hosting this sort of thing now.

I have been socializing on some great spaces so far, starting from Matrix United (#matrixunited-space:matrix.org) and [MatrixRooms.info](https://matrixrooms.info/). The [Apple](https://matrix.to/#/#appletalk:matrix.org) room is especially active and has a lot of nice people.

## Snowberry Social

I recently finished starting my own server, called snowberry.social, home page on [https://snowberry.social](https://snowberry.social) with a guide on what Matrix is and the focus of my server. Registration is currently restricted out of respect to my own time and energy,[^1] and I have a few friends on there who have been open to the idea of leaving Discord, or at least trying something else.

Recently, I have been open to making a completely public space for like-minded people focused on making a better social life on the internet. Topics include hosting your own software and applications, blogging, RSS, federated platforms, gaming, and more. Despite (or maybe because?) my server has been so stable and easy to manage so far, I am hesitant to allow registration on *my* server, but am open to using federation for people to join this space. However, I am torn since I know the majority of users join the general matrix.org server, further centralizing Matrix, not to mention that Matrix [may introduce their own age-verification to comply with future laws(?)](https://matrix.org/blog/2026/02/welcome-discord/). I can't say I have a solid decision as of the writing of this post, but am open to discussion, and people who I have talked to before can request a registration token from me to join my homeserver.

Feel free to join my newly created space with any Matrix account at [#community:snowberry.social](https://matrix.to/#/#community:snowberry.social).

*I should note that when using matrix.to or mobile clients, you may be prompted to make an account at matrix.org by default. If you want to use/register under a different homeserver, you have to change it to your preferred one.*

Why is it called "Snowberry Social"? I am a huge Skyrim/Elder Scrolls fan, and one of the alchemical ingredients is a [snowberry](https://en.uesp.net/wiki/Skyrim:Snowberries). It's cute.

## How I made my own homeserver

Setting up the full-featured stack for Matrix seemed incredibly daunting at first. It still is, although much less so now that I have it already made. The guide I followed, and that I recommend to anyone, is the [matrix docker ansible deploy repo](https://github.com/spantaleev/matrix-docker-ansible-deploy/tree/master). Using an ansible playbook, you can easily set up a server with optional configurations and services. From the GitHub page,

> This Ansible playbook is meant to help you run your own Matrix homeserver, along with the various services related to that.
> 
> That is, it lets you join the Matrix network using your own user ID like @alice:example.com, all hosted on your own server (see prerequisites).
> 
> We run all supported services in Docker containers (see the container images we use), which lets us have a predictable and up-to-date setup, across multiple supported distros (see prerequisites) and architectures (x86/amd64 being recommended).
> 
> Installation (upgrades) and some maintenance tasks are automated using Ansible (see our Ansible guide).

If you are interested in pursuing this, I highly recommend *reading and re-reading every instruction*, or you might get horribly frustrated depending on your technical experience. Follow every little pre-requisite, learn what in the world an ansible playbook is, learn what DNS is, and maybe be ready to wipe your VPS/container/whatever after screwing things up.[^2]

Some things I ran into while trying this: What files to configure, SSH key permission issues, ports being closed. This is why I went with a VPS instead of my usual hardware, since port forwarding is simple and easy. This playbook even starts a web server for you in order to serve `.well-known` files, needed for federation capabilities. I highly recommend checking it out and reading through everything you can do with it.

## User experience

What everyone wants to know: can I use it on a daily basis without ripping my hair out? Sure.

If you're a disgruntled Discord user, Matrix is *not* Discord. The layout (depends on client) and features are much more geared toward a WhatsApp, Facebook Messenger, or even Slack alternative. By default, it does not support custom emotes/stickers and does not have "servers" with "channels" in "categories" like the average Discord user prefers. However, you can have **spaces** with **rooms** in **subspaces**.

Furthermore, the client you choose can greatly affect your experience. The official client, and the most user-friendly in my opinion, is Element/Element X.[^3] Available on the web, or as an app on iOS, Android, macOS, Linux, and Windows. It is developed and maintained by the same team who developed and maintained the Matrix protocol.

Other options are shown in the comparison table below, and a few image showcases can be found under the same table on [https://snowberry.social](https://snowberry.social/).

| **Client**                                                     | **Primary Platforms**    | **Best For**             | **Key Features**                                                             | **Notable Limitations**                                                          |
| -------------------------------------------------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [**Element (Web/Desktop)**](https://element.snowberry.social/) | Web, Win, macOS, Linux   | General use              | Full feature parity (Spaces, Widgets, Bridging UI, video and voice calls)    | Can feel heavy/slow on older hardware. **No support for custom emojis.**         |
| **[Element X](https://element.io/en/download)**                | Android, iOS             | Mobile-first speed       | Extremely fast (Sliding Sync), native feel, modern Matrix 2.0 RTC for calls. | Missing some "Classic" features like full room settings or complex widgets.      |
| **[FluffyChat](https://fluffy.chat/en/)**                      | Android, iOS, Web, Linux | General use, mobile      | Simple "cute" UI, easy onboarding, good custom sticker/emoji support.        | Video and voice call features are experimental.                                  |
| **[Cinny](https://cinny.in)**                    | Web, Desktop             | Discord-like communities | Clean, Discord-like interface, very lightweight and fast, focused on chat.   | No mobile app; limited support for advanced widgets or VoIP, **no poll support** |
| **[Commet]()**                                                 | Web, Desktop, Android    | Discord-like communities | Voice channels with presence, calendar rooms, rich profile customization.    | Experimental; some concerns regarding enforcement of room encryption.            |
If you like Discord, Cinny and Commet are great desktop options. I personally use Cinny on macOS, and FluffyChat on my iPhone. They both support custom emotes/stickers, which my friends also value. No limits on custom emoji use like Discord's paywalls! Does FluffyChat's choice of gradients and color themes for their app drive me a little insane because it's ugly? Yes, lol.

## Conclusion

Give Matrix a spin on matrix.org and move to a different homeserver if you prefer later. Join my space and see if we can make a community that's federated, decentralized, and private. I had a lot of fun setting this up and I have a lot of fun talking to others using it! There are whole communities out there waiting for discussions to blossom.
___
<div class="reply-button-container">
  <a class="reply-button" href="mailto:preah@preahs.com?subject=Re:%20{{ post_title }}">Reply via email</a>
</div>

[Subscribe via email](https://blog.preahs.com/subscribe-via-email/) or [RSS](https://blog.preahs.com/feeds/)

## Footnotes

[^1]: Registration is token-based using [matrix-registration-bot](https://github.com/moan0s/matrix-registration-bot). This means that users can only register when given a randomly generated string of characters and entering it upon account creation.

[^2]: You do have a [VPS](https://cloud.google.com/learn/what-is-a-virtual-private-server), right? (See also [this Reddit discussion](https://www.reddit.com/r/selfhosted/comments/i6jo44/why_use_a_vps/) on why self-hosters use them).

[^3]: Element X is the newest version of Element.