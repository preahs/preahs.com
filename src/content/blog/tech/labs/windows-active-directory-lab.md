---
title: "Windows Active Directory Lab: A Complete Walkthrough"
description: "A hands-on lab guide covering everything from spinning up your first domain controller to Group Policy, DNS, DHCP, PowerShell administration, and beyond."
date: 2026-06-09T09:00:00
category: tech/labs
toc: true
---

Active Directory is the backbone of most enterprise Windows environments. If you work in IT, security, or sysadmin, understanding it isn't optional — it's the prerequisite for almost everything else. This lab walks you through building a real AD environment from scratch and teaches you how it actually works along the way.

You don't need enterprise hardware. Everything here runs comfortably on a single machine using free hypervisors and evaluation copies of Windows Server.

---

## What We're Building

By the end of this lab you'll have a working Active Directory domain with:

- A **Domain Controller** running Windows Server 2022
- Two **client machines** joined to the domain (Windows 10/11)
- A structured **OU hierarchy**
- **Users and security groups**
- **Group Policy Objects** that apply real configuration
- A fully functional **DNS and DHCP** setup
- PowerShell scripts for common admin tasks
- An understanding of **FSMO roles**, **replication**, and **auditing**

---

## Lab Requirements

**Hypervisor** — pick one you're comfortable with:
- [VirtualBox](https://www.virtualbox.org/) (free, runs on Windows/Mac/Linux)
- [VMware Workstation Pro](https://www.vmware.com/products/desktop-hypervisor.html) (free for personal use since 2024)
- [Hyper-V](https://learn.microsoft.com/en-us/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v) (built into Windows 10/11 Pro)
- Proxmox on a homelab node if you have one

**ISOs needed:**
- [Windows Server 2022 Evaluation](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2022) (180-day free trial, no key required)
- [Windows 11 Evaluation](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise) or Windows 10 ISO

**Host machine specs (minimum):**
- 16 GB RAM (you'll allocate ~10–12 GB across three VMs)
- 100 GB free disk space
- A CPU with hardware virtualization enabled (Intel VT-x / AMD-V — check BIOS if VMs won't start)

---

## VM Layout

| VM Name       | OS                      | RAM  | Disk | Role            |
|---------------|-------------------------|------|------|-----------------|
| `DC01`        | Windows Server 2022     | 4 GB | 60 GB | Domain Controller, DNS, DHCP |
| `WKSTN01`     | Windows 11 Enterprise   | 3 GB | 40 GB | Domain-joined workstation |
| `WKSTN02`     | Windows 10/11 Enterprise | 3 GB | 40 GB | Domain-joined workstation |

Create a **host-only or internal network** in your hypervisor so all three VMs share the same subnet. This keeps them isolated from your home network while still letting them talk to each other.

Suggested subnet: `192.168.10.0/24`

---

## Part 1: Installing Windows Server 2022

### 1.1 Create the DC01 VM

In your hypervisor:

1. Create a new VM — **Windows Server 2022** as the guest OS type
2. Assign **4 GB RAM**, **2 vCPUs**, **60 GB disk**
3. Attach the Windows Server 2022 evaluation ISO
4. Set the NIC to your internal/host-only network

### 1.2 Install Windows Server

Boot the VM. The installer is straightforward — the only choice that matters:

> **Select the edition:** Choose **Windows Server 2022 Standard (Desktop Experience)**. The non-"Desktop Experience" option is Server Core (command-line only). It's leaner and great to learn eventually, but start with the GUI so you can see what you're doing.

Complete the install. Set the Administrator password to something you'll remember — use `P@ssw0rd123!` for this lab (never do this in production).

### 1.3 Initial Server Config

After first login, Server Manager opens automatically. Before doing anything else:

**Set a static IP.** Open Network Settings → Change adapter options → Properties on the NIC → IPv4:

```
IP Address:     192.168.10.10
Subnet Mask:    255.255.255.0
Default Gateway: 192.168.10.1
DNS Server:     127.0.0.1
```

The DC will be its own DNS server once AD is installed, so pointing DNS at `127.0.0.1` (loopback) is correct.

**Rename the computer.** Open Settings → System → About → Rename this PC → `DC01`. Restart when prompted.

> [!NOTE]
> Renaming after promoting to a Domain Controller is a pain. Always rename *before* you run the AD setup wizard.

---

## Part 2: Promoting DC01 to a Domain Controller

This is where Active Directory actually gets installed. We're going to:

1. Install the AD DS role
2. Promote the server to a Domain Controller
3. Create a new forest and domain

### 2.1 Install the AD DS Role

Open **Server Manager → Manage → Add Roles and Features**:

1. Role-based installation → select DC01
2. Under **Server Roles**, check **Active Directory Domain Services**
3. Accept the additional features it wants to install (RSAT tools, etc.)
4. Click through to **Install** — don't close the wizard yet

When it finishes, you'll see a yellow warning flag in Server Manager that says *"Configuration required for Active Directory Domain Services."* Click it → **Promote this server to a domain controller**.

### 2.2 The AD DS Configuration Wizard

This wizard is where you define your domain. Go through it carefully:

**Deployment Configuration:**
- Select **Add a new forest** (we're starting from scratch)
- Root domain name: `lab.local`

> [!NOTE]
> Using `.local` is fine for an isolated lab. In production, best practice is to use a subdomain of a real registered domain you own (e.g., `corp.yourdomain.com`) to avoid split-DNS problems. You'll also see `.lan` and `.internal` used — they all have the same problem in real environments.

**Domain Controller Options:**
- Forest functional level: **Windows Server 2016** (leave default — covers all modern features)
- Domain functional level: **Windows Server 2016**
- DNS Server: checked ✓
- Global Catalog: checked ✓
- Directory Services Restore Mode (DSRM) password: set this — use `DSRMp@ss123!` for the lab

**DNS Options / Additional Options / Paths:**
- Leave defaults. The NetBIOS name will auto-fill as `LAB`.

**Review + Install:**
- The wizard will run a prerequisites check. You may see warnings — yellow is fine, red blocks the install.
- Click **Install**. The server will automatically restart.

### 2.3 Verify the Domain

After reboot, log in as `LAB\Administrator` (domain admin, not local admin). The login screen now shows the domain.

Open **Active Directory Users and Computers** (ADUC) — Start menu → Windows Administrative Tools, or run `dsa.msc`.

You should see the `lab.local` domain tree with default containers:
- `Builtin` — built-in local groups
- `Computers` — default landing zone for joined machines
- `Domain Controllers` — your DC01 is here
- `ForeignSecurityPrincipals`
- `Users` — default landing zone for users and a few built-in accounts

Verify DNS is working. Open a PowerShell prompt:

```powershell
Resolve-DnsName lab.local
```

You should get back the IP of DC01. If DNS isn't resolving, something went wrong in the promotion — check Event Viewer → Windows Logs → System for errors.

---

## Part 3: Building Your OU Structure

The default `Users` and `Computers` containers in AD are not Organizational Units — they're flat containers that Group Policy can't be linked to directly. One of your first tasks in any real deployment is designing an OU structure.

### Why OUs Matter

OUs serve two purposes:
1. **Delegation** — you can grant a user or group admin rights over a specific OU without making them a Domain Admin
2. **Group Policy** — GPOs are linked to OUs, so your OU structure determines who gets what policy

### 3.1 Design a Structure

For this lab we'll build a simple but representative layout:

```
lab.local
├── _LAB
│   ├── Workstations
│   ├── Servers
│   ├── Users
│   │   ├── Admins
│   │   ├── IT
│   │   └── Finance
│   └── Groups
│       ├── Security
│       └── Distribution
└── Service Accounts
```

The leading underscore on `_LAB` is a naming convention to keep your custom OUs sorted above Microsoft's default containers in the tree view.

### 3.2 Create the OUs

In ADUC, right-click the `lab.local` domain node → **New → Organizational Unit**:

Create `_LAB` first. Then right-click `_LAB` → New → Organizational Unit for each child:
- `Workstations`
- `Servers`
- `Users`
- `Groups`

Right-click `Users` → create `Admins`, `IT`, `Finance`. Right-click `Groups` → create `Security`, `Distribution`.

Finally, back at the domain level, create `Service Accounts`.

You can also do this entirely in PowerShell — which is faster once you know what you want:

```powershell
$base = "DC=lab,DC=local"

# Top-level
New-ADOrganizationalUnit -Name "_LAB"           -Path $base
New-ADOrganizationalUnit -Name "Service Accounts" -Path $base

# Under _LAB
$lab = "OU=_LAB,$base"
New-ADOrganizationalUnit -Name "Workstations" -Path $lab
New-ADOrganizationalUnit -Name "Servers"      -Path $lab
New-ADOrganizationalUnit -Name "Users"        -Path $lab
New-ADOrganizationalUnit -Name "Groups"       -Path $lab

# Under Users
$users = "OU=Users,$lab"
New-ADOrganizationalUnit -Name "Admins"   -Path $users
New-ADOrganizationalUnit -Name "IT"       -Path $users
New-ADOrganizationalUnit -Name "Finance"  -Path $users

# Under Groups
$groups = "OU=Groups,$lab"
New-ADOrganizationalUnit -Name "Security"     -Path $groups
New-ADOrganizationalUnit -Name "Distribution" -Path $groups
```

---

## Part 4: Creating Users and Groups

### 4.1 Understanding AD User Accounts

Every user in AD has a **User Principal Name (UPN)** formatted as `username@domain` (e.g., `jsmith@lab.local`) and a **sAMAccountName** (the older pre-Windows 2000 logon name, e.g., `jsmith`). Both are used for authentication depending on the application.

Important user attributes to know:
- `DisplayName` — shown in address books and logon screens
- `SamAccountName` — the short logon name
- `UserPrincipalName` — the email-style logon name
- `PasswordNeverExpires` — dangerous in production, fine for lab service accounts
- `Enabled` — whether the account can log in
- `MemberOf` — group memberships

### 4.2 Create Lab Users

In ADUC, navigate to `_LAB → Users → IT`. Right-click → **New → User**:

| Field          | Value        |
|----------------|--------------|
| First name     | Alex         |
| Last name      | Torres       |
| User logon name | atorres     |

Set password: `Welcome1!` — check "User must change password at next logon" to simulate a real onboarding flow.

Create a few more users across your OUs. Here's the PowerShell version, which is much faster for bulk creation:

```powershell
$password = ConvertTo-SecureString "Welcome1!" -AsPlainText -Force

# IT users
New-ADUser -Name "Alex Torres"    -SamAccountName "atorres"  -UserPrincipalName "atorres@lab.local"  `
           -Path "OU=IT,OU=Users,OU=_LAB,DC=lab,DC=local"   `
           -AccountPassword $password -Enabled $true -ChangePasswordAtLogon $true

New-ADUser -Name "Jordan Lee"     -SamAccountName "jlee"     -UserPrincipalName "jlee@lab.local"     `
           -Path "OU=IT,OU=Users,OU=_LAB,DC=lab,DC=local"   `
           -AccountPassword $password -Enabled $true -ChangePasswordAtLogon $true

# Finance users
New-ADUser -Name "Morgan Chen"    -SamAccountName "mchen"    -UserPrincipalName "mchen@lab.local"    `
           -Path "OU=Finance,OU=Users,OU=_LAB,DC=lab,DC=local" `
           -AccountPassword $password -Enabled $true -ChangePasswordAtLogon $true

New-ADUser -Name "Riley Patel"    -SamAccountName "rpatel"   -UserPrincipalName "rpatel@lab.local"   `
           -Path "OU=Finance,OU=Users,OU=_LAB,DC=lab,DC=local" `
           -AccountPassword $password -Enabled $true -ChangePasswordAtLogon $true

# A domain admin (separate admin account — best practice, not using the built-in Administrator)
New-ADUser -Name "Admin-Torres"   -SamAccountName "admin-atorres" -UserPrincipalName "admin-atorres@lab.local" `
           -Path "OU=Admins,OU=Users,OU=_LAB,DC=lab,DC=local"  `
           -AccountPassword (ConvertTo-SecureString "LabAdmin123!" -AsPlainText -Force) -Enabled $true
```

### 4.3 Group Types and Scopes

Before creating groups, you need to understand the two axes:

**Group Type:**
- **Security** — used for permissions and Group Policy filtering
- **Distribution** — used for email mailing lists only (Exchange/mail systems)

**Group Scope:**
- **Domain Local** — can contain members from any domain, but permissions only apply within this domain. Use for resource access (e.g., "Printer-Finance-Access").
- **Global** — can only contain members from the same domain, but permissions apply anywhere in the forest. Use for user/computer groupings (e.g., "GRP-Finance").
- **Universal** — can contain members from any domain and apply permissions anywhere. Use in multi-domain forests.

The standard pattern for large environments is **AGDLP**:
- **A**ccounts are placed in **G**lobal groups
- Global groups are placed in **D**omain **L**ocal groups
- Domain Local groups are assigned **P**ermissions

For our lab, keep it simple:

```powershell
# Security groups (Global scope)
New-ADGroup -Name "GRP-IT"       -GroupScope Global -GroupCategory Security `
            -Path "OU=Security,OU=Groups,OU=_LAB,DC=lab,DC=local"

New-ADGroup -Name "GRP-Finance"  -GroupScope Global -GroupCategory Security `
            -Path "OU=Security,OU=Groups,OU=_LAB,DC=lab,DC=local"

New-ADGroup -Name "GRP-Admins"   -GroupScope Global -GroupCategory Security `
            -Path "OU=Security,OU=Groups,OU=_LAB,DC=lab,DC=local"

# Add members
Add-ADGroupMember -Identity "GRP-IT"      -Members "atorres","jlee"
Add-ADGroupMember -Identity "GRP-Finance" -Members "mchen","rpatel"
Add-ADGroupMember -Identity "GRP-Admins"  -Members "admin-atorres"

# Make the admin account a Domain Admin
Add-ADGroupMember -Identity "Domain Admins" -Members "admin-atorres"
```

### 4.4 Verify Group Membership

```powershell
Get-ADGroupMember -Identity "GRP-IT" | Select-Object Name, SamAccountName
Get-ADUser -Identity "atorres" -Properties MemberOf | Select-Object -ExpandProperty MemberOf
```

---

## Part 5: Configuring DNS

DNS is inseparable from AD. Every domain join, logon, and replication event depends on DNS records being present and correct. When AD is promoted, it automatically creates DNS zones and populates them with service records. Let's understand what's there and test it.

### 5.1 DNS Manager Overview

Open **DNS Manager** (Start → Windows Administrative Tools → DNS, or run `dnsmgmt.msc`).

Expand `DC01 → Forward Lookup Zones`. You'll see:
- `_msdcs.lab.local` — critical SRV records that clients use to find domain controllers
- `lab.local` — A records, CNAME records, and more SRVs

Expand `lab.local`. Key records:
- `@` (zone root) → A record pointing to `192.168.10.10`
- `dc01` → A record
- `_kerberos` and `_ldap` under `_tcp` → SRV records clients use for authentication and directory queries

### 5.2 Create a Reverse Lookup Zone

Forward zones resolve names to IPs. Reverse lookup zones resolve IPs to names. They're needed for some tools and best practices to tick.

In DNS Manager → right-click **Reverse Lookup Zones → New Zone**:
- Primary zone
- Replicate to all DNS servers in this domain
- IPv4 Reverse Lookup Zone
- Network ID: `192.168.10`

Once created, right-click `lab.local` forward zone → Properties → set "Dynamic updates" to **Secure only** if not already. Then run:

```powershell
ipconfig /registerdns
```

This forces DC01 to re-register its DNS records, which should populate the reverse zone with a PTR record for `192.168.10.10`.

Verify:

```powershell
Resolve-DnsName 192.168.10.10
```

### 5.3 DNS Forwarders

DC01 is the DNS server for the domain, but clients inside the domain also need to resolve internet addresses. Configure a forwarder to pass external queries upstream.

In DNS Manager → `DC01` → **Properties → Forwarders** tab → Add:
- `1.1.1.1` (Cloudflare)
- `8.8.8.8` (Google)

Test from DC01:

```powershell
Resolve-DnsName google.com
```

---

## Part 6: Configuring DHCP

Right now our lab VMs have static IPs. In a real environment, workstations get their IPs dynamically. Let's set up DHCP on DC01.

> [!NOTE]
> In production, you generally want DHCP on a dedicated server or a network device, not your DC. For a lab with one server, this is fine.

### 6.1 Install the DHCP Role

```powershell
Install-WindowsFeature DHCP -IncludeManagementTools
```

After install, authorize the DHCP server in AD (required before it will hand out leases):

```powershell
Add-DhcpServerInDC -DnsName "dc01.lab.local" -IPAddress 192.168.10.10
```

### 6.2 Create a Scope

A **scope** defines the pool of IP addresses DHCP can hand out, plus associated settings like gateway, DNS, and lease duration.

```powershell
Add-DhcpServerv4Scope `
    -Name "Lab Network" `
    -StartRange 192.168.10.100 `
    -EndRange 192.168.10.200 `
    -SubnetMask 255.255.255.0 `
    -LeaseDuration (New-TimeSpan -Days 8)

# Set scope options
Set-DhcpServerv4OptionValue -ScopeId 192.168.10.0 `
    -Router 192.168.10.1 `
    -DnsServer 192.168.10.10 `
    -DnsDomain "lab.local"
```

### 6.3 Configure DNS Dynamic Update Integration

DHCP can automatically create and update DNS A records when it issues leases — this keeps DNS current without manual work.

```powershell
Set-DhcpServerv4DnsSetting `
    -DynamicUpdates "Always" `
    -DeleteDnsRROnLeaseExpiry $true
```

Open **DHCP Manager** (dhcpmgmt.msc) to verify the scope shows as Active with a green arrow.

---

## Part 7: Joining Client Machines to the Domain

### 7.1 Prepare the Client VMs

Create your two client VMs (`WKSTN01`, `WKSTN02`) and install Windows. During or after setup:

1. Set each VM's NIC to the same internal/host-only network as DC01
2. Configure DNS to point at DC01: `192.168.10.10`
3. Either set a static IP outside the DHCP range (e.g., `192.168.10.50`) or leave it on DHCP (the scope starts at `.100`, so static `.50` is fine)

Rename the computer to `WKSTN01` and restart before joining.

### 7.2 Join the Domain

On WKSTN01 — Settings → System → About → **Domain or workgroup → Domain** → type `lab.local`.

When prompted for credentials, enter: `LAB\Administrator` + password.

Restart. At the logon screen, click "Other user" and log in as `LAB\atorres`.

**What just happened under the hood:**
1. Windows queried DNS for SRV records under `_ldap._tcp.lab.local` to find a Domain Controller
2. It contacted DC01 and authenticated with the credentials you provided
3. DC01 created a computer account in the `Computers` container (default location)
4. A Kerberos ticket was issued and the machine joined the domain

### 7.3 Move the Computer Account to the Right OU

By default, joined machines land in `CN=Computers`. Move them to your structured OU:

In ADUC on DC01, find `WKSTN01` under `Computers` → right-click → **Move** → navigate to `_LAB → Workstations`.

Or via PowerShell:

```powershell
Get-ADComputer -Identity "WKSTN01" | Move-ADObject -TargetPath "OU=Workstations,OU=_LAB,DC=lab,DC=local"
```

Repeat for WKSTN02.

### 7.4 Redirect the Default Computers Container

Instead of moving accounts manually after every join, redirect the default container so new machines go straight to your OU:

```powershell
redircmp "OU=Workstations,OU=_LAB,DC=lab,DC=local"
```

---

## Part 8: Group Policy

Group Policy is the primary mechanism for configuring and enforcing settings across domain-joined machines and users. GPOs (Group Policy Objects) are linked to sites, domains, or OUs, and they apply based on where the computer and user accounts live in the tree.

### 8.1 Group Policy Processing Order (LSDOU)

Policy is processed in this order, with each level able to override the previous:

1. **L**ocal — the local machine's own policy (lowest precedence)
2. **S**ite — applied to AD sites
3. **D**omain — applied to the entire domain
4. **OU** — applied to the specific OU and inherited by child OUs

When conflicts exist, the last policy to apply wins (OU beats Domain beats Site beats Local). Policies are also processed at startup (computer settings) and logon (user settings). The order of multiple GPOs linked to the same OU is controlled by **link order** — lower numbers apply last and win.

### 8.2 Open Group Policy Management

Run `gpmc.msc` on DC01 — the **Group Policy Management Console**.

You'll see the forest and domain tree, plus:
- **Default Domain Policy** — linked at the domain level, controls password policy
- **Default Domain Controllers Policy** — linked to the Domain Controllers OU

Never edit the Default Domain Policy for anything other than password/account lockout settings. Create new GPOs for everything else.

### 8.3 Configure the Domain Password Policy

Right-click **Default Domain Policy → Edit**. Navigate to:

`Computer Configuration → Policies → Windows Settings → Security Settings → Account Policies → Password Policy`

| Setting                        | Value |
|-------------------------------|-------|
| Enforce password history       | 10 passwords |
| Maximum password age           | 90 days |
| Minimum password age           | 1 day |
| Minimum password length        | 12 characters |
| Password must meet complexity  | Enabled |

Account Lockout Policy (same location):

| Setting                          | Value  |
|---------------------------------|--------|
| Account lockout threshold        | 5 invalid attempts |
| Account lockout duration         | 30 minutes |
| Reset account lockout counter    | 30 minutes |

Close the editor and run `gpupdate /force` on DC01 to apply immediately.

### 8.4 Create a GPO for Workstations

Let's create a GPO that applies to all computers in the Workstations OU. In GPMC:

Right-click the `Workstations` OU (you'll need to navigate through the domain tree) → **Create a GPO in this domain, and Link it here** → name it `GPO-Workstation-Baseline`.

Right-click → **Edit**. Apply some practical settings:

**Disable USB storage drives:**
`Computer Configuration → Policies → Administrative Templates → System → Removable Storage Access`
- Set *All Removable Storage classes: Deny all access* → **Enabled**

**Set a custom logon banner:**
`Computer Configuration → Policies → Windows Settings → Security Settings → Local Policies → Security Options`
- *Interactive logon: Message title for users* → `LAB ENVIRONMENT`
- *Interactive logon: Message text* → `This system is for authorized lab use only.`

**Disable Windows Defender Firewall (for lab troubleshooting — never in production):**
`Computer Configuration → Policies → Administrative Templates → Network → Network Connections → Windows Defender Firewall → Domain Profile`
- *Windows Defender Firewall: Protect all network connections* → **Disabled**

### 8.5 Create a GPO for Users

Create `GPO-User-IT` linked to `_LAB → Users → IT`.

**Map a network drive (requires a share to map to — we'll come back to this):**
`User Configuration → Preferences → Windows Settings → Drive Maps`
- New → Mapped Drive → Action: Create, Location: `\\dc01\IT_Share`, Drive letter: `H:`

**Restrict Control Panel access:**
`User Configuration → Policies → Administrative Templates → Control Panel`
- *Prohibit access to Control Panel and PC settings* → **Enabled** for the Finance OU, leave IT unrestricted

### 8.6 Force and Verify Policy Application

On a joined workstation, log in and open an elevated command prompt:

```
gpupdate /force
gpresult /r
```

`gpresult /r` shows you exactly which GPOs applied to the current user and computer, which ones were filtered out, and why. This is your first debugging tool for any policy problem.

For a full HTML report:

```
gpresult /h C:\Temp\gpreport.html
```

Open the HTML file to see applied settings in detail.

### 8.7 GPO Filtering

By default, a GPO applies to all authenticated users in its scope. You can restrict it using **Security Filtering** or **WMI Filters**.

**Security Filtering example:** make `GPO-User-IT` apply only to members of `GRP-IT`:

1. In GPMC, click the GPO
2. Under *Security Filtering*, remove **Authenticated Users**
3. Add **GRP-IT**

> [!NOTE]
> When you remove Authenticated Users from Security Filtering, you must add the computer accounts (or a group containing them) with Read permission if this GPO has Computer Configuration settings, otherwise the computer can't read the policy at all. This is a common gotcha.

---

## Part 9: File Shares and NTFS Permissions

### 9.1 Create a Share on DC01

Open File Explorer on DC01 → `C:\` → create a folder `Shares`, then subfolders `IT_Share` and `Finance_Share`.

Right-click `IT_Share` → **Properties → Sharing tab → Advanced Sharing**:
- Check "Share this folder"
- Share name: `IT_Share`
- Permissions → Add `GRP-IT` → Full Control, remove Everyone

Then on the **Security tab** (NTFS permissions):
- Remove `Everyone` if present
- Add `GRP-IT` → Modify
- Ensure `SYSTEM` and `Administrators` have Full Control

Do the same for `Finance_Share` using `GRP-Finance`.

### 9.2 Understanding Share vs. NTFS Permissions

There are two layers of permission on a Windows file share:

- **Share permissions** — apply only when accessing over the network. Three levels: Read, Change, Full Control.
- **NTFS permissions** — apply both locally and over the network. More granular: Read, Write, Modify, Full Control, and special permissions.

The **effective permission** when accessing over the network is the **more restrictive** of the two. The common pattern is to set Share permissions to **Full Control for Everyone** and manage access purely through NTFS permissions — that way you only have one place to look.

---

## Part 10: Fine-Grained Password Policies

The domain-level password policy in Default Domain Policy applies to everyone. But what if your service accounts need passwords that never expire, or your admins need longer minimums? That's what **Fine-Grained Password Policies (PSOs)** are for — available since Windows Server 2008.

PSOs apply to **users or global security groups**, not OUs.

```powershell
# Policy for admin accounts — stricter
New-ADFineGrainedPasswordPolicy `
    -Name "PSO-Admins" `
    -Precedence 10 `
    -MinPasswordLength 16 `
    -PasswordHistoryCount 24 `
    -MaxPasswordAge "60.00:00:00" `
    -MinPasswordAge "1.00:00:00" `
    -LockoutThreshold 3 `
    -LockoutDuration "01:00:00" `
    -LockoutObservationWindow "01:00:00" `
    -ComplexityEnabled $true `
    -ReversibleEncryptionEnabled $false

# Apply to the GRP-Admins group
Add-ADFineGrainedPasswordPolicySubject -Identity "PSO-Admins" -Subjects "GRP-Admins"

# Verify
Get-ADUserResultantPasswordPolicy -Identity "admin-atorres"
```

---

## Part 11: FSMO Roles

Active Directory has five **Flexible Single Master Operations** (FSMO) roles. Each role can only be held by one DC at a time (per domain or per forest). You need to know what they do and where they are.

**Forest-wide (one per forest):**
| Role | Purpose |
|------|---------|
| Schema Master | Controls changes to the AD schema (adding new attributes/classes) |
| Domain Naming Master | Controls adding/removing domains in the forest |

**Domain-wide (one per domain):**
| Role | Purpose |
|------|---------|
| PDC Emulator | Handles password changes, account lockouts, time sync, and acts as PDC for legacy clients |
| RID Master | Allocates pools of Relative IDs to DCs for creating new security principals |
| Infrastructure Master | Translates GUIDs/SIDs of objects from other domains — leave this *off* the Global Catalog server in multi-domain forests |

In a single-domain, single-DC lab like ours, all five roles live on DC01.

```powershell
# View FSMO role holders
netdom query fsmo

# Or via PowerShell
Get-ADDomain | Select-Object PDCEmulator, RIDMaster, InfrastructureMaster
Get-ADForest | Select-Object SchemaMaster, DomainNamingMaster
```

---

## Part 12: Adding a Second Domain Controller

A single DC is a single point of failure. In production, you always have at least two. Let's add a second one so you understand replication.

Create a new VM — call it `DC02` — and install Windows Server 2022. Give it a static IP of `192.168.10.11`, point DNS at `192.168.10.10` (DC01), and rename it to `DC02`. Install the AD DS role:

```powershell
Install-WindowsFeature AD-Domain-Services -IncludeManagementTools
```

Promote it — but this time select **Add a domain controller to an existing domain**:
- Domain: `lab.local`
- Credentials: `LAB\Administrator`
- DNS Server: checked
- Global Catalog: checked
- Replication from: DC01 (or "Any domain controller")

After reboot, verify replication is healthy from DC01:

```powershell
# Check replication status
repadmin /showrepl
repadmin /replsummary

# Force replication
repadmin /syncall /AdeP
```

You should see no errors. Create a test user on DC01 and verify it appears on DC02 within a minute or two.

### Transfer an FSMO Role

Now that you have two DCs, practice transferring the PDC Emulator role:

```powershell
# On DC01 — transfer PDC Emulator to DC02
Move-ADDirectoryServerOperationMasterRole -Identity "DC02" -OperationMasterRole PDCEmulator
```

Transfer it back:

```powershell
Move-ADDirectoryServerOperationMasterRole -Identity "DC01" -OperationMasterRole PDCEmulator
```

---

## Part 13: Sites and Subnets

AD **Sites** represent physical network locations. They control replication schedules between DCs (you want replication within a site to be fast and frequent; between sites across a WAN link you might schedule it during off-hours).

Even in a single-site lab, understanding sites is important for real-world work.

Open **Active Directory Sites and Services** (`dssite.msc`).

You'll see `Default-First-Site-Name`. Rename it:
- Right-click → Rename → `Site-HQ`

Create a subnet and associate it with the site:
- Right-click `Subnets` → New Subnet
- Prefix: `192.168.10.0/24`
- Site object: `Site-HQ`

This tells AD that any DC with an IP in `192.168.10.0/24` belongs to Site-HQ. Clients use this to find the closest DC.

---

## Part 14: Auditing and Event Logs

Auditing in AD means logging who did what and when. This is critical for security and compliance. Let's enable it.

### 14.1 Enable Advanced Audit Policy

Edit the **Default Domain Controllers Policy** GPO (this policy applies to DCs, which is where AD-related events are logged):

`Computer Configuration → Policies → Windows Settings → Security Settings → Advanced Audit Policy Configuration → Audit Policies`

Enable these:

| Category | Subcategory | Setting |
|---------|-------------|---------|
| Account Logon | Audit Kerberos Authentication Service | Success, Failure |
| Account Logon | Audit Kerberos Service Ticket Operations | Success |
| Account Management | Audit User Account Management | Success, Failure |
| Account Management | Audit Security Group Management | Success, Failure |
| Logon/Logoff | Audit Logon | Success, Failure |
| DS Access | Audit Directory Service Changes | Success |
| Policy Change | Audit Audit Policy Change | Success |

Run `gpupdate /force` on DC01.

### 14.2 Reading Security Events

Open **Event Viewer** → `Windows Logs → Security`. Key event IDs to know:

| Event ID | Meaning |
|---------|---------|
| 4624 | Successful logon |
| 4625 | Failed logon (wrong password, locked account, etc.) |
| 4634 | Account logoff |
| 4648 | Logon using explicit credentials (RunAs) |
| 4720 | User account created |
| 4726 | User account deleted |
| 4728 | Member added to security-enabled global group |
| 4756 | Member added to security-enabled universal group |
| 4768 | Kerberos TGT requested |
| 4771 | Kerberos pre-auth failed |
| 4776 | NTLM authentication attempt |

### 14.3 Query Events with PowerShell

```powershell
# Find all failed logon attempts in the last hour
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4625
    StartTime = (Get-Date).AddHours(-1)
} | Select-Object TimeCreated, Message | Format-List

# Find all user creation events today
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4720
    StartTime = (Get-Date).Date
} | Select-Object TimeCreated, @{N="User";E={$_.Properties[0].Value}}
```

---

## Part 15: PowerShell for AD Administration

You've been using PowerShell throughout this lab, but let's consolidate the most useful commands and patterns.

### 15.1 Searching AD

```powershell
# Find all enabled users
Get-ADUser -Filter {Enabled -eq $true} -Properties * | Select-Object Name, SamAccountName, LastLogonDate

# Find users who haven't logged in for 90 days
$cutoff = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
           -Properties LastLogonDate | Select-Object Name, LastLogonDate

# Find accounts with passwords that never expire
Get-ADUser -Filter {PasswordNeverExpires -eq $true} -Properties PasswordNeverExpires | Select-Object Name

# Find all computers in the domain
Get-ADComputer -Filter * -Properties OperatingSystem | Select-Object Name, OperatingSystem

# Find all groups a user belongs to (recursive)
Get-ADPrincipalGroupMembership -Identity "atorres" | Select-Object Name, GroupScope, GroupCategory
```

### 15.2 Bulk Operations

```powershell
# Disable all users in the Finance OU
Get-ADUser -Filter * -SearchBase "OU=Finance,OU=Users,OU=_LAB,DC=lab,DC=local" |
    Disable-ADAccount

# Move all computers in the default Computers container to Workstations OU
Get-ADComputer -Filter * -SearchBase "CN=Computers,DC=lab,DC=local" |
    ForEach-Object {
        Move-ADObject -Identity $_.DistinguishedName `
                      -TargetPath "OU=Workstations,OU=_LAB,DC=lab,DC=local"
    }

# Reset a user's password and require change at next logon
Set-ADAccountPassword -Identity "atorres" `
    -NewPassword (ConvertTo-SecureString "TempP@ss999!" -AsPlainText -Force) `
    -Reset
Set-ADUser -Identity "atorres" -ChangePasswordAtLogon $true
```

### 15.3 Reporting

```powershell
# Export all users with their OU, email, and last logon to CSV
Get-ADUser -Filter * -Properties EmailAddress, LastLogonDate, DistinguishedName |
    Select-Object Name, SamAccountName, EmailAddress, LastLogonDate,
        @{N="OU"; E={ ($_.DistinguishedName -split ",OU=")[1] }} |
    Export-Csv -Path "C:\Temp\AD_Users.csv" -NoTypeInformation

# Count users per OU
Get-ADUser -Filter * | Group-Object { ($_.DistinguishedName -split ",OU=")[1] } |
    Select-Object Name, Count | Sort-Object Count -Descending
```

---

## Part 16: Kerberos Authentication Deep Dive

Understanding how authentication actually works in AD makes you dramatically better at troubleshooting.

### How Kerberos Works (Simplified)

1. **AS-REQ / AS-REP (Authentication Service):** The client sends its username to the DC's KDC (Key Distribution Center). The DC responds with a **Ticket Granting Ticket (TGT)**, encrypted with the user's password hash. The client decrypts it — this proves the user knows their password without sending it over the wire.

2. **TGS-REQ / TGS-REP (Ticket Granting Service):** When the client wants to access a resource (e.g., a file share on DC01), it presents its TGT to the KDC and asks for a **Service Ticket** for that resource. The DC issues one encrypted with the target service's password hash.

3. **AP-REQ:** The client presents the Service Ticket directly to the target server. The server decrypts it with its own password hash, verifies it, and grants access.

The DC is only involved in steps 1 and 2. Step 3 is direct client-to-server. This is why Kerberos scales well.

### Inspect Kerberos Tickets

On a domain-joined workstation after logging in:

```
klist
```

You'll see your TGT and any cached Service Tickets with their expiration times.

### Common Kerberos Errors

| Error | Common Cause |
|-------|-------------|
| `KRB5KDC_ERR_C_PRINCIPAL_UNKNOWN` | Account doesn't exist in AD |
| `KRB5KDC_ERR_PREAUTH_FAILED` | Wrong password |
| `KRB5KRB_AP_ERR_SKEW` | Clock skew > 5 minutes between client and DC — fix time sync |
| `KRB5KDC_ERR_S_PRINCIPAL_UNKNOWN` | The SPN for the target service doesn't exist |

---

## Part 17: Service Principal Names (SPNs)

An **SPN** is an identifier tied to a service account that tells Kerberos which account a given service is running under. When a client wants a Kerberos ticket for `http/webserver.lab.local`, the KDC looks up which account has that SPN registered.

```powershell
# List all SPNs in the domain
Get-ADUser -Filter {ServicePrincipalNames -like "*"} -Properties ServicePrincipalNames |
    Select-Object Name, ServicePrincipalNames

# Add an SPN to a service account
Set-ADUser -Identity "svc-webapp" -ServicePrincipalNames @{Add="http/webapp.lab.local"}

# Check for duplicate SPNs (common problem)
setspn -X -F
```

Duplicate SPNs cause Kerberos authentication failures that are frustrating to debug if you don't know to look for them.

---

## Part 18: Delegating Control

One of AD's best features is **delegation** — you can grant limited admin rights over a specific OU without making someone a Domain Admin. This is the right way to give the helpdesk the ability to reset passwords.

In ADUC, right-click the `IT` Users OU → **Delegate Control**:

1. Add `GRP-IT` as the group to delegate to
2. Select "Reset user passwords and force password change at next logon"
3. Finish

Now members of `GRP-IT` can reset passwords for users in the `IT` OU — but nowhere else, and they can't do anything else privileged.

You can also create custom delegations via the "Create a custom task to delegate" option, which lets you choose specific attributes and object types.

To view what delegations exist on an OU:

```powershell
(Get-ACL "AD:OU=IT,OU=Users,OU=_LAB,DC=lab,DC=local").Access |
    Where-Object {$_.IdentityReference -notlike "BUILTIN*" -and $_.IdentityReference -notlike "NT AUTHORITY*"} |
    Format-Table IdentityReference, ActiveDirectoryRights, AccessControlType -AutoSize
```

---

## Part 19: AD Recycle Bin

Before the Recycle Bin feature (introduced in Server 2008 R2), accidentally deleting a user meant a painful authoritative restore from backup. Enable it now — it costs nothing and has saved countless sysadmins.

```powershell
# Enable AD Recycle Bin
Enable-ADOptionalFeature -Identity "Recycle Bin Feature" `
    -Scope ForestOrConfigurationSet `
    -Target "lab.local" `
    -Confirm:$false
```

This is a one-way operation — you can't disable it after enabling.

Now test it:

```powershell
# Delete a user
Remove-ADUser -Identity "rpatel" -Confirm:$false

# Find it in the Recycle Bin
Get-ADObject -Filter {displayName -eq "Riley Patel"} -IncludeDeletedObjects

# Restore it
Get-ADObject -Filter {displayName -eq "Riley Patel"} -IncludeDeletedObjects |
    Restore-ADObject
```

The restored user comes back with all its attributes, group memberships, and original location intact.

---

## Part 20: Wrapping Up and What to Explore Next

You now have a functioning AD environment that mirrors the core of what you'd find in a real enterprise. You've touched:

- Domain and forest setup
- OU design and management
- Users, groups, and delegation
- DNS, DHCP, and network integration
- Group Policy at every level
- FSMO roles and replication
- Kerberos, SPNs, and authentication flow
- Auditing and event log analysis
- PowerShell automation

### Where to Go From Here

**Expand the lab:**
- Add an Exchange Server or set up [hMailServer](https://www.hmailserver.com/) to see AD mail integration
- Set up a Certificate Authority (`certsrv`) and issue domain certs — then see how it integrates with everything
- Configure a read-only domain controller (RODC) and understand when you'd deploy one

**Security topics:**
- **Kerberoasting** — attack and defense — any account with an SPN can have its service ticket cracked offline
- **Pass-the-Hash / Pass-the-Ticket** — lateral movement techniques and how Protected Users groups and Credential Guard defend against them
- **BloodHound** — map attack paths through your AD environment to find privilege escalation routes
- **LAPS** (Local Administrator Password Solution) — randomize local admin passwords on domain-joined machines

**Real-world tooling:**
- [Microsoft's AD documentation](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview)
- [TryHackMe — Active Directory](https://tryhackme.com/module/active-directory-hardening) rooms if you want structured security practice against this environment
- Sysmon + a SIEM like Splunk or Elastic to build detection on top of the audit logs you configured here
