---
title: "Active Directory From Scratch — A Learning Lab"
description: Building and operating a real Active Directory domain, front to back, to actually understand it.
date: 2026-06-02
tags: [active-directory, windows, infrastructure, lab]
toc: true
---

This is my notebook for learning Active Directory as a system administrator. There's a place for the attack/detection side, but here I want to actually understand what AD **is**, why every piece exists, and how to run it day to day. By the end of this, I (and anyone following along) should be able to stand up a domain, organize it, manage users and policy, join machines, share files the "right" way, keep it healthy, and recover it when something breaks.

Every step has a short "why" so the muscle memory comes with a mental model.

## 1. The mental model: what AD actually is

Before any VMs, let me get the concepts straight here. AD makes a lot more sense once you stop seeing it as "the thing that lets you log in" and start seeing it as a **distributed database with a built-in authentication and policy system**.

### It's a directory service

Active Directory Domain Services (AD DS) is a **directory**: a database of objects (users, computers, groups, printers, etc.), each described by a set of **attributes**, all stored in a file called `NTDS.dit` on each Domain Controller. The set of *allowed* object types and attributes is the **schema**, the database's blueprint. You query and modify this directory with the **LDAP** protocol.

So three words to keep together:

Object

: A user, a computer, a group. A row.

Attribute

: A property of an object (`givenName`, `mail`, `memberOf`). A column.

Schema

: The master definition of which objects and attributes can exist. The table definitions.

### Domains, trees, forests

- A **domain** is one security and administrative boundary. Think, one directory database, one set of users/computers, replicated across that domain's Domain Controllers. My lab is a single domain: `ad.snowberry.lab`.
- A **tree** is one or more domains sharing a contiguous DNS namespace (`ad.snowberry.lab`, `west.ad.snowberry.lab`).
- A **forest** is the top-level container: one or more trees that share a schema and a global catalog, with automatic trust between them. The forest is the real **security boundary**. Every AD deployment is at least one forest with one domain — which is exactly what I'm building.

> **Why it's layered like this:** big organizations need to delegate administration and isolate namespaces without losing a single sign-on experience. For a homelab or a small company, a *single domain in a single forest* is the correct, boring, recommended design. I'm not making subdomains for fun.

### Distinguished Names and LDAP

Every object has a **Distinguished Name (DN)** — its full path in the directory, read right to left. A user `pmaple` in an `IT` OU looks like:

```
CN=Preah Maple,OU=IT,OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab
```

- `CN` = Common Name (the object)
- `OU` = Organizational Unit (a container I create)
- `DC` = Domain Component (pieces of the DNS name)

The DN matters because almost every PowerShell command and GPO link refers to objects by DN. Once DNs click, AD scripting stops being mysterious.

### DNS is the nervous system

This is the single most important operational fact about AD: **AD cannot function without correct DNS.** Clients don't find Domain Controllers by IP — they ask DNS for special **SRV records** (`_ldap._tcp.dc._msdcs.ad.snowberry.lab`) that advertise "here are the DCs, here's the Kerberos service, here's the global catalog." If DNS is wrong, *everything* breaks in confusing ways (logons hang, GPO doesn't apply, joins fail).

That's why a DC almost always runs **AD-integrated DNS**, and why every domain member must use the DC as its DNS server — not 8.8.8.8, not the router. I'll hammer this throughout.

### Authentication: Kerberos (and NTLM)

When a user logs in, the DC's **Key Distribution Center** issues a Kerberos **Ticket-Granting Ticket (TGT)**. To reach a resource (a file share), the client trades the TGT for a **service ticket** for that specific service. The resource server trusts the ticket because it trusts the DC. This is why domain SSO works: you authenticate once to the DC, then present tickets everywhere.

NTLM is the older challenge/response fallback still used in some cases. I don't need to go deep here — I just need to know **Kerberos depends on accurate time** (clients and DCs must be within 5 minutes) and **accurate DNS**. Two recurring villains, same two names.

### Global Catalog

A **Global Catalog (GC)** is a special DC that holds a *partial, forest-wide* copy of every object, so a query like "find this user anywhere in the forest" or "what universal groups is this user in" can be answered from one place. In a single-domain forest the GC is almost free and you basically always have it on your DCs.

### FSMO roles

Most of AD is **multi-master**: you can change things on any DC and it replicates out. But five jobs *must* be single-master to avoid conflicts. These are the **FSMO (Flexible Single Master Operations)** roles. I'll cover them properly in §12 — for now, just know they exist and live on a specific DC.

### Sites and replication

DCs keep each other in sync by **replication**. **Sites** describe your physical network topology (subnets, links) so AD replicates efficiently and clients prefer a nearby DC. In a flat lab it's one site; I'll still look at it so the concept isn't abstract.

### Group Policy

**Group Policy** is how you push configuration and security settings to users and computers at scale — password rules, mapped drives, desktop lockdowns, security baselines. A **GPO (Group Policy Object)** is linked to a site, domain, or OU, and applies to everything underneath. This is *the* feature that makes managing 5 or 5,000 machines feel the same. It gets its own big section (§10).

### Mini-glossary to anchor section 1

| Term | One-line meaning |
| --- | --- |
| AD DS | The directory service role you install on a server |
| Domain Controller (DC) | A server running AD DS; holds a copy of the directory |
| Domain | One directory/security boundary (`ad.snowberry.lab`) |
| Forest | Top container; the real security boundary; shares schema + GC |
| OU  | A container *you* create to organize objects and target policy |
| DN  | An object's full path in the directory |
| Schema | The definition of allowed objects/attributes |
| LDAP | The protocol for reading/writing the directory |
| Global Catalog | Forest-wide partial index for cross-domain lookups |
| FSMO | Five single-master roles that can't be multi-master |
| GPO | A bundle of settings linked to a site/domain/OU |

---

## 2. Lab design and topology

### What I'm building

A small but realistic domain for a fictional company, **Snowberry Co.**, so the org structure (departments, groups, shares) has real meaning instead of `test1`, `test2`.

```
                      Internet (NAT, optional)
                            |
                      [ Proxmox host ]
                            |
                vmbr1  (isolated lab bridge, 10.10.10.0/24)
        ┌───────────────┬───────────────┬───────────────┐
        |               |               |               |
   [ DC01 ]        [ DC02 ]        [ FS01 ]        [ WS01 ]
 Win Server 2022  Win Server 2022 Win Server 2022  Win 11
 AD DS + DNS +    AD DS + DNS     File server      Domain client
 DHCP (1st DC)    (2nd DC)        (member server)  (member)
 10.10.10.10      10.10.10.11     10.10.10.20      DHCP
```

