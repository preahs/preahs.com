---
title: "Homelab Monitoring and Alerting with Prometheus, Grafana, Alertmanager, and ntfy"
description: "How my Proxmox homelab is monitored: what gets scraped and probed, which alerts fire and why, how alerts reach my phone through ntfy, and how a dead man's switch catches the stack going dead."
date: 2026-10-14
severity: medium
tags: ["labs", "tech", "linux", "proxmox", "monitoring", "prometheus", "grafana", "alerting"]
---

## Why this exists

In August my Proxmox host dropped off the network. Tailscale, the Cloudflare Tunnels, and the web GUI all went dark at once, while iDRAC stayed reachable on its dedicated management port. The cause turned out to be a dead onboard NIC port (`eno1` reporting `NO-CARRIER`), most likely from a power surge during the Texas flooding. The fix was simple: repoint the `vmbr0` bridge to `eno2`, and fix `eno1` at a later date.

The problem was that I only found out because I went looking. The server is at a location I have to travel to, and nothing told me it was down. This stack is the answer to that, so that if something breaks, I have a notification on my phone before I notice it myself, and if the monitoring breaks, I want to know that too.

## Architecture at a glance

```
                ┌──────────────── Proxmox host (R730) ────────────────┐
                │                                                      │
                │  node_exporter :9100     smartctl_exporter           │
                │        │                        │                    │
                │  ┌─────┴──── Monitoring LXC (Docker) ─────┴───────┐  │
                │  │                                                │  │
                │  │  Prometheus :9090  ◄── pve-exporter ◄── PVE API│  │
                │  │      │   ▲                                     │  │
                │  │      │   └── blackbox_exporter ──► ~40 probes  │  │
                │  │      ▼                                         │  │
                │  │  Alertmanager :9093 ──► ntfy-alertmanager ─────┼──┼──► ntfy.my.domain ──► phone
                │  │      │                                         │  │
                │  │      └── Watchdog (always firing) ─────────────┼──┼──► healthchecks.io ──► email
                │  │                                                │  │
                │  │  Grafana :3000 (queries Prometheus)            │  │
                │  └────────────────────────────────────────────────┘  │
                └──────────────────────────────────────────────────────┘
```

Everything runs in a single unprivileged LXC on the Proxmox host, using Docker Compose. Exporters that need to see hardware (node_exporter and smartctl_exporter) run directly on the host.

| Component | Version | Role |
|---|---|---|
| Prometheus | 3.5.5 | Scrapes metrics, stores the time series, evaluates alert rules |
| Alertmanager | 0.34.0 | Groups, deduplicates, routes, and inhibits alerts |
| Grafana | 13.2.1 | Dashboards only. Holds no metric data of its own |
| node_exporter | host binary | CPU, memory, disk, network, temperatures, NIC carrier state |
| smartctl_exporter | host binary | SMART health for the drives, including those behind the PERC controller |
| prometheus-pve-exporter | 3.10.0 | Proxmox API view: guest state, storage pool usage |
| blackbox_exporter | container | Outside-in probes of services (HTTP, ICMP, TCP) |
| ntfy-alertmanager | 1.0.1 | Translates Alertmanager webhooks into ntfy push notifications |

At last count the stack had 15 scrape jobs and 43 active targets.

## What gets watched

### Infrastructure metrics

- **The host itself** via node_exporter: resource usage, filesystem space, temperatures, and the carrier state of the physical NICs.
- **Drives** via smartctl_exporter. The two data drives sit behind the PERC controller, so they are addressed as `sat+megaraid,0` and `sat+megaraid,1`, plus the boot SSD. An external USB drive also shows up in `lsblk`, but I deliberately do not monitor it.
- **Proxmox** via pve-exporter, authenticated with a read-only API token (a dedicated `prometheus@pve` user with the `PVEAuditor` role on `/`). This gives per-guest running state and per-storage-pool usage across all 25+ containers.

### Service probes

blackbox_exporter checks services the way a user would reach them, and the targets are split into jobs based on how each service actually responds. I confirmed every service's real response code with `curl` before assigning it a module, rather than guessing.

| Module | Used for |
|---|---|
| `http_health` | Services with a dedicated health endpoint that returns 200 |
| `http_2xx` | Services whose landing page returns a plain 2xx |
| `http_insecure` | Internal HTTPS services with self-signed certs, health endpoint |
| `http_2xx_insecure` | Internal HTTPS services with self-signed certs, any 2xx |
| `icmp` | Hosts that should simply answer a ping |
| `tcp_connect` | Services that only need a listening port |

Probes run against both the internal LAN addresses and the public hostnames. Comparing the two is how I tell "the service is down" apart from "the tunnel is down." The Matrix homeserver on my external VPS is probed as well.

## What fires

| Alert | Condition | Severity |
|---|---|---|
| Watchdog | Always firing, by design (see below) | none |
| TargetDown | A scrape target unreachable for 3 minutes | critical |
| NICLinkDown | The uplink NIC loses carrier | critical |
| EndpointDown | A probe failing for 5 minutes | critical |
| SmartFailing | A drive's firmware reports SMART FAILED | critical |
| SmartReallocatedSectors | Bad sectors are being remapped | warning |
| DiskSpaceLow | Under 15% free | warning |
| DiskWillFillIn24h | Linear trend reaches zero within a day | warning |
| StoragePoolLow | A Proxmox storage pool above 85% | warning |
| GuestStopped | An LXC or VM not running for 5 minutes | warning |
| HighMemoryUsage | Above 90% for 15 minutes | warning |
| HighCPULoad | Above 90% for 20 minutes | warning |
| HostTemperatureHigh | Any sensor above 80°C | warning |
| CertExpiringSoon | A TLS cert expires within 14 days | warning |
| HostRebooted | Boot time less than 5 minutes ago | info |

