---
title: Sharing a session
description: What Vorno's session sharing publishes, where the data is stored and who operates it, and how to stop sharing.
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

Shared sessions are stored on the **hosted viewer at `agents.craft.do`**, which
belongs to the upstream open-source project Vorno is forked from. It is **not
operated by Swagatar, LLC**, and the data does not pass through
infrastructure we run.

Two consequences follow:

- **The link is the access control.** There is no password and no sign-in.
  Anyone who has the URL — or who is forwarded it — can read the session. Treat
  a share link as public.
- **The copy lives on a third party's storage** for as long as the share
  exists, under that operator's terms and retention.

If a session touched something you would not publish, do not share it. Copy out
the part you want to send instead.

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

Revoking removes the copy from the viewer. It cannot retrieve anything someone
already read, copied, or saved while the link was live.

## Alternatives

- **Export or copy the relevant part** of a conversation when you only need to
  send a result, not the whole session.
- **The WebUI** gives browser access to your own workspace over your own
  network, without publishing anything.
