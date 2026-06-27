* * *

## title: "Standing Up Wazuh: A SIEM From Scratch in My Homelab" description: "A front-to-back lab where I learn Wazuh by wiring it into my Proxmox stack — from the agent/manager mental model all the way to custom rules, active response, and ntfy alerts. By the end you'll understand SIEMs well enough to actually run one." pubDate: 2026-06-26 tags: \["wazuh", "siem", "homelab", "blue-team", "detection", "proxmox"\] draft: true

> **Note to me / anyone forking this:** this is written as a learning log, not a polished runbook. The runbook version would be in `/runbooks` once I've done this twice.

## Why I'm doing this

I have a Proxmox host running 25-ish LXC services and a small Active Directory attack/detection lab. Right now I have *visibility into individual boxes* but no single place that answers "did anything weird happen across all of them last night?" That gap is exactly what a SIEM fills, and Wazuh is the open-source one everyone in the defense-adjacent world actually touches, so it's the one worth learning.

My goal for this lab: stand Wazuh up cleanly, understand **why** each piece exists (not just paste install commands), get real alerts firing off real activity in my homelab, and write at least one detection rule from scratch. If I can do that, I understand SIEMs. If you follow along, so will you.

I'm on **Wazuh 4.14.x** (4.14.5 is the current stable branch as of April 2026). Wazuh 5.0 is in public beta with a big architecture refresh — Filebeat goes away, every server becomes a cluster node by default — but 5.0 isn't what you want to *learn on* yet. Build on 4.14, note the differences, upgrade later.

* * *

## Part 0 — The mental model (read this before touching a terminal)

A SIEM is not magic. Strip away the marketing and it's four jobs:

1.  **Collect** events from a lot of machines into one place (logs, file changes, process activity).
2.  **Normalize** those messy events into a common structure so they're comparable.
3.  **Correlate** them against rules and against *each other* ("one failed SSH login is noise; thirty in a minute is a brute force").
4.  **Alert / store** so a human (me) sees what matters and can search the rest later.

Wazuh does all four with these components:

