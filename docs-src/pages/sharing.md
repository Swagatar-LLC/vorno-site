---
title: Sharing a session
description: What Vorno's session sharing publishes, where the data is stored and who operates it, how long it is kept, and how to stop sharing.
---

**Share online** publishes a copy of a session to a web page you can send to
someone. They read it in a browser; they do not need Vorno, an account, or a
sign-in.

## What gets published

A share uploads the **whole session file** as it exists on disk at that moment:

- Every message in the conversation, yours and the agent's.
- The **tool calls and their results**. This is the part worth pausing on. If
  the agent read a file, ran a command, or called an API during the session, the
  contents it got back are in the transcript — and therefore in the share.
- Session metadata: the session name, its labels and status, its permission
  mode, and its working directory path.

Files on your disk are not uploaded as files. They reach the share only through
whatever the transcript already quotes.

## Where it goes

Shared sessions are stored at **`share.vorno.ai`**, which is **operated by
Swagatar, LLC** — the company that makes Vorno. The copy is held in object
storage we run, and we are the data controller for it. See the
[privacy policy](/privacy) for what that means in practice.

Two things follow, and the first one has not changed:

- **The link is the access control.** There is no password and no sign-in.
  Anyone who has the URL — or who is forwarded it — can read the session. Treat
  a share link as public.
- **The link is read-only, though.** Only the copy of Vorno that created a share
  can update or revoke it. Forwarding a link does not let the person you send it
  to change what it shows or take it down.

If a session touched something you would not publish, do not share it. Copy out
the part you want to send instead.

### Shares created before Vorno hosted its own

Vorno used to store shared sessions on `agents.craft.do`, which belongs to the
upstream open-source project Vorno is forked from and is not operated by
Swagatar, LLC.

Links created back then still work, and still live there, under that operator's
terms and retention. Vorno keeps track of which is which, so **Update share** and
**Stop sharing** still act on the right copy. Only shares created from this
version onwards are stored by us.

## How long it is kept

A share is deleted **180 days** after it was last uploaded. Updating a share
restarts that clock.

After that the link stops working, the same as if you had revoked it. If you
need something to outlive the share, save it yourself rather than relying on
the link.

## It is a snapshot, not a live feed

A share is frozen at the moment you create it. Messages you send afterwards do
**not** appear until you explicitly choose **Update share**, which re-uploads
the session and replaces the published copy at the same URL.

That cuts both ways: a share will not leak later work on its own, and a share
you forget to update will show a stale version of the conversation.

## How to stop sharing

In the session menu:

- **Stop sharing** deletes the published copy and clears the link. The URL stops
  working.
- **Deleting the session** in Vorno also revokes its share, so a deleted session
  does not leave a copy behind.

Revoking deletes the stored copy. It cannot retrieve anything someone already
read, copied, or saved while the link was live.

Both actions require the copy of Vorno that created the share — they are not
something a recipient of the link can do, and not something we do on request
without verifying you control the session.

## Alternatives

- **Export or copy the relevant part** of a conversation when you only need to
  send a result, not the whole session.
- **The WebUI** gives browser access to your own workspace over your own
  network, without publishing anything.
