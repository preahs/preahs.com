---
title: "Sharing an ext4 Drive Between an Unprivileged LXC and Other Services"
description: "Moving a Nextcloud data directory onto a separate drive shared with other services, and the UID mapping that makes it work."
date: 2026-07-29
severity: low
tags: ["labs", "tech", "linux", "proxmox", "lxc", "runbook"]
---

## Context

I needed the Nextcloud data directory off the container's own disk and onto a separate ext4 drive. Two constraints made this more interesting than a bind mount:

1. The container is unprivileged, which is the correct default for anything internet-reachable, but it means container UIDs do not match host UIDs.
2. The drive is shared with other services, so I could not simply chown the whole thing to one application and move on.

The naive version of this task is one `pct set` command. The version that does not break the other services on the drive requires understanding what an unprivileged container actually does to file ownership.

**The one thing to understand:** an unprivileged LXC shifts every UID and GID by 100000. Root inside the container (UID 0) is UID 100000 on the host. `www-data` inside the container (UID 33) is UID 100033 on the host. The container cannot write to a host directory unless the host-side ownership matches what the container's shifted identity actually is.

---

## Environment

- Proxmox VE host with a second ext4 drive
- NextcloudPi in an unprivileged LXC, container ID `<CTID>`
- Nextcloud install: `/var/www/nextcloud`
- Target data directory inside container: `/media/nextcloud-data/data`
- Drive shared with other services on the same host

Replace `<CTID>`, `<UUID>`, and `<HOST_MOUNT>` with your own values throughout.

---

## Plan

1. Prepare and persistently mount the drive on the Proxmox host
2. Decide the ownership model for shared access
3. Bind mount the drive into the container
4. Verify the container can actually write
5. Migrate the existing Nextcloud data
6. Point Nextcloud at the new location
7. Verify and document rollback

---

## 1. Prepare and mount the drive on the host

Identify the drive and confirm you are about to touch the correct one.

```bash
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,MODEL
sudo blkid /dev/sdX1
```

Mount by UUID, never by device name. Device names reorder across reboots.

```bash
sudo mkdir -p <HOST_MOUNT>
sudo blkid -s UUID -o value /dev/sdX1
```

Add to `/etc/fstab`:

```
UUID=<UUID>  <HOST_MOUNT>  ext4  defaults,nofail,x-systemd.device-timeout=10  0  2
```

`nofail` matters. Without it, a drive that fails to appear leaves the host stuck at boot rather than coming up degraded.

```bash
sudo systemctl daemon-reload
sudo mount -a
findmnt <HOST_MOUNT>
```

Confirm SMART health before you commit data to it:

```bash
sudo smartctl -H /dev/sdX
```

---

## 2. Decide the ownership model

This is the step that determines whether the shared drive stays workable.

There are three viable approaches. Pick deliberately.

| Approach | How it works | Use when |
| --- | --- | --- |
| **Shifted ownership (simplest)** | Give the container's subdirectory host-side ownership of `100033:100033`. Other services keep their own subdirectories. | Each service owns a distinct subdirectory. This is the common case and the one documented below. |
| **Shared group + setgid** | Create a group on the host, add each service's host-side identity to it, set the group on the shared subdirectory with the setgid bit so new files inherit it. | Multiple services genuinely need to read and write the same files. |
| **ID mapping (`lxc.idmap`)** | Map a specific container UID directly onto a specific host UID so no shift occurs for that ID. | You need host-side ownership to read as a normal host user, for example so a host backup job runs cleanly. |

The trap to avoid: making the shared directory `777` because it is faster. That works and it undoes the isolation you chose an unprivileged container to get. A compromised service in one container can then write anything anywhere on the shared drive.

I used shifted ownership with per-service subdirectories.

---

## 3. Create the directory and set host-side ownership

```bash
sudo mkdir -p <HOST_MOUNT>/nextcloud-data
sudo chown -R 100033:100033 <HOST_MOUNT>/nextcloud-data
sudo chmod 0750 <HOST_MOUNT>/nextcloud-data
```

`100033` is `100000 + 33`, where 33 is `www-data` inside the container. Confirm your own offset rather than assuming, since it is configurable:

```bash
cat /etc/subuid
cat /etc/subgid
```