### VM inventory

| Name | OS  | Role | vCPU | RAM | Disk | IP  |
| --- | --- | --- | --- | --- | --- | --- |
| DC01 | Windows Server 2022 | First DC, DNS, DHCP | 2   | 4 GB | 60 GB | 10.10.10.10 (static) |
| DC02 | Windows Server 2022 | Second DC, DNS | 2   | 4 GB | 60 GB | 10.10.10.11 (static) |
| FS01 | Windows Server 2022 | Member file server | 2   | 4 GB | 60 GB | 10.10.10.20 (static) |
| WS01 | Windows 11 (or 10) | Domain-joined client | 2   | 4 GB | 60 GB | DHCP |

> You can do the whole core lab with just **DC01 + WS01** if RAM is tight. DC02 (replication) and FS01 (file services) are where it gets genuinely instructive, so add them when you can. On a 32 GB Proxmox host this all fits comfortably. Windows Server 2022/2025 behave identically for everything in this lab — I'm using 2022 because it's the most documented LTS.

### Network plan

| Setting | Value |
| --- | --- |
| Subnet | `10.10.10.0/24` |
| Gateway | `10.10.10.1` (your Proxmox bridge / NAT, optional) |
| Domain DNS servers | DC01 (`10.10.10.10`), later DC02 (`10.10.10.11`) |
| DHCP range | `10.10.10.100 – 10.10.10.200` |

### Naming conventions and why

- **DNS domain:** `ad.snowberry.lab`
    - I own `snowberry.social`, but I deliberately **do not** reuse a real, externally-resolvable domain for AD — that causes split-brain DNS headaches. I also avoid `.local` (deprecated, conflicts with mDNS/Bonjour). A dedicated, non-routable label like `ad.snowberry.lab` keeps lab DNS fully internal. Microsoft's modern guidance is "a subdomain of a domain you own" or a clearly internal name; `.lab` keeps it isolated and unambiguous.
