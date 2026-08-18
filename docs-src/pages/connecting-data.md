---
title: Connecting a data source
description: What a source is in Vorno, what happens when you ask for one, and what you are agreeing to when you connect it.
---

A **source** is a connection between Vorno and something that holds your data —
a service like Linear or GitHub, an HTTP API, an MCP server, or a folder on your
own disk. Once a source exists, the agent can read from it, and depending on how
you configured it, write to it.

This page is the human introduction. The [Sources Configuration
Guide](/docs/sources/) next to it is the full specification — and it is written
for the agent, as a procedure it follows. You do not need to read it to connect
something.

## The short version

Ask. In plain language:

> "Connect my Linear workspace."
> "I want you to be able to read the invoices folder on my Desktop."
> "Set up the Cloudflare API so you can check my DNS."

Vorno reads its own sources guide, works out whether the thing is best reached
as an MCP server, a REST API, or a local folder, asks you for whatever
credential is needed, tests the connection, and writes down how to use it. You
will be asked to paste a token or approve an OAuth window; you will not be asked
to write configuration.

## What actually gets created

Each source is a small directory in your workspace holding two files:

- **`config.json`** — where the thing lives and how to authenticate to it.
  Secrets are not stored here; credentials go to the OS keychain or an
  environment variable that `config.json` only names.
- **`guide.md`** — instructions the agent must read before it uses the source
  for the first time. This is the part people find surprising and it is the part
  that makes sources work: the guide records *your* context. Which project you
  care about, which fields matter, what "the usual report" means. A source
  without a good guide is an API; a source with one is something that knows how
  you work.

You can read and edit both. They are ordinary files.

## What you are agreeing to

Connecting a source grants the agent access to that data, within the limits of
the credential you supply. Two things are worth being deliberate about:

**Scope the credential, not the trust.** Give a token the narrowest permissions
that let the job happen. A read-only token cannot be talked into a write, no
matter what happens in a conversation. This is the control that actually holds.

**Permission mode still applies.** Sources are subject to the same
[permission modes](/docs/permissions/) as everything else. In Explore mode the
agent can read through a source but not mutate anything; writes require Ask to
Edit or Execute. A connected source is not a standing authorization to act.

## When not to make a source

Sources are for work you will repeat. For a genuine one-off — pulling a number
off a page, checking whether something shipped — the built-in browser is
usually the better tool, and leaves nothing configured behind. Vorno will often
suggest this itself.

The rough test: if you would want the same thing again next week, make a source.
If you would not, don't.

## Where to go next

- **[Sources Configuration Guide](/docs/sources/)** — the full specification:
  `config.json` schema, authentication types, MCP vs. API vs. local, provider
  notes for common services, and the `guide.md` conventions.
- **[Permissions](/docs/permissions/)** — what each mode allows, and how to
  narrow a source further.
- **[CLI](/docs/vorno-cli/)** — `vorno-cli source ...` for managing sources from
  the terminal.