| Component | What it is | Where it runs |
| --- | --- | --- |
| **Wazuh agent** | Lightweight collector | On every endpoint you want to watch |
| **Wazuh server (manager)** | The brain — runs decoders + rules, generates alerts | One central box |
| **Wazuh indexer** | Search/storage engine (an OpenSearch fork) | Same box for us (it's the RAM hog) |
| **Wazuh dashboard** | The web UI you actually look at | Same box |

The flow is worth memorizing because **everything you'll ever debug is somewhere on this path**:

```
endpoint event  →  agent  →  manager  →  DECODER  →  RULE  →  alert  →  indexer  →  dashboard
                                          (parse)     (decide)
```

- A **decoder** pulls fields *out* of a raw log line. Raw `Failed password for invalid user admin from 10.0.0.66` becomes `{srcuser: admin, srcip: 10.0.0.66}`.
- A **rule** looks at decoded fields and decides "is this interesting, and how interesting?" via an **alert level 0–15**. Level 0 = logged but silent. Level 12+ = wake-me-up.

If you internalize *decoder parses, rule decides, level ranks*, the rest of Wazuh is just plumbing. Hold that thought — we'll come back and write both ourselves in Part 9.

* * *

## Part 1 — Where to run the server (a real homelab decision)

This tripped me up, so I'm putting it first. The Wazuh **indexer is OpenSearch**, which is Java, which wants memory and a kernel tweak. That has consequences in a Proxmox world:

- **Don't** run the all-in-one stack in a tiny unprivileged LXC. The indexer needs `vm.max_map_count=262144`, and that's a **host-level sysctl you cannot set from inside an unprivileged container.** You'll get a green install and an indexer that quietly refuses to start.
- **Do** run the server stack in a **VM** (I used a Debian 12 VM), or in a privileged LXC where you've set the sysctl on the Proxmox *host*.

My choice: a VM for the manager/indexer/dashboard, and agents everywhere else (including all my LXCs). That's the cleanest mental split anyway — **the server is special, agents are disposable.**

VM spec I gave it (treat as a sane floor, not a recommendation to go lower):

- 4 vCPU
- 8 GB RAM (the indexer alone will eat 4+; 4 GB total is miserable, don't)
- 50 GB disk (alert data adds up; quickstart retains ~90 days)
- A static IP on my lab VLAN. Mine is `10.10.0.20` in the examples below — substitute yours everywhere.

If you *must* use an LXC, on the **Proxmox host** add to `/etc/sysctl.d/99-wazuh.conf`:

```bash
vm.max_map_count=262144
```

then `sysctl --system`, and make the container privileged with nesting on. But for a first lab, just use a VM and save yourself the debugging.

* * *

## Part 2 — Install the server (the easy part)

SSH into the VM. The assisted all-in-one installer does indexer + server + dashboard in one shot:

```bash
curl -sO https://packages.wazuh.com/4.14/wazuh-install.sh && sudo bash ./wazuh-install.sh -a
```

This takes 5–15 minutes. It downloads three big components, generates self-signed certs, and at the end prints something like:

```
INFO: --- Summary ---
INFO: You can access the web interface https://10.10.0.20
    User: admin
    Password: <SOME_LONG_GENERATED_PASSWORD>
```

**Capture that password immediately.** If you lose it:

```bash
sudo tar -O -xvf wazuh-install-files.tar wazuh-install-files/wazuh-passwords.txt
```

Now lock the version so an `apt upgrade` doesn't yank a half-broken newer build out from under you (newer Wazuh releases can be unstable, and there's no reason to chase them on a learning box):

```bash
sudo sed -i "s/^deb /#deb /" /etc/apt/sources.list.d/wazuh.list
sudo apt update
```

Browse to `https://10.10.0.20`. You'll get a cert warning — **expected**, it's self-signed. Click through (or, the better-hygiene move, import `root-ca.pem` into your browser's cert store). Log in as `admin`.

You're now staring at an empty SIEM. The dashboard is busy and slightly overwhelming on day one — ignore 90% of it. The only thing that matters right now is the agent count, which is **zero**. Let's fix that.

* * *

## Part 3 — Your first agent (and the "aha")

The dashboard has a **"Deploy new agent"** wizard (top of the Agents view) that builds the exact command for you — pick OS, type in the manager IP, copy. That's the right way and it auto-fills the enrollment. But I want you to see what it's actually doing, so here it is by hand on a Debian/Ubuntu endpoint.

Pick a victim. I started with my **Forgejo LXC** because if something tampers with my Git server I genuinely want to know.

On that endpoint, add the repo and install, baking the manager IP in via an env var:

```bash
# add the GPG key + repo
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import
sudo chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update

# install, pointing it at the manager
sudo WAZUH_MANAGER="10.10.0.20" apt install -y wazuh-agent

# enable + start
sudo systemctl daemon-reload
sudo systemctl enable --now wazuh-agent
```

Go back to the dashboard → **Agents**. Within a minute the Forgejo box shows up as **Active**. 🎉

Here's the aha I want you to sit with: **you didn't configure any logs.** The agent already knows how to read this box's auth log, syslog, package manager, and more, because the manager ships a default ruleset that understands them. Out of the box you are *already* detecting SSH logins, sudo usage, and package installs. A SIEM's value isn't that it can see one thing — it's that it sees *everything, the same way, in one pane.*

Now repeat the install on 2–3 more boxes so you have a fleet to look at. I added my **Nextcloud** and **Jellyfin** LXCs. Agents are cheap; add liberally.

> **LXC gotcha:** some advanced FIM modes (who-data via eBPF) don't work inside unprivileged containers. Real-time FIM via inotify works fine, which is all we need below. If you see who-data warnings in `/var/ossec/logs/ossec.log` on a container, that's why — not a real problem for this lab.

* * *

## Part 4 — Reading the data flow you just created

Before adding features, *look at what's flowing*, or you'll cargo-cult the rest of this.

On an agent, log in and back out over SSH, or fail a login on purpose:

```bash
ssh wronguser@10.10.0.31   # type a bad password a couple times, then ctrl-C
```

On the **manager**, every generated alert lands in two files:

```bash
sudo tail -f /var/ossec/logs/alerts/alerts.log     # human-readable
sudo tail -f /var/ossec/logs/alerts/alerts.json    # structured, this is what feeds the indexer
```

You'll see your failed login decoded into fields, tagged with a **rule id** and a **level**. SSH auth failures map to rule IDs in the 57xx range — e.g. a single failed login fires something like rule `5716`, and *repeated* failures trip a composite rule like `5712` ("sshd: brute force") at a higher level. Don't memorize the numbers; memorize the **pattern**: one event = low level, a *frequency* of events = a different, scarier rule fires.

That frequency escalation is the whole reason a SIEM beats `grep`. The manager is holding state across events and reasoning about *rate*. Watch it happen:

```bash
# from another box, hammer SSH to force the brute-force rule
for i in $(seq 1 8); do ssh -o PreferredAuthentications=password \
  -o StrictHostKeyChecking=no baduser@10.10.0.31 2>/dev/null; done
```

Now the dashboard's **Threat Hunting / alerts** view lights up with a higher-severity composite alert, even though no *single* login was special. That's correlation. That's the point.

Take five minutes in the dashboard here: filter by agent, filter by rule level, open an alert and read its decoded fields. Get comfortable — this is where you'll live during an investigation.

* * *

## Part 5 — File Integrity Monitoring (catch tampering)

FIM is the feature that sold me on Wazuh. It watches files and screams when they change. For a homelab full of services with config files I rarely touch, that's gold.

The agent's FIM config lives in **`/var/ossec/etc/ossec.conf`** under `<syscheck>`. It already watches `/etc`, `/usr/bin`, etc. on a schedule. Let's add **real-time** monitoring of something I care about — say my Forgejo config and data dir:

```xml
<syscheck>
  <directories realtime="yes" check_all="yes" report_changes="yes">/etc/forgejo</directories>
  <directories realtime="yes" check_all="yes">/var/lib/forgejo/custom</directories>
</syscheck>
```

Restart the agent (`sudo systemctl restart wazuh-agent`), then make a change the way an attacker (or clumsy me) would:

```bash
echo "# tampered $(date)" | sudo tee -a /etc/forgejo/app.ini
```

Within seconds an alert fires — file modified, rule in the 5xx FIM range (550 = modified, 554 = added), and because I set `report_changes="yes"`, the alert shows a **diff of what changed**. Watching a content diff land in my SIEM the instant I edit a file is the moment "SIEM" stopped being an abstract word for me.

**Why this matters conceptually:** logs tell you what a service *said it did*. FIM tells you what *actually changed on disk*, even if the attacker disabled logging. They're complementary evidence sources, and a good SIEM correlates both.

* * *

## Part 6 — Security Configuration Assessment (free hardening)

SCA audits each endpoint against CIS-style benchmarks and tells you where it's soft. It's on by default. Open an agent in the dashboard → **Configuration Assessment** tab and you get a pass/fail scorecard: SSH allows root login, weak permissions on `/etc/shadow`, no password aging, etc.

I treated this as a to-do list. Every failed check is a thing I either fix or consciously accept. Fixing a handful (disabling root SSH, tightening `sshd_config`) and watching the score climb on the next scan is genuinely satisfying, and it's real hardening of boxes I actually run.

The teaching point: a SIEM isn't only *reactive*. SCA is **proactive posture** — it reduces the attack surface *before* anything fires. Detection and prevention live in the same tool.

* * *

## Part 7 — Vulnerability detection (CVEs across the fleet)

Wazuh inventories installed packages on each agent and matches them against CVE feeds. In 4.14 the **indexer is the authoritative CVE source**, so this works without extra setup once the indexer's running.

Enable it on the manager in `/var/ossec/etc/ossec.conf`:

```xml
<vulnerability-detection>
  <enabled>yes</enabled>
  <index-status>yes</index-status>
</vulnerability-detection>
```

Restart the manager (`sudo systemctl restart wazuh-manager`), wait for the first scan, and open **Vulnerability Detection** in the dashboard. Now I have a single ranked list of every known-vulnerable package across *all* my LXCs — which is a much better patch-prioritization signal than logging into 25 boxes and squinting at `apt list --upgradable`.

This is the "single pane" payoff again: one query answers "what's my worst exposure right now, and on which box?"

* * *

## Part 8 — Detecting a real attack (the fun part)

Two tracks. Do Track A no matter what. Do Track B if, like me, you've got a Windows AD lab to point this at.

### Track A — SSH brute force → auto-block (everyone does this)

You already saw the brute-force rule fire in Part 4. Now make Wazuh **act**. Wazuh ships an **active response** called `firewall-drop` that adds an attacker IP to the host firewall. Wire it to the brute-force rule on the **manager** in `ossec.conf`:

```xml
<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>5712</rules_id>
  <timeout>600</timeout>
</active-response>
```

Restart the manager, re-run the SSH hammer loop from Part 4 against an agent, and watch the offending IP get dropped on that agent for 10 minutes. You just built automated incident response. Note the discipline: I bound it to a *specific high-confidence rule* and gave it a *timeout*, because an active response that's too trigger-happy is a self-inflicted denial of service. **Detection is cheap; deciding to take action is where judgment lives.**

### Track B — Kerberoasting in my AD lab (the bonus)

This is where my existing AD attack/detection lab earns its keep. I already have a writeup on detecting Kerberoasting via Windows event logs; Wazuh lets me centralize that detection instead of reading Event Viewer by hand.

1.  **Install the Wazuh Windows agent** on the Domain Controller (MSI, point it at `10.10.0.20`). Windows agents now ship MSI-only.
    
2.  **Feed it Sysmon + the right Windows channels.** In the Windows agent's `ossec.conf`, subscribe to Security and Sysmon logs:
    
    ```xml
    <localfile>
      <location>Security</location>
      <log_format>eventchannel</log_format>
    </localfile>
    <localfile>
      <location>Microsoft-Windows-Sysmon/Operational</location>
      <log_format>eventchannel</log_format>
    </localfile>
    ```
    
3.  **Generate the attack.** From my attack box, request service tickets the way Rubeus/`GetUserSPNs` does. The DC logs a **Kerberos service ticket request, event ID 4769**, with an RC4 encryption type (`0x17`) against a user-SPN account — the classic Kerberoasting fingerprint.
    
4.  **Detect it.** Wazuh decodes the 4769 events; I write a custom rule (next section is exactly how) that fires when `eventID=4769` *and* `ticketEncryptionType=0x17` *and* the target is a user account. Now the same Kerberoasting I detected manually shows up as a **leveled alert in my SIEM, correlated next to everything else** — and I could chain active response or an ntfy push onto it.
    

The lesson Track B drove home: a SIEM doesn't invent detections, it **operationalizes** them. I already knew the indicator. Wazuh turns "a thing I could find if I went looking" into "a thing that finds me."

* * *

## Part 9 — Write your own rule and decoder (now you actually understand it)

Everything so far used Wazuh's shipped ruleset. You don't *understand* a SIEM until you've extended it. So let's detect something Wazuh doesn't know about by default: a custom app log.

**Never edit the files in `/var/ossec/ruleset/`** — those get overwritten on upgrade. Custom work goes in:

- decoders → `/var/ossec/etc/decoders/local_decoder.xml`
- rules → `/var/ossec/etc/rules/local_rules.xml`

Say I have a homegrown script that logs auth attempts to `/var/log/myapp.log` like:

```
2026-06-26 14:03:11 AUTH_FAIL user=preah ip=10.10.0.66 reason=badpass
```

First, tell the agent to read that file (in the *agent's* `ossec.conf`):

```xml
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/myapp.log</location>
</localfile>
```

Then on the **manager**, write a **decoder** to pull out the fields:

```xml
<!-- /var/ossec/etc/decoders/local_decoder.xml -->
<decoder name="myapp">
  <program_name>myapp</program_name>
  <prematch>AUTH_FAIL</prematch>
</decoder>

<decoder name="myapp-fields">
  <parent>myapp</parent>
  <regex>user=(\S+) ip=(\S+) reason=(\S+)</regex>
  <order>srcuser, srcip, status</order>
</decoder>
```

> If your log line doesn't carry a `program_name` tag, match on the file or a prematch string instead — the principle is the same: *isolate the line, then regex the fields into named order.*

Now a **rule** that decides it's interesting:

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->
<group name="myapp,">
  <rule id="100100" level="5">
    <decoded_as>myapp</decoded_as>
    <description>MyApp: authentication failure for $(srcuser) from $(srcip)</description>
  </rule>

  <!-- composite: many failures fast = brute force -->
  <rule id="100101" level="10" frequency="6" timeframe="120">
    <if_matched_sid>100100</if_matched_sid>
    <same_source_ip />
    <description>MyApp: brute force from $(srcip)</description>
  </rule>
</group>
```

Rule IDs ≥ 100000 are reserved for your custom rules. Check your work *before* restarting, using the built-in log tester:

```bash
sudo /var/ossec/bin/wazuh-logtest
# paste a raw log line, it shows you which decoder caught it and which rule fired
```

`wazuh-logtest` is the single most useful tool for learning Wazuh — it makes the decode→rule pipeline visible for any line you paste. When the test shows rule `100100` firing with your fields decoded, restart the manager and you've got a detection **you built end to end.**

At this point you've touched every layer: ingestion (`localfile`), normalization (decoder), correlation (composite rule), severity (level), and escalation (frequency). That *is* a SIEM. Everything else is more of the same at scale.

* * *

## Part 10 — Alerting into my homelab (ntfy)

A SIEM that only alerts inside its own dashboard is a tree falling in an empty forest. I already run **ntfy** for push notifications to my phone, so let's route high-severity Wazuh alerts there. Wazuh 4.14 still has the **integrator daemon** for exactly this (heads up: it's deprecated in 5.0, so this section will change when I upgrade).

Write a tiny custom integration script. It **must** be named with a `custom-` prefix. On the manager:

```bash
sudo tee /var/ossec/integrations/custom-ntfy > /dev/null <<'EOF'
#!/bin/bash
# args: $1=alert file path, $2=api key (unused), $3=hook url (ntfy topic)
ALERT_FILE="$1"
NTFY_URL="$3"

TITLE=$(jq -r '.rule.description'            "$ALERT_FILE")
LEVEL=$(jq -r '.rule.level'                  "$ALERT_FILE")
AGENT=$(jq -r '.agent.name'                  "$ALERT_FILE")
SRCIP=$(jq -r '.data.srcip // "n/a"'         "$ALERT_FILE")

curl -s \
  -H "Title: [Wazuh L${LEVEL}] ${AGENT}" \
  -H "Priority: high" \
  -H "Tags: rotating_light" \
  -d "${TITLE} (src: ${SRCIP})" \
  "${NTFY_URL}" > /dev/null
EOF

sudo chmod 750 /var/ossec/integrations/custom-ntfy
sudo chown root:wazuh /var/ossec/integrations/custom-ntfy
sudo apt install -y jq   # the script needs it
```

Wire it up in the manager's `ossec.conf`, firing only on level ≥ 10 so I'm not buzzed for noise:

```xml
<integration>
  <name>custom-ntfy</name>
  <hook_url>https://ntfy.snowberry.social/wazuh</hook_url>
  <level>10</level>
  <alert_format>json</alert_format>
</integration>
```

Restart the manager, trigger your brute-force loop, and my phone buzzes with a Wazuh alert. Now the SIEM reaches me wherever I am — which is the difference between "I have monitoring" and "I have a security program."

**Tuning note that matters more than it sounds:** the level threshold *is* your alert-fatigue dial. Set it too low and you train yourself to ignore the buzz, which is worse than no alerting. I started at level 12, found it too quiet, dropped to 10. Finding that number for *your* environment is real SOC work in miniature.

* * *

## What you understand now

If you did all ten parts, you can explain — to an interviewer, even — every link in this chain and *why each exists*:

- **Agent → manager:** distributed collection into a central brain.
- **Decoder → rule → level:** normalize, decide, rank. The core of every SIEM ever made.
- **Frequency/composite rules:** correlation across events, the thing `grep` can't do.
- **FIM, SCA, vuln detection:** logs aren't the only evidence — disk state, config posture, and CVE exposure all flow through the same pane.
- **Active response + integrations:** detection becomes *action* and *notification*, with deliberate thresholds so you don't DoS yourself or burn out.

That's not Wazuh trivia. That's how Splunk, Elastic SIEM, Sentinel, and every commercial tool work under different branding. You learned the *category*, not just the product.

## Gotchas I hit (so you don't)

- **Indexer won't start in a container** → `vm.max_map_count` must be set on the Proxmox *host* for LXC. Use a VM and skip the pain.
- **Agent shows "Never connected"** → almost always a firewall blocking **1514/udp** (agent data) or **1515/tcp** (enrollment) to the manager. Check both.
- **Disk fills up** → the indexer retains ~90 days by default; on a small lab box, watch `df -h` and trim retention if needed.
- **Edited a shipped rule, lost it on upgrade** → only ever touch `local_rules.xml` / `local_decoder.xml`.
- **`wazuh-logtest` is your friend** → when a rule won't fire, paste the raw line into it before changing anything else.

## Where I'm taking this next

- Pipe **Suricata** logs in for network-layer detection alongside the host telemetry.
- Map my firing rules to **MITRE ATT&CK** (Wazuh tags many rules already) so I can talk about coverage gaps, not just individual alerts.
- Build a small **detection-as-code** habit: version `local_rules.xml` in Forgejo, so my detections are reviewed and reversible like any other code. That's the DevSecOps muscle I actually want.

When I plan the 5.0 upgrade, this lab gets a sequel — the Filebeat removal and the integrator-daemon deprecation both change the plumbing above, and re-learning the deltas is the best way to prove I understood the originals.