`NICLinkDown` is the alert this whole project was built for. It is pinned to the uplink interface specifically, because the first version matched every `eno*` device and fired forever on an unused onboard port that has never had a cable in it.

## How an alert reaches my phone

1. **Prometheus** evaluates rules continuously. A rule with a `for:` window sits in *pending* until the condition has held long enough, then moves to *firing*. Endpoint alerts also use `keep_firing_for:` so a flapping service does not send a resolve-then-fire pair every couple of minutes.
2. **Alertmanager** receives firing alerts, groups them by `alertname` and `instance`, waits 30 seconds to collect related alerts, and re-notifies every 6 hours while something stays broken. Info-level alerts repeat only once a day.
3. **Inhibition** keeps a single outage from becoming a flood. When `TargetDown` fires for an instance, every warning and info alert from that same instance is suppressed. One host going down produces one notification, not fifteen.
4. **ntfy-alertmanager** converts the webhook into a readable push, mapping severity to ntfy priority:

   | Severity | ntfy priority |
   |---|---|
   | critical | urgent |
   | warning | high |
   | info | default |

5. **ntfy** on my ntfy server delivers it to my phone. Resolved notifications are sent too, so I know when something recovers on its own.

## Watching the watcher

The obvious weakness of running monitoring on the machine it monitors is that a host failure takes the monitoring down with it.

The `Watchdog` alert closes that gap. It fires permanently, and Alertmanager routes it (and only it) to a check on healthchecks.io every 5 minutes. The check expects a ping every 15 minutes with a 5 minute grace period. If the host loses power, loses its NIC, or the site loses internet, the pings stop and healthchecks.io emails me from outside the house.

It cannot tell me *what* broke, only that everything went quiet. But that converts the worst failure mode, not knowing at all, into a known outage.

## Design decisions

**Single LXC on the host, not an external server.** A full external metrics stack would cost more and add complexity for a homelab of this size. Keeping the heavy stack local and adding an external heartbeat covers the critical failure case for free. A small external VPS watchdog is still on the roadmap for richer off-site detail.

**A dedicated bridge for ntfy.** Alertmanager has no native ntfy receiver. Pointing its webhook straight at ntfy works, but the notification body is raw JSON. The bridge makes alerts readable at a glance on a lock screen, which matters at 3am.

**No alert that cries wolf.** Every rule had to go quiet on a healthy system before I considered the stack done. A rule that fires on day one and never would inevitably lead me to ignore notifications, which would be useless. That principle drove the `NICLinkDown` fix, the cert scoping, and removing placeholder targets rather than leaving them red.

**Access stays private.** Prometheus, Alertmanager, Grafana, and the exporters are reachable over the LAN or the tailnet only.

**Backups favor configuration over data.** Grafana's volume (dashboards, users) is worth backing up. Prometheus's time series data is expendable and large, so it is excluded from nightly backups.

## Verification

Two tests had to pass to make this an alerting system rather than a dashboard:

```bash
# 1. Push a synthetic alert straight into Alertmanager and confirm it lands on the phone
curl -X POST http://<monitoring-lxc>:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"TestAlert","severity":"critical","instance":"test"},
       "annotations":{"summary":"Testing the ntfy path"}}]'

# 2. Stop Alertmanager, wait for healthchecks.io to complain, then start it again
docker compose stop alertmanager
```

Both passed.

Day-to-day config changes are validated before they are loaded:

```bash
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
docker exec prometheus promtool check rules /etc/prometheus/alerts.yml
curl -X POST http://localhost:9090/-/reload
```

## Problems hit along the way

- **Wrong image names.** Alertmanager is `prom/alertmanager`, not `prometheus/alertmanager`.
- **Alertmanager refused to start** until clustering was disabled with an empty `--cluster.listen-address=` flag, since it is a single instance.
- **ntfy-alertmanager config drift.** Version 1.0.1 changed both the config file name and its format compared to older guides.
- **Blackbox returned 400s** for jobs referencing modules that did not exist yet (`http_health`, `http_insecure`).
- **pve-exporter 401s** that turned out to be bash history expansion mangling the token during manual `curl` tests. The fix was to stop pasting it: regenerate the token, pipe it through `jq` into a file, check it is exactly 36 characters, and pass it in through a `.env` file.
- **Running `promtool`** needs `docker exec` into the running container (or an `--entrypoint` override), not extra arguments on `docker run`.

## Known gaps and what is next

- **iDRAC probe.** Temporarily commented out pending a firmware setting change. It is the most valuable probe in the file, since iDRAC was the one thing still answering during the NIC outage.
- **Per-container metrics.** node_exporter is not yet inside individual LXCs, so a container's own volume filling up is only visible through the host's view.
~~- **Backups.** Nothing yet confirms that vzdump ran, succeeded, and produced a plausibly sized file.~~ Fixed using Proxmox's existing backup notifications.
- **RAID controller health.** SMART covers the physical drives, not the PERC's view of degraded arrays or a failed battery. snmp_exporter against iDRAC would fill this in.
- **Power.** UPS monitoring with NUT is the highest priority addition, on a site that has already lost hardware to a surge.
- **Logs.** No log aggregation yet. Loki with Grafana Alloy (Promtail is end of life) would allow alerting on error patterns and failed logins.
- **Off-site watchdog.** A small external VPS running independent uptime checks, with its own notification path, so a site-wide outage tells me a bit more detail.
- **Automation.** An Ansible role for deploying node_exporter fits the infrastructure-as-code phase of my homelab roadmap.

Hope anyone reading enjoyed! Feel free to reach out with questions, and I highly suggest implementing monitoring for your own setup. Everything works until it suddenly wants to ruin your day.
