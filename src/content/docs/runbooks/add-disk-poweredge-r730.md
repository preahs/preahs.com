---
title: "Adding a Disk to a Dell PowerEdge R730 and Mounting It in Proxmox"
description: "Physically installing an HDD, building a virtual disk on the PERC controller via iDRAC, and mounting the ext4 partition persistently under Proxmox."
date: 2026-08-19
severity: low
tags: ["labs", "tech", "linux", "proxmox", "hardware", "dell", "runbook"]
---

## Context

Adding a new drive to the R730 is not a single step. The disk has to be seated in a caddy, recognized by the PERC RAID controller, turned into a virtual disk the OS can see, and only then partitioned, formatted, and mounted. Skip the controller step and Proxmox will never see the drive no matter how healthy it is, because the PERC does not pass raw disks through by default — the OS sees virtual disks, not the physical members behind them.

**The one thing to understand:** on a PERC-backed R730 the operating system does not talk to the physical disk directly. You create a virtual disk (VD) in the controller's Configuration Utility, and that VD is what shows up as `/dev/sdX` in Proxmox. A single new drive still becomes a one-member VD before Linux will touch it.

---

## Environment

- Dell PowerEdge R730 with a PERC RAID controller
- iDRAC reachable at `https://<IDRAC_IP>/` on the same LAN
- Proxmox VE installed on the host
- A new HDD and a matching drive caddy

Replace `<IDRAC_IP>`, `/dev/sda`, and the UUID with your own values throughout.

---

## Plan

1. Install the disk physically
2. Confirm the controller sees the disk via iDRAC
3. Build a virtual disk in the Configuration Utility
4. Partition and format the disk in Proxmox
5. Mount it and make the mount survive reboots

---

## 1. Install the disk

Power off the server completely before opening a bay.

1. Align the HDD with the caddy — the connectors on the edge of the tray, with the longest line of connectors facing the bottom, away from the release button.
2. Screw in each of the four screws to secure the disk.
3. Press the release button to open the lever. Insert the disk into the slot until you hear a faint click, then snap the lever back into place.
4. Power on the server and ensure the iDRAC port is connected.

---

## 2. Confirm the controller sees the disk

Access iDRAC at `https://<IDRAC_IP>/` from a computer on the same network and log in.

Go to **Storage** and confirm the disk is recognized and reports no errors. If it does not appear here, stop — reseat the drive before going any further. A disk the controller cannot see will never reach the OS.

---

## 3. Build a virtual disk

Power off the server and boot it again, this time pressing `CTRL-R` while watching the virtual console in iDRAC to enter the Configuration Utility.

1. Use the arrow keys to select the controller, then press `F2` for **Operations**.
2. Choose **Create New VD**, then **Advanced**.
3. Check the option to **initialize** the disk, keep the rest of the defaults, and confirm.
4. Confirm the new virtual disk is listed, then exit the utility and reboot the server.

---

## 4. Partition and format in Proxmox

Open the Proxmox GUI and use the Dell node's shell. Identify the new disk first:

```bash
lsblk
```

Note what the new disk is listed as — for example `/dev/sda`. **Substitute that name into every command below.** Confirm you have the right device before you write to it; partitioning the wrong disk is not recoverable.

Create a GPT partition table and a single partition spanning the whole disk:

```bash
fdisk /dev/sda
```

```
Command (m for help): g
Created a new GPT disklabel.

Command (m for help): n
Partition number (1-128, default 1): <Enter>
First sector (2048-..., default 2048): <Enter>
Last sector, +sectors or +size{K,M,G,T,P} (2048-..., default ...): <Enter>

Created a new partition 1 of type 'Linux filesystem'.

Command (m for help): w
```

Accept every default so the entire disk is used, unless you deliberately want multiple partitions. Then format the partition ext4:

```bash
mkfs.ext4 /dev/sda1
```

---

## 5. Mount and make it persist

Mount it once to confirm it works:

```bash
mkdir -p /mnt/volume0
mount /dev/sda1 /mnt/volume0
```

### Make the mount survive reboots

Mount by UUID, never by device name — device names reorder across reboots. Get the partition's UUID:

```bash
blkid /dev/sda1
```

Example output:

```
/dev/sda1: UUID="75cffba1-2fc6-4a59-8d47-4d2773a25d43" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="a81049f8-b015-dc48-ac5e-7d376f1e2f37"
```

Edit fstab:

```bash
nano /etc/fstab
```

Add a line at the bottom using your UUID:

```
UUID=75cffba1-2fc6-4a59-8d47-4d2773a25d43 /mnt/volume0 ext4 defaults 0 2
```

Save, then test:

```bash
mount -a
```

If there are no errors, the mount is persistent and you are good to go.

---

## Verification

- [ ] iDRAC **Storage** shows the disk healthy with no errors
- [ ] The virtual disk is listed in the Configuration Utility
- [ ] `lsblk` shows the new disk and its partition in Proxmox
- [ ] `mount -a` completes with no errors
- [ ] Reboot the host, then confirm the drive mounts automatically at `/mnt/volume0`

The reboot test is the one people skip. A mount that works today but does not come back after a reboot is a scheduled outage, not a working configuration.

---

## Failure modes and what they mean

| Symptom | Cause | Fix |
| --- | --- | --- |
| Disk absent from iDRAC **Storage** | Not seated, or a dead caddy connector | Power off and reseat the drive |
| Disk in iDRAC but not in `lsblk` | No virtual disk created for it | Return to the Configuration Utility and create a VD |
| `mount -a` errors after editing fstab | Typo in the UUID or the fstab line | Recheck against `blkid`; fix the line before rebooting |
| Mount gone after a reboot | fstab entry used a device name instead of a UUID | Switch the entry to `UUID=` |