Leave the other services' subdirectories on the drive untouched. This is precisely why per-service subdirectories are worth the extra minute.

---

## 4. Bind mount into the container

Stop the container, add the mount point, start it again.

```bash
sudo pct stop <CTID>
sudo pct set <CTID> -mp0 <HOST_MOUNT>/nextcloud-data,mp=/media/nextcloud-data
sudo pct start <CTID>
```

Verify the config took:

```bash
sudo pct config <CTID> | grep mp0
```

### Verify the container can write, before migrating anything

```bash
sudo pct enter <CTID>

ls -la /media/nextcloud-data          # should show www-data:www-data
sudo -u www-data mkdir -p /media/nextcloud-data/data
sudo -u www-data touch /media/nextcloud-data/data/writetest
sudo -u www-data rm /media/nextcloud-data/data/writetest
```

If ownership inside the container shows as `nobody:nogroup`, your host-side UID does not match the container's shifted identity. Recheck the offset in step 3. Do not proceed until a write as `www-data` succeeds.

---

## 5. Migrate the existing data

Put Nextcloud into maintenance mode so nothing is written mid copy.

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --on
```

Copy, preserving ownership and permissions, from inside the container:

```bash
sudo rsync -aHAX --info=progress2 \
  /var/www/nextcloud/data/ /media/nextcloud-data/data/
```

Verify the copy before you trust it:

```bash
sudo du -sh /var/www/nextcloud/data /media/nextcloud-data/data
sudo find /media/nextcloud-data/data ! -user www-data | wc -l   # expect 0
```

Do not delete the original yet. Keep it until verification in step 7 passes.

---

## 6. Point Nextcloud at the new directory

Edit `/var/www/nextcloud/config/config.php`:

```php
'datadirectory' => '/media/nextcloud-data/data',
```

Bring it back up and rescan the index:

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --off
sudo -u www-data php /var/www/nextcloud/occ files:scan --all
```

The scan is not optional. Nextcloud tracks files in its database, and a filesystem level move does not update that database on its own.

---

## 7. Verification

- [ ] Web UI loads and the file tree matches what it showed before the move
- [ ] Upload a new file through the web UI
- [ ] Edit and save an existing file
- [ ] Upload from the iOS client
- [ ] `findmnt /media/nextcloud-data` inside the container shows the bind mount
- [ ] `sudo find /media/nextcloud-data/data ! -user www-data | wc -l` returns 0
- [ ] Other services on the shared drive still read and write their own directories
- [ ] Reboot the host, then confirm the drive mounts and the container starts clean
- [ ] Only after all of the above: remove the old data directory

The reboot test is the one people skip. A bind mount that works today but does not survive a reboot is a scheduled outage, not a working configuration.

---

## Rollback

If verification fails, the path back is short because the original data is still in place.

```bash
# 1. Maintenance mode on
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --on

# 2. Revert config.php
'datadirectory' => '/var/www/nextcloud/data',

# 3. Maintenance mode off, rescan
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --off
sudo -u www-data php /var/www/nextcloud/occ files:scan --all
```

Remove the bind mount from the container config only after the rollback is confirmed working.

---

## Failure modes and what they mean

| Symptom | Cause | Fix |
| --- | --- | --- |
| Container shows mount as `nobody:nogroup` | Host-side UID does not match the container's shifted UID | Chown host-side path to `100000 + <container UID>` |
| 403 on upload or save after the move | Files owned by root, or by an unshifted UID | See the companion runbook on Nextcloud 403 ownership errors |
| Files present on disk but absent from the web UI | Index not rebuilt | `occ files:scan --all` |
| Host boot hangs after adding the drive | Missing `nofail` in `/etc/fstab` | Add `nofail` and `x-systemd.device-timeout` |
| Another service loses access after the change | A recursive chown crossed subdirectory boundaries | Restore that service's ownership; keep chown scoped to one subdirectory |
| Mount disappears after reboot | fstab entry uses a device name instead of a UUID | Switch to `UUID=` |

---

## Why unprivileged, given the extra work

The UID shifting is friction. It is also the entire point. Root inside an unprivileged container is an unprivileged user on the host, so a container escape does not hand an attacker host root. For a service reachable from outside the LAN, that trade is worth the extra half hour of mapping work, and the failure modes above are all recoverable and all diagnosable from ownership output.
