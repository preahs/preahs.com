---
title: "Runbook: [Short, action-oriented title]"
description: One sentence on what this runbook fixes and when to reach for it.
date: 2026-06-19
tags: [runbook]
draft: true
severity: medium   # low | medium | high | critical — how bad it is when this fires
lastVerified: 2026-06-19   # last time you confirmed these steps still work
---

## Symptoms

What you observe when this problem occurs — alerts, error messages, user reports.

## When to use this

Use this runbook when `<condition>` is true. Note any cases where this is the *wrong* runbook to reach for.

## Prerequisites

- Access/permissions needed
- Tools required (e.g. `ssh`, `kubectl`, a specific dashboard)

## Diagnosis

1. Check `<thing>`: `command here`
2. Check logs: `command here`
3. Confirm root cause before proceeding to fix.

## Steps

1. `command or action`
2. `command or action`
3. Confirm recovery: how you know it worked.

## Rollback

If the fix doesn't resolve it, how to revert to the last known-good state, and who/what to escalate to.

## Related

Links to related runbooks, labs, or blog posts.