- **NetBIOS domain:** `SNOWBERRY` (the short, legacy name you'll type as `SNOWBERRY\username`).
- **Hostnames:** role + number (`DC01`, `FS01`, `WS01`). Boring and greppable on purpose.

> **Why bother with conventions in a lab?** Because every command later references these names. Picking them deliberately now means I never have to guess "wait, is it `.local` or `.lab`" mid-script.

---

## 3. Build the VMs

I'm on Proxmox, so I'll give the Proxmox specifics and note the equivalents for Hyper-V / VirtualBox / VMware. If you already know how to install Windows Server, skim to §3.4.

### 3.1 Get the ISOs

1.  **Windows Server 2022 Evaluation ISO** — free 180-day eval from Microsoft's Evaluation Center. Perfect for a lab.
2.  **Windows 11 ISO** — from Microsoft's download page.
3.  **VirtIO drivers ISO** (`virtio-win.iso`) — Windows doesn't ship VirtIO disk/network drivers, and Proxmox's high-performance VirtIO devices need them during install.

Upload all three to your Proxmox storage (`Datacenter → Storage → ISO Images → Upload`).

### 3.2 Create an isolated lab bridge (recommended)

So lab traffic (especially DHCP, which I'm about to run) doesn't leak onto my home LAN:

1.  `Datacenter → <node> → System → Network → Create → Linux Bridge`.
2.  Name it `vmbr1`, leave it without a physical port (internal-only), no IP needed.
3.  Apply.

If you want the lab to reach the internet for Windows Updates, either give `vmbr1` an IP and set up NAT/masquerade on the host, or temporarily attach VMs to your normal bridge for patching, then move them back. For pure AD learning, fully isolated is fine.

### 3.3 Create a VM (DC01 as the example)

`Create VM`, then:

- **General:** Name `DC01`.
- **OS:** ISO = Windows Server 2022; Guest OS = Microsoft Windows 11/2022.
- **System:** Machine `q35`, BIOS `OVMF (UEFI)`, add an EFI disk, Qemu Agent ✅, SCSI Controller `VirtIO SCSI single`. (Add a TPM if you want to mirror modern hardware; not required for Server.)
- **Disks:** Bus `SCSI`, 60 GB, cache `Write back`, Discard ✅.
- **CPU:** 2 cores, type `host`.
- **Memory:** 4096 MB (uncheck ballooning for a DC if you like predictable RAM).
- **Network:** Bridge `vmbr1`, model `VirtIO (paravirtualized)`.
- Finish. **Before booting**, add a *second* CD/DVD drive pointing at `virtio-win.iso` (`Hardware → Add → CD/DVD Drive`).

> **Why VirtIO + an extra ISO?** VirtIO is the fast paravirtualized hardware. Windows setup won't see a VirtIO disk until you feed it the driver, so the second ISO is there for exactly that moment.

Clone this VM (or repeat) for **DC02** and **FS01**. Build **WS01** the same way with the Windows 11 ISO.

### 3.4 Install Windows Server

1.  Boot the VM, press a key to boot from the install ISO.
2.  Choose **Windows Server 2022 Standard (Desktop Experience)** — the GUI edition. (Core is leaner and great later, but learn with the GUI first.)
3.  At "Where do you want to install Windows?" the disk is **missing** — expected. Click **Load driver → Browse →** the VirtIO ISO → `vioscsi\2k22\amd64` → OK. The disk appears. Install.
4.  Set the local **Administrator** password (e.g. a strong lab password — I'll use `Sn0wberry!Lab2026` in examples; pick your own).

### 3.5 First-boot setup (do this on every Windows VM)

Install the **Qemu guest agent** from the VirtIO ISO (`guest-agent\qemu-ga-x86_64.msi`) so Proxmox can read IPs and shut down cleanly.

Then open **PowerShell as Administrator** and configure the basics. For **DC01**:

```powershell
# Rename the machine (reboots)
Rename-Computer -NewName "DC01" -Restart
```

After reboot, set the **static IP** (find your interface name with `Get-NetAdapter`):

```powershell
$if = "Ethernet"     # adjust to your adapter name
New-NetIPAddress -InterfaceAlias $if -IPAddress 10.10.10.10 `
  -PrefixLength 24 -DefaultGateway 10.10.10.1

# Point DNS at ITSELF — it's about to become the DNS server
Set-DnsClientServerAddress -InterfaceAlias $if -ServerAddresses 10.10.10.10
```

> **Why static, and why DNS at itself?** A DC must be reachable at a known address and must resolve its own AD DNS records. Pointing it at a router or public DNS is the #1 self-inflicted AD failure.

Repeat for **FS01** (`10.10.10.20`, DNS `10.10.10.10` — the DC) and rename it. Leave **DC02** for §12. Leave **WS01** on DHCP; it'll get its DNS automatically once DHCP is configured.

**Checkpoint ✅** — `ipconfig /all` on DC01 shows `10.10.10.10`, DNS server `10.10.10.10`, hostname `DC01`.

---

## 4. Promote the first Domain Controller

This is the moment a plain Windows Server becomes the foundation of a domain.

### 4.1 Install the AD DS role

On **DC01**, PowerShell as Admin:

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
```

This installs the directory service binaries and the management tools (ADUC, ADAC, GPMC). It does **not** create a domain yet — promotion is a separate step, which is good design: install now, configure deliberately.

### 4.2 Promote to a new forest

```powershell
Install-ADDSForest `
  -DomainName "ad.snowberry.lab" `
  -DomainNetbiosName "SNOWBERRY" `
  -InstallDns `
  -DomainMode "WinThreshold" `
  -ForestMode "WinThreshold" `
  -SafeModeAdministratorPassword (Read-Host "DSRM password" -AsSecureString) `
  -Force
```

What the flags mean:

- `-DomainName` / `-DomainNetbiosName` — the DNS and legacy short names I chose.
- `-InstallDns` — install and configure AD-integrated DNS on this DC (yes, always for the first DC).
- `-DomainMode` / `-ForestMode` `WinThreshold` — the **functional level** = Windows Server 2016 (the highest available; 2019/2022/2025 didn't add new levels). Functional level gates which AD features are available and the minimum DC OS allowed.
- `-SafeModeAdministratorPassword` — the **DSRM** (Directory Services Restore Mode) password, a special local recovery password used when booting a DC into recovery mode. Write it down; you'll need it in §14.

The server reboots and comes up as a Domain Controller.

### 4.3 What just happened (the part most tutorials skip)

Promotion created several things on disk and in DNS:

- **`NTDS.dit`** (`C:\Windows\NTDS\`) — the actual directory database file. *This is Active Directory.* Everything else is a process around it.
- **`SYSVOL`** (`C:\Windows\SYSVOL\`) — a replicated folder shared as `\\ad.snowberry.lab\SYSVOL` that holds Group Policy files and logon scripts. Every DC keeps an identical copy.
- **The `NETLOGON` and `SYSVOL` shares** — clients pull policy/scripts from here.
- **DNS zones**, including the critical `_msdcs.ad.snowberry.lab` zone full of **SRV records** so clients can *find* the DC.
- The built-in containers: `Users`, `Computers`, `Domain Controllers`, plus the default **Default Domain Policy** and **Default Domain Controllers Policy** GPOs.

### 4.4 Verify the DC is healthy

```powershell
# Domain facts
Get-ADDomain  | Select-Object DNSRoot, NetBIOSName, DomainMode, PDCEmulator
Get-ADForest  | Select-Object Name, ForestMode, GlobalCatalogs, SchemaMaster

# DNS SRV records exist? (these are what clients look up)
nltest /dsgetdc:ad.snowberry.lab

# Full health check — read it top to bottom
dcdiag /v
```

`dcdiag` will print a wall of tests. The ones to care about: **Connectivity, Advertising, DNS, Services, NetLogons, Replications, SysVolCheck** should all pass. A brand-new DC sometimes flags a couple of warnings that clear after replication/time settles; outright `failed` on those core tests means stop and fix before continuing.

**Checkpoint ✅** — `Get-ADDomain` returns `ad.snowberry.lab`, and `nltest /dsgetdc` names `DC01`. You have a domain.

---

## 5. DHCP so clients configure themselves

Not strictly "AD," but in real environments AD admins run DHCP, and it makes joining clients painless (they auto-receive an IP **and the correct DNS server**, which is the part that matters). Doing this on DC01:

```powershell
Install-WindowsFeature DHCP -IncludeManagementTools

# Authorize the DHCP server in AD (DHCP must be authorized to hand out leases on a domain)
Add-DhcpServerInDC -DnsName "DC01.ad.snowberry.lab" -IPAddress 10.10.10.10

# Create the scope
Add-DhcpServerv4Scope -Name "Lab-LAN" -StartRange 10.10.10.100 `
  -EndRange 10.10.10.200 -SubnetMask 255.255.255.0

# Hand out the gateway and — crucially — the DC as DNS, and the DNS suffix
Set-DhcpServerv4OptionValue -ScopeId 10.10.10.0 `
  -DnsServer 10.10.10.10 -DnsDomain "ad.snowberry.lab" -Router 10.10.10.1
```

> **Why "authorize in AD"?** AD intentionally refuses to let an *unauthorized* DHCP server lease addresses — a safety feature so a random server can't hijack your network's IP assignment. The `Add-DhcpServerInDC` step is that authorization.

**Checkpoint ✅** — `Get-DhcpServerv4Scope` shows `Lab-LAN`. WS01 will now boot and land on the lab network with DNS pointed at the DC.

---

## 6. Organizing the directory with OUs

A fresh domain dumps everything into default containers (`Users`, `Computers`). Those containers **can't have Group Policy linked to them and can't be deleted**, so the first real admin task is building an **Organizational Unit** structure that mirrors how I want to *manage and target policy*.

### Design philosophy

Design OUs for **administration and policy**, not to mimic the org chart for its own sake. Two patterns dominate:

- **By object type** (Users / Groups / Computers / Servers) — simple, great for small orgs.
- **By department, with type sub-OUs** — scales when different departments need different policy.

I'll use a hybrid that I find clean:

```
ad.snowberry.lab
└── Snowberry                (top-level OU — everything company-owned lives here)
    ├── Departments
    │   ├── IT
    │   ├── HR
    │   ├── Sales
    │   └── Engineering
    ├── Groups               (security groups)
    ├── ServiceAccounts      (non-human accounts)
    ├── Workstations         (domain-joined PCs land here)
    └── Servers              (member servers, e.g. FS01)
```

### Build it (PowerShell is faster and repeatable)

```powershell
$base = "DC=ad,DC=snowberry,DC=lab"

New-ADOrganizationalUnit -Name "Snowberry" -Path $base
$snow = "OU=Snowberry,$base"

New-ADOrganizationalUnit -Name "Departments"    -Path $snow
New-ADOrganizationalUnit -Name "Groups"         -Path $snow
New-ADOrganizationalUnit -Name "ServiceAccounts" -Path $snow
New-ADOrganizationalUnit -Name "Workstations"   -Path $snow
New-ADOrganizationalUnit -Name "Servers"        -Path $snow

$dept = "OU=Departments,$snow"
"IT","HR","Sales","Engineering" | ForEach-Object {
    New-ADOrganizationalUnit -Name $_ -Path $dept
}
```

> Notice **OUs are created with `New-ADOrganizationalUnit`, and the order in a DN is child-first**. The `-Path` is always the *parent's* DN. Reading DNs and building paths is the skill that makes the rest of AD scripting trivial.

By default, new OUs are created with **accidental-deletion protection** on — a checkbox that stops you from nuking an OU full of users with one slip. Leave it on.

### Redirect the default containers

So that machines you join and users you *forget* to place still land somewhere policy-able instead of the un-linkable default containers:

```cmd
redircmp "OU=Workstations,OU=Snowberry,DC=ad,DC=snowberry,DC=lab"
redirusr "OU=Snowberry,DC=ad,DC=snowberry,DC=lab"
```

`redircmp` redirects the default **Computers** container; `redirusr` redirects the default **Users** container.

**Checkpoint ✅** — Open **Active Directory Users and Computers** (`dsa.msc`), enable `View → Advanced Features`, and confirm the `Snowberry` OU tree exists.

---

## 7. Users

### Create one by hand first (to see every attribute)

In **ADUC**, right-click `Departments → IT → New → User`:

- **Full name:** `Preah Maple`
- **User logon name (UPN):** `pmaple@ad.snowberry.lab`
- **User logon name (pre-Windows 2000 / sAMAccountName):** `pmaple`
- Set a password, decide on "user must change password at next logon," create.

Then open the user and walk the tabs: `General` (name, email, description), `Account` (logon names, expiry, "account is disabled"), `Member Of` (group membership), `Profile` (home folder, logon script), `Organization` (manager, title). Every field here is just an LDAP attribute on the object.

> **The two logon names, demystified:**
> 
> - **UPN** (`pmaple@ad.snowberry.lab`) — modern, email-style, what users type today.
> - **sAMAccountName** (`SNOWBERRY\pmaple`) — the legacy short name, max 20 chars, still used everywhere under the hood. You almost always want these to match for sanity.

### Create users in bulk with PowerShell + CSV

This is the real skill — nobody hand-creates 50 users. Make `new-hires.csv`:

```csv
First,Last,SAM,Dept,Title
Preah,Maple,pmaple,IT,Systems Engineer
Xavier,Reed,xreed,Engineering,Software Engineer
Dana,Cho,dcho,HR,HR Generalist
Marcus,Vela,mvela,Sales,Account Executive
Ivy,Sorenson,isorenson,Engineering,Platform Engineer
```

Then:

```powershell
$domain = "ad.snowberry.lab"
$base   = "OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab"
$pw     = ConvertTo-SecureString "Welcome2Snowberry!" -AsPlainText -Force

Import-Csv .\new-hires.csv | ForEach-Object {
    $name = "$($_.First) $($_.Last)"
    New-ADUser `
      -Name              $name `
      -GivenName         $_.First `
      -Surname           $_.Last `
      -SamAccountName    $_.SAM `
      -UserPrincipalName "$($_.SAM)@$domain" `
      -Title             $_.Title `
      -Department        $_.Dept `
      -Path              "OU=$($_.Dept),$base" `
      -AccountPassword   $pw `
      -ChangePasswordAtLogon $true `
      -Enabled           $true
    Write-Host "Created $name in $($_.Dept)"
}
```

> **Why this is the moment AD "clicks":** the script puts each user in the OU matching their department by building the `-Path` from a CSV column. That's the directory's organizing logic expressed in three lines. From here, HR sends a spreadsheet and onboarding is a one-liner.

### Service accounts (non-human identities)

Apps and services need identities too. Create them in the `ServiceAccounts` OU, name them clearly (`svc-backup`, `svc-jira`), give them long random passwords, and **only the rights they need**.

```powershell
New-ADUser -Name "svc-backup" -SamAccountName "svc-backup" `
  -UserPrincipalName "svc-backup@ad.snowberry.lab" `
  -Path "OU=ServiceAccounts,OU=Snowberry,DC=ad,DC=snowberry,DC=lab" `
  -AccountPassword (ConvertTo-SecureString "a-long-random-passphrase" -AsPlainText -Force) `
  -PasswordNeverExpires $true -Enabled $true
```

> **Worth knowing for later:** modern AD prefers **Group Managed Service Accounts (gMSA)**, where AD rotates the password automatically and you never store it. Overkill for first-day learning, but the right answer in production. File it away.

**Checkpoint ✅** — `Get-ADUser -Filter * -SearchBase "OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab" | Select Name, Department` lists your hires in the right OUs.

---

## 8. Groups (and how to think about them)

Groups are where people get permissions wrong, so I want the model crisp before I create any.

### Two categories

- **Security groups** — can be assigned permissions (to files, shares, etc.) and used for logon rights. This is what you almost always want.
- **Distribution groups** — email lists only (used by Exchange), no permissions. Ignore unless you run mail.

### Three scopes (this is the part everyone fumbles)

| Scope | Can contain | Can be used to grant access | Use it for |
| --- | --- | --- | --- |
| **Global** | Accounts + global groups from **its own domain** | Anywhere in the forest | Grouping **people by role/department** |
| **Domain Local** | Accounts/global/universal from **any** domain | Only in **its own domain** | Granting access to **a specific resource** |
| **Universal** | Accounts/global/universal from **any** domain | Anywhere in the forest | Cross-domain grouping in multi-domain forests |

### AGDLP — the rule that makes it all sane

The Microsoft strategy, memorize it as a chant:

> **A**ccounts go into **G**lobal groups → Global groups go into **D**omain **L**ocal groups → Domain Local groups get **P**ermissions.

You **never** put a user directly on a folder. You put users in a *role* group (Global), nest that into a *resource* group (Domain Local), and only the Domain Local group touches the permission. Then re-orgs and access reviews become "change group membership," never "re-walk every ACL."

### Build it

Role/department groups (**Global**) — who someone *is*:

```powershell
$groups = "OU=Groups,OU=Snowberry,DC=ad,DC=snowberry,DC=lab"

"IT","HR","Sales","Engineering" | ForEach-Object {
    New-ADGroup -Name "GG-Dept-$_" -GroupScope Global `
      -GroupCategory Security -Path $groups `
      -Description "All members of the $_ department"
}

# Put people in their role group
Add-ADGroupMember -Identity "GG-Dept-Engineering" -Members xreed,isorenson
Add-ADGroupMember -Identity "GG-Dept-IT"          -Members pmaple
Add-ADGroupMember -Identity "GG-Dept-HR"          -Members dcho
Add-ADGroupMember -Identity "GG-Dept-Sales"       -Members mvela
```

Resource groups (**Domain Local**) — what someone can *touch*. I'll make these now and wire them to an actual share in §11:

```powershell
"Engineering-Share-RW","Engineering-Share-RO","HR-Share-RW" | ForEach-Object {
    New-ADGroup -Name "DL-$_" -GroupScope DomainLocal `
      -GroupCategory Security -Path $groups -Description "Resource access: $_"
}

# Nest the ROLE group into the RESOURCE group (the "G into DL" step)
Add-ADGroupMember -Identity "DL-Engineering-Share-RW" -Members "GG-Dept-Engineering"
Add-ADGroupMember -Identity "DL-HR-Share-RW"          -Members "GG-Dept-HR"
```

> Naming convention used here: `GG-` = global group, `DL-` = domain local. So a year from now I can read an ACL and instantly know "that's a resource group, its members are role groups." Self-documenting.

**Checkpoint ✅** — `Get-ADGroupMember "DL-Engineering-Share-RW"` shows the `GG-Dept-Engineering` group nested inside (not individual users). That nesting *is* AGDLP working.

---

## 9. Join a client to the domain

Now the payoff: a workstation that authenticates against the domain.

### Point DNS, then join

On **WS01**, the only prerequisite is that its DNS points at the DC. If WS01 is on DHCP from §5, it already does — verify with `ipconfig /all` (DNS should be `10.10.10.10`). If static, set it manually.

Join via PowerShell (or `sysdm.cpl → Change → Domain`):

```powershell
Add-Computer -DomainName "ad.snowberry.lab" `
  -Credential (Get-Credential SNOWBERRY\Administrator) -Restart
```

Enter the domain admin creds when prompted; the machine reboots.

### What a "domain join" actually creates

The join creates a **computer object** in AD (it lands in your `Workstations` OU thanks to `redircmp`) and establishes a **secure channel** — a machine account password the computer and DC use to trust each other. The computer is now a first-class directory object that can receive Group Policy and Kerberos tickets, exactly like a user.

### First domain logon

At the WS01 login screen, switch to "Other user" and log in as `pmaple@ad.snowberry.lab` (password `Welcome2Snowberry!`, then set a new one since I flagged change-at-logon). A fresh profile builds. **You're now logged into a Windows machine using an identity that lives on a different server.** That's the whole point of a domain.

### Install RSAT on the client (so you manage AD without RDP'ing the DC)

```powershell
Add-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0"
Add-WindowsCapability -Online -Name "Rsat.GroupPolicy.Management.Tools~~~~0.0.1.0"
```

Now `dsa.msc` and `gpmc.msc` run from the workstation — which is how real admins work (you don't sit on the DC all day).

**Checkpoint ✅** — In ADUC, the `Workstations` OU contains a `WS01` computer object, and `pmaple` can log into WS01.

---

## 10. Group Policy — the real power of AD

If users and groups are *who*, Group Policy is *how the environment behaves*. This is the largest section because it's the feature that makes AD worth running.

### How a GPO finds its way to a machine

A GPO is **linked** to a **Site, Domain, or OU**, and applies to all users/computers beneath that link. Processing order — later wins on conflict — is **L → S → D → OU** ("**L**ocal, **S**ite, **D**omain, **O**U"), and within nested OUs, the **closest OU to the object wins**. Memorize **LSDOU**.

Layered on top:

- **Inheritance** — child OUs inherit links from parents by default.
- **Block Inheritance** — an OU can refuse inherited GPOs.
- **Enforced** — a link can force itself through `Block Inheritance` and win regardless of order.
- **Security Filtering** — restrict a GPO to specific users/groups (default is "Authenticated Users" = everyone).
- **Loopback** — apply *user* settings based on the *computer's* location (used for kiosks/RDS).

> **The single sentence that prevents most GPO confusion:** a GPO does nothing until it's **linked**, and it only affects objects **below the link**. "I created a GPO and nothing happened" is almost always "you didn't link it where the objects live."

### 10.1 Password and lockout policy

This one's special: account-wide password rules come from the **Default Domain Policy** linked at the *domain root* (one of AD's few "must be set at the domain level" things).

Open **Group Policy Management** (`gpmc.msc`) → expand the domain → right-click **Default Domain Policy → Edit**:

`Computer Configuration → Policies → Windows Settings → Security Settings → Account Policies → Password Policy`

Set lab-reasonable values: minimum length 14, complexity enabled, max age 0 or 90 days. Under **Account Lockout Policy**, set threshold to 5 bad attempts, duration 15 min.

> **Need different rules for, say, service accounts or admins?** Domain-wide policy is one-size-fits-all, so AD added **Fine-Grained Password Policies (PSOs)**, configured in **Active Directory Administrative Center** (`dsac.exe → System → Password Settings Container`). You make a PSO and apply it to a group. Good to know exists; the Default Domain Policy covers the basics.

### 10.2 Map a network drive for everyone (Group Policy Preferences)

A genuinely useful, everyday GPO. I'll map a drive for Engineering (the share itself comes in §11; the GPO is ready to go):

1.  In GPMC, right-click the **Departments → Engineering** OU → **Create a GPO in this domain, and Link it here** → name it `Drive Map - Engineering`.
2.  Edit it → `User Configuration → Preferences → Windows Settings → Drive Maps → New → Mapped Drive`.
3.  Action `Create`, Location `\\FS01\Engineering`, Drive Letter `E:`, label "Engineering". Optionally on the `Common` tab, **Item-level targeting** → only if member of `GG-Dept-Engineering`.

> **Why Preferences instead of a logon script?** GPP drive maps are declarative, targetable, and don't require maintaining `.bat` files. The old `net use` logon script still works, but Preferences are the modern way.

### 10.3 A user-experience policy (see GPO on the user side)

Make a `Desktop Standard` GPO linked to `Snowberry` and set something visible, e.g. `User Configuration → Policies → Administrative Templates → Desktop → Desktop Wallpaper`, or hide the "Run" command / restrict Control Panel. Pick anything you'll *notice* — the goal is to watch policy change a real machine.

### 10.4 Prove precedence with a deliberate conflict

This is the exercise that makes LSDOU real:

1.  In the **Default Domain Policy** (domain level) set a wallpaper to image A.
2.  In a GPO linked to `Departments → Engineering` set wallpaper to image B.
3.  Log into WS01 as `xreed` (who lives in Engineering) → wallpaper is **B**. The closer OU link won.
4.  Now mark the **domain-level** link **Enforced** → log in again → wallpaper flips to **A**. Enforced overrides the closer link.

You just watched the entire precedence model with your own eyes. That's worth more than any diagram.

### 10.5 Apply and inspect

```cmd
gpupdate /force            ::  pull policy now instead of waiting ~90 min
gpresult /r                ::  which GPOs applied to me, in what order
gpresult /h report.html    ::  full HTML report — read the "Denied" and "winning GPO" columns
```

> **Troubleshooting GPO, the short list:** (1) Is the GPO **linked** above the object? (2) Is the object in the right **OU**? (3) **Security filtering** — is the object actually in the allowed group? (4) **User vs Computer** settings linked at the right kind of object? (5) `gpresult /h` will literally tell you the winning and denied GPOs. Ninety percent of "GPO not applying" is one of these five.

**Checkpoint ✅** — `gpresult /r` on WS01 (as an Engineering user) lists `Drive Map - Engineering` and `Desktop Standard` under Applied Group Policy Objects.

---

## 11. File services — a concrete reason AD exists

Time to give those §8 groups a real resource and close the AGDLP loop end to end.

### 11.1 Create the share on FS01

FS01 is a member server (joined to the domain — join it now with the §9 steps if you haven't). On FS01, PowerShell as Admin:

```powershell
# Create the folder and an SMB share
New-Item -Path "D:\Shares\Engineering" -ItemType Directory -Force
New-SmbShare -Name "Engineering" -Path "D:\Shares\Engineering" -FullAccess "Authenticated Users"
```

> **Two permission layers, and why both exist:** **Share permissions** gate access over the network; **NTFS permissions** gate access to the files themselves (and apply locally too). Best practice: set **Share = broad** (`Authenticated Users: Full`) and do the *real* control with **NTFS**. That way you reason about access in exactly one place.

### 11.2 Set NTFS permissions using the Domain Local groups

This is the **P** in AGDLP — and notice the share's ACL only ever references the `DL-` resource groups, never a person:

```powershell
$path = "D:\Shares\Engineering"
$acl  = Get-Acl $path

# Read/Write for the RW resource group
$rw = New-Object System.Security.AccessControl.FileSystemAccessRule(
  "SNOWBERRY\DL-Engineering-Share-RW","Modify",
  "ContainerInherit,ObjectInherit","None","Allow")

# Read-only for the RO resource group
$ro = New-Object System.Security.AccessControl.FileSystemAccessRule(
  "SNOWBERRY\DL-Engineering-Share-RO","ReadAndExecute",
  "ContainerInherit,ObjectInherit","None","Allow")

$acl.AddAccessRule($rw)
$acl.AddAccessRule($ro)
Set-Acl $path $acl
```

The full chain now reads: `xreed` (Account) → `GG-Dept-Engineering` (Global) → `DL-Engineering-Share-RW` (Domain Local) → **Modify on the folder** (Permission). **AGDLP, completed, in production form.**

### 11.3 Test it as a real user

Log into WS01 as `xreed`. The `E:` drive should already be mapped (§10.2) to `\\FS01\Engineering`. Create a file — it works (RW). Now log in as `dcho` (HR, not in the Engineering chain) and try to reach `\\FS01\Engineering` — access denied. **You just proved that identity → group → resource → permission flows correctly.** Change `xreed`'s access by moving them between `GG-` groups and nothing on FS01 needs touching. That's the whole reason for the ceremony.

**Checkpoint ✅** — Engineering members can write to `E:`; non-members are denied; you never put a username on the folder ACL.

---

## 12. Infrastructure roles: FSMO, GC, replication, sites

A domain with one DC is a single point of failure and hides half of how AD works. Adding DC02 unlocks replication and lets me explore the roles that keep a multi-DC AD consistent.

### 12.1 The five FSMO roles

Most changes can happen on any DC and replicate (multi-master). Five operations can't tolerate conflicts, so exactly one DC "owns" each at a time:

| Role | Scope | What it does |
| --- | --- | --- |
| **Schema Master** | Forest | Only DC that can change the schema |
| **Domain Naming Master** | Forest | Adds/removes domains in the forest |
| **RID Master** | Domain | Hands out pools of RIDs so every SID is unique |
| **PDC Emulator** | Domain | Time source for the domain, password-change priority, lockout processing, default GPO target |
| **Infrastructure Master** | Domain | Keeps cross-domain object references current |

See who holds them:

```powershell
netdom query fsmo
# or, more granular:
Get-ADForest | Select SchemaMaster, DomainNamingMaster
Get-ADDomain | Select PDCEmulator, RIDMaster, InfrastructureMaster
```

On a fresh single-DC domain, **DC01 holds all five.** That's normal; you only split or move them as you grow.

> **The one to care about most day-to-day is the PDC Emulator** — it's the authoritative time source. Configure *it* to sync time from a reliable external NTP source, and the whole domain inherits good time, which keeps Kerberos happy. In an isolated lab, the PDC's own clock is fine as long as everything chains to it.

### 12.2 Add a second Domain Controller

On **DC02** (renamed, static `10.10.10.11`, **DNS pointed at DC01 `10.10.10.10`** so it can find the domain to join):

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools

Install-ADDSDomainController `
  -DomainName "ad.snowberry.lab" `
  -InstallDns `
  -Credential (Get-Credential SNOWBERRY\Administrator) `
  -SafeModeAdministratorPassword (Read-Host "DSRM password" -AsSecureString) `
  -Force
```

This promotes DC02 *into the existing domain* (note: `Install-ADDSDomainController`, not `...Forest`). It pulls a full copy of `NTDS.dit`, becomes a DNS server and Global Catalog, and starts replicating. After reboot, set DC02's DNS to point at *itself first, DC01 second* (and update DC01 to point at DC02 second) so neither DC depends solely on the other for DNS.

### 12.3 Watch replication actually happen

```powershell
repadmin /replsummary       # health summary across all DCs — want 0 failures
repadmin /showrepl          # detailed inbound replication status on this DC
```

Now the satisfying demo:

1.  On **DC01**, create a test user: `New-ADUser -Name "repltest" -Path "OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab" -Enabled $true`.
2.  Force replication: `repadmin /syncall /AdeP`.
3.  On **DC02**: `Get-ADUser repltest` — it's there.

You created an object on one server and it appeared on another with no manual copy. **That's multi-master replication, the heart of AD's resilience.** Clean up with `Remove-ADUser repltest`.

### 12.4 Transferring an FSMO role (gracefully)

When you decommission a DC or rebalance, you *transfer* roles (graceful, both DCs online). You only **seize** them if the holder is permanently dead.

```powershell
# Move the PDC Emulator from DC01 to DC02, as an example
Move-ADDirectoryServerOperationMasterRole -Identity "DC02" -OperationMasterRole PDCEmulator
```

> **Transfer vs seize:** transfer = handshake between two live DCs (safe, do this normally). Seize = "the old holder is gone forever, force it" — and you must **never** bring the old holder back online afterward. Knowing the difference is a classic interview/exam point and a real operational footgun.

### 12.5 Sites and Services (the concept, briefly)

`dssite.msc` shows **AD Sites and Services**. A **site** is a set of well-connected IP subnets; **site links** describe slower connections between sites. AD uses this so clients authenticate against a *nearby* DC and so replication between distant DCs is scheduled efficiently. In a flat lab everything's in `Default-First-Site-Name`, which is fine. The thing to internalize: in the real world you create sites and **associate subnets** with them so a branch-office laptop doesn't authenticate across the country.

**Checkpoint ✅** — `repadmin /replsummary` shows DC01 and DC02 with 0 failures, and an object made on one DC appears on the other.

---

## 13. Daily operations runbook

The boring-but-essential stuff that *is* the job. GUI is in ADUC; I'm listing PowerShell because it's faster and scriptable.

```powershell
# Reset a password (and force change at next logon)
Set-ADAccountPassword -Identity pmaple -Reset `
  -NewPassword (ConvertTo-SecureString "Temp-Pass-2026!" -AsPlainText -Force)
Set-ADUser pmaple -ChangePasswordAtLogon $true

# Unlock a locked-out account
Unlock-ADAccount -Identity pmaple
Search-ADAccount -LockedOut          # find everyone currently locked out

# Disable / enable (disable on offboarding before you delete)
Disable-ADAccount -Identity mvela
Enable-ADAccount  -Identity mvela

# Move an object to a new OU (e.g., department transfer)
Get-ADUser dcho | Move-ADObject -TargetPath "OU=IT,OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab"

# Find things
Get-ADUser -Filter "Department -eq 'Engineering'" -Properties Department | Select Name, Department
Get-ADUser pmaple -Properties MemberOf | Select -Expand MemberOf      # this user's groups
Get-ADGroupMember "GG-Dept-Engineering"                                # this group's members

# Last logon / stale accounts (uses replicated approximate timestamp)
Get-ADUser -Filter * -Properties LastLogonTimestamp |
  Select Name, @{N="LastLogon";E={[datetime]::FromFileTime($_.LastLogonTimestamp)}} |
  Sort LastLogon

# Account info at a glance
Get-ADUser pmaple -Properties * | Select Name, Enabled, LockedOut, PasswordLastSet, whenCreated
```

> **Offboarding order that won't bite you:** **disable** the account → move it to a holding OU → remove from groups (keep a record) → **after a retention window**, delete. Deleting immediately destroys the SID, which can orphan file ownership and break audits. Disable-first is the professional reflex.

---

## 14. Backup and recovery

A directory you can't restore is a liability. Two layers: back up the DC's **System State**, and enable the **AD Recycle Bin** for the everyday "oops I deleted a user" case.

### 14.1 System State backup (the real DR copy)

On a DC, install Windows Server Backup and capture **System State** (which includes `NTDS.dit`, SYSVOL, registry, and the boot files needed to actually recover a DC):

```powershell
Install-WindowsFeature Windows-Server-Backup
# Back up system state to another volume (E:) — never the system drive
wbadmin start systemstatebackup -backupTarget:E: -quiet
```

> **Why System State and not just "copy the .dit"?** A DC restore must be consistent across the database, SYSVOL, and registry, and it must mark the restore correctly so it doesn't re-introduce already-deleted objects when it rejoins replication. System State backup is the supported, consistent unit.

### 14.2 Restoring: authoritative vs non-authoritative (the concept)

- **Non-authoritative restore:** bring a failed DC back from backup; it then *receives* newer changes from healthy DCs via replication. This is the normal "rebuild one dead DC" path.
- **Authoritative restore:** you deleted something on *all* DCs and need to force the restored copy to win and replicate *outward*. Done by booting into **DSRM** (using that DSRM password from §4.2) and marking specific objects authoritative with `ntdsutil`.

You don't need to perform an authoritative restore in the lab to understand it — but know the words, because in a real incident the difference between these two is the difference between fixing it and making it worse.

### 14.3 AD Recycle Bin (the everyday lifesaver)

For "someone deleted a user, undo it" — far easier than a System State restore. Enable it once (forest-wide, irreversible-but-good):

```powershell
Enable-ADOptionalFeature 'Recycle Bin Feature' `
  -Scope ForestOrConfigurationSet `
  -Target "ad.snowberry.lab"
```

Now demo a real recovery:

```powershell
# 1) Create then "accidentally" delete a user
New-ADUser -Name "oops-user" -Path "OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab" -Enabled $true
Remove-ADUser "oops-user" -Confirm:$false

# 2) Find it in the Recycle Bin and restore it — attributes intact
Get-ADObject -Filter 'Name -like "*oops-user*"' -IncludeDeletedObjects |
  Restore-ADObject

# 3) Confirm
Get-ADUser "oops-user"
```

> Without the Recycle Bin, a deleted object becomes a stripped "tombstone" and you'd be doing an authoritative restore. With it on, recovery is one cmdlet and the object comes back with its group memberships and attributes. Enable it on day one, every time.

**Checkpoint ✅** — You restored `oops-user` from the Recycle Bin and System State backup completed to `E:`.

---

## 15. Health and troubleshooting toolkit

The five commands that diagnose ~90% of AD problems, and what each is *for*:

```cmd
dcdiag /v                         :: overall DC health; read Connectivity/DNS/Replications/Services
dcdiag /test:dns /v               :: focused DNS health (the usual culprit)
repadmin /replsummary             :: replication health across all DCs (want 0 failures)
repadmin /showrepl                :: detailed inbound replication on this DC
nltest /dsgetdc:ad.snowberry.lab  :: "can a client find and bind to a DC?"
w32tm /query /status              :: time sync (Kerberos breaks if clocks drift >5 min)
gpresult /h report.html           :: which GPOs applied/were denied for this user+computer
```

**The two-question triage I run before anything else:**

1.  **Is DNS correct?** Every member (and DC) must point at a DC for DNS. `ipconfig /all` first, always.
2.  **Is time correct?** Within 5 minutes of the PDC Emulator, or Kerberos refuses tickets. `w32tm /query /status`.

An astonishing share of "AD is broken" reports are one of those two. Check them reflexively before you go deeper.

---

## 16. Capstone: onboard a new hire end to end

This single scenario exercises everything above. If I can do this start to finish without notes, I understand AD well enough to use it.

**Scenario:** Engineering hires **Robin Hale**. They need an account, the right access, a workstation, and their mapped drive — all via the structures I built.

```powershell
# 1) Create the user in the correct department OU
New-ADUser -Name "Robin Hale" -GivenName Robin -Surname Hale `
  -SamAccountName rhale -UserPrincipalName "rhale@ad.snowberry.lab" `
  -Title "Platform Engineer" -Department "Engineering" `
  -Path "OU=Engineering,OU=Departments,OU=Snowberry,DC=ad,DC=snowberry,DC=lab" `
  -AccountPassword (ConvertTo-SecureString "Welcome2Snowberry!" -AsPlainText -Force) `
  -ChangePasswordAtLogon $true -Enabled $true

# 2) Add to the ROLE (global) group — this alone grants share access via AGDLP
Add-ADGroupMember -Identity "GG-Dept-Engineering" -Members rhale
```

Then, *without any further per-user configuration*:

3.  Robin logs into **WS01** as `rhale@ad.snowberry.lab` — Kerberos authenticates against the DC (§4, §9).
4.  Group Policy applies: `Drive Map - Engineering` maps `E:` to `\\FS01\Engineering`, and `Desktop Standard` sets the environment (§10).
5.  Robin opens `E:` and can read/write — because `rhale` → `GG-Dept-Engineering` → `DL-Engineering-Share-RW` → Modify on FS01 (§8, §11). **No one touched the file server.**
6.  The whole thing replicated to DC02 the moment the account was created (§12), so Robin could authenticate even if DC01 were down.

That's the entire system working as one machine: **identity, organization, policy, resources, and resilience** — from a two-line onboarding. When a re-org moves Robin to IT, I move the user object and swap their `GG-` group; access, drives, and policy all follow automatically.

**Final checkpoint ✅** — A brand-new user, added only to one role group, logs in on a workstation and lands with the right drives, desktop, and file access, on a domain that survives a DC outage. That's a working understanding of Active Directory.

---

## 17. Teardown, snapshots, and next steps

### Snapshot before you experiment

On Proxmox, snapshot each VM at the "healthy domain" state (`qm snapshot DC01 clean-domain`). When you inevitably break something exploring, roll back in seconds instead of rebuilding. Snapshot DCs **at the same time** when possible so replication state stays consistent on rollback.

### Where to go from here (still AD-focused)

- **Certificate Services (AD CS):** issue certs from the domain — underpins LDAPS, smart cards, 802.1X.
- **Group Managed Service Accounts (gMSA):** auto-rotated service identities; do the §7 service account "the right way."
- **Read-Only Domain Controllers (RODC):** branch-office DCs that hold no cached secrets by default.
- **Trusts:** stand up a second forest and build a trust to see cross-forest auth.
- **AD-integrated DNS depth:** conditional forwarders, secure dynamic updates, scavenging.
- **Server Core DCs:** rebuild DC02 on Core and manage it entirely remotely — the production norm.
- **Then,** layer your security/detection work on top — now you'll know exactly what "normal" looks like, which is what makes the attack/detection side meaningful.

### One-line teardown

When you're done, demote DCs gracefully (`Uninstall-ADDSDomainController`) rather than just deleting VMs, so you've practiced the clean exit too — then delete the snapshots and VMs.

---

## 18. Appendix: glossary and command reference

### Glossary

| Term | Meaning |
| --- | --- |
| **AD DS** | Active Directory Domain Services — the directory role |
| **DC** | Domain Controller — server running AD DS |
| **NTDS.dit** | The directory database file; the literal "Active Directory" |
| **SYSVOL** | Replicated share holding GPOs and scripts |
| **Forest / Domain / OU** | Security boundary / admin boundary / org container you create |
| **DN / CN / OU / DC** | Distinguished Name and its components |
| **UPN / sAMAccountName** | Modern email-style logon / legacy short logon |
| **GPO** | Group Policy Object — settings linked to site/domain/OU |
| **LSDOU** | GPO processing order: Local, Site, Domain, OU |
| **AGDLP** | Accounts→Global→Domain Local→Permissions (group strategy) |
| **FSMO** | Five single-master roles (Schema, Naming, RID, PDC, Infra) |
| **Global Catalog** | Forest-wide partial index for cross-domain lookups |
| **Site** | A set of well-connected subnets, for DC locality/replication |
| **DSRM** | Directory Services Restore Mode — DC recovery boot + its password |
| **PSO** | Fine-Grained Password Policy applied to a group |
| **gMSA** | Group Managed Service Account — auto-rotated service identity |

### Command quick reference

```powershell
# --- Build ---
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
Install-ADDSForest -DomainName ad.snowberry.lab -DomainNetbiosName SNOWBERRY -InstallDns
Install-ADDSDomainController -DomainName ad.snowberry.lab -InstallDns -Credential (Get-Credential)

# --- Organize ---
New-ADOrganizationalUnit -Name "Snowberry" -Path "DC=ad,DC=snowberry,DC=lab"
redircmp "OU=Workstations,OU=Snowberry,DC=ad,DC=snowberry,DC=lab"
redirusr "OU=Snowberry,DC=ad,DC=snowberry,DC=lab"

# --- Users & groups ---
New-ADUser ... ; Import-Csv | New-ADUser ...
New-ADGroup -GroupScope Global|DomainLocal -GroupCategory Security
Add-ADGroupMember -Identity <group> -Members <user|group>

# --- Join & policy ---
Add-Computer -DomainName ad.snowberry.lab -Credential (Get-Credential) -Restart
gpupdate /force ; gpresult /r ; gpresult /h report.html

# --- Operate ---
Set-ADAccountPassword -Reset ; Unlock-ADAccount ; Disable-ADAccount
Move-ADObject ; Search-ADAccount -LockedOut ; Get-ADGroupMember <g>

# --- Roles & replication ---
netdom query fsmo ; Get-ADForest ; Get-ADDomain
repadmin /replsummary ; repadmin /showrepl ; repadmin /syncall /AdeP
Move-ADDirectoryServerOperationMasterRole -Identity DC02 -OperationMasterRole PDCEmulator

# --- Backup & recover ---
wbadmin start systemstatebackup -backupTarget:E:
Enable-ADOptionalFeature 'Recycle Bin Feature' -Scope ForestOrConfigurationSet -Target ad.snowberry.lab
Get-ADObject -Filter '...' -IncludeDeletedObjects | Restore-ADObject

# --- Health ---
dcdiag /v ; dcdiag /test:dns ; nltest /dsgetdc:ad.snowberry.lab ; w32tm /query /status
```

---

*End of lab. If I can rebuild this from the section headers alone — concept, build, organize, users, groups, join, policy, files, replication, operate, recover, troubleshoot — then I actually understand Active Directory, not just the clicks.*