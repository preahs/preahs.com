---
title: "Nextcloud 403 on Upload and Save After a Bulk File Import"
description: "A permissions failure that looked like a client bug. Diagnosing and fixing root-owned files in the Nextcloud data directory."
date: 2026-07-28
tags: ["labs", "tech", "linux", "nextcloud", "runbook"]
severity: low
---

## Context

I copied a large batch of existing files directly into my Nextcloud data directory rather than uploading them through the web interface. Everything looked fine. The files showed up in the web UI, the folder tree was correct, disk usage was right.

Then every write started failing. Uploading from the iOS app returned an error. Saving an edited text file in the browser returned a 403. Creating a new folder returned a 403. Reading worked. Writing did not.

The failure presented as a client problem, because it first showed up on my phone, and then as an access-control problem, because 403 means forbidden. It was neither; it was Unix file ownership. I had run the import as root, so every imported directory was owned by `root:root`, and the web server user could not write into
its own data directory.

The generalizable lesson: when a web application returns 403 on write but succeeds on read, suspect the filesystem before you suspect the application's permission model.

---

## Symptoms

- HTTP 403 when uploading a file through the web UI
- HTTP 403 when saving changes to an existing file
- HTTP 403 when creating a new folder
- Same failures from the iOS client, so not browser or session specific
- Reads and directory listings succeed normally
- Login, sharing, and settings pages behave normally
- Started immediately after a bulk copy into the data directory

## Environment

- NextcloudPi in an unprivileged Proxmox LXC
- Nextcloud install: `/var/www/nextcloud`
- Data directory: `/media/nextcloud-data/data` on a separate ext4 drive
- Web server runs as `www-data`

## Scope check before you touch anything

Confirm this is filesystem ownership and not one of the common lookalikes. Each of these also produces upload failures, and each has a different fix.

| Lookalike | How to rule it out |
| --- | --- |
| PHP upload size limits | Failure would be size dependent. Small files would succeed. Test with a 1 KB file. |
| Disk full or inode exhaustion | `df -h` and `df -i` on the data drive |
| Nextcloud maintenance mode | `sudo -u www-data php /var/www/nextcloud/occ status` |
| Quota exceeded for the user | Check the user's quota in the admin panel |
| Reverse proxy or Tunnel rejecting the request | Failure would usually be 502 or 413, and the request would not appear in the Nextcloud log |
| AppArmor or SELinux denial | Check `dmesg` or the audit log for denials on the data path |

If small files fail, the disk has space, the app is not in maintenance mode, and
the 403 appears in `nextcloud.log`, continue below.

---

## Diagnosis

### 1. Confirm the request reached Nextcloud

```bash
sudo tail -n 50 /media/nextcloud-data/data/nextcloud.log
```

A filesystem permission failure surfaces here as an exception mentioning the target path, not as a generic auth failure. If nothing appears in this log at all, the request was rejected upstream and this runbook does not apply.

### 2. Identify the web server user

```bash
ps aux | grep -E 'apache2|php-fpm|nginx' | head
```

On NextcloudPi this is `www-data`. Note the exact user, because every step below depends on it.

### 3. Inspect ownership of the data directory

```bash
ls -la /media/nextcloud-data/data
ls -la /media/nextcloud-data/data/<username>/files
```

This is where the problem becomes obvious. Directories created by the import are owned by `root:root`. Directories created by Nextcloud itself are owned by `www-data:www-data`.

### 4. Find every offending path

```bash
sudo find /media/nextcloud-data/data ! -user www-data -printf '%u:%g %p\n' | head -50
sudo find /media/nextcloud-data/data ! -user www-data | wc -l
```

The count tells you how large the blast radius is. Mine was the entire imported tree.

### 5. Prove the diagnosis before fixing it

Attempt a write as the web server user. If this fails with permission denied, the diagnosis is confirmed.

```bash
sudo -u www-data touch /media/nextcloud-data/data/<username>/files/permtest
```

---

## Fix

### 1. Enter maintenance mode

Prevents Nextcloud from writing while you change ownership underneath it.

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --on
```

### 2. Correct ownership

```bash
sudo chown -R www-data:www-data /media/nextcloud-data/data
```

Run this against the data directory only. Do not run a recursive chown at the root of a drive that other services also use. That is how a Nextcloud fix becomes an outage for everything else on the disk.

### 3. Correct permissions

Nextcloud expects the data directory to be private.

```bash
sudo find /media/nextcloud-data/data -type d -exec chmod 0750 {} \;
sudo find /media/nextcloud-data/data -type f -exec chmod 0640 {} \;
```

### 4. Verify the write path is open

```bash
sudo -u www-data touch /media/nextcloud-data/data/<username>/files/permtest
sudo -u www-data rm /media/nextcloud-data/data/<username>/files/permtest
```

### 5. Leave maintenance mode

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mode --off
```

### 6. Rescan the file index

Files copied in at the filesystem level are invisible to Nextcloud's database until scanned. Ownership was only half the problem. The index is the other half.

```bash
sudo -u www-data php /var/www/nextcloud/occ files:scan --all
```

For a large import, scan a single user first to check it behaves before you commit to the full run:

```bash
sudo -u www-data php /var/www/nextcloud/occ files:scan <username>
```

---

## Verification

Work through all of these, not just the first. The original failure showed up on one client before the others.

- [ ] Upload a file through the web UI
- [ ] Edit and save an existing text file in the web UI
- [ ] Create a new folder in the web UI
- [ ] Upload from the iOS client
- [ ] Confirm imported files appear with correct sizes and modification dates
- [ ] `sudo find /media/nextcloud-data/data ! -user www-data | wc -l` returns 0
- [ ] `nextcloud.log` shows no new permission exceptions

---

## Prevention

The fix is easy. Not causing it again is the actual takeaway.

**Import as the web server user, not as root.**

```bash
sudo -u www-data rsync -av --info=progress2 /path/to/source/ \
  /media/nextcloud-data/data/<username>/files/
```

**Or preserve the fix in the copy itself:**

```bash
sudo rsync -av --chown=www-data:www-data /path/to/source/ \
  /media/nextcloud-data/data/<username>/files/
```

**Always follow an import with a scan.** Ownership and indexing are two separate requirements, and fixing one without the other leaves you with files that are writable but invisible, or visible but unwritable.

**Add a post-import check to your own habits:**

```bash
# Run after any manual write into the data directory
sudo find /media/nextcloud-data/data ! -user www-data -print -quit
```

Empty output means clean. Any output means run the fix above before you walk away.

---

## Note for unprivileged containers

This runbook assumes you are working from inside the container, where `www-data` is UID 33. If you inspect the same files from the Proxmox host, the ownership will not say `www-data`. It will say `100033`, because unprivileged LXCs shift container UIDs by an offset. That is expected and not a bug.

If you are copying files in from the host rather than from inside the container, the UID you set on the host is the one that matters, and setting it to 33 will produce exactly the failure documented above. See the companion runbook on shared storage in unprivileged LXCs for how the mapping works.
