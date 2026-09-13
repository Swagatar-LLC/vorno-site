# Privacy policy for Vorno Pages

**Status: the retention policy below is approved for the planned Vorno Pages publishing service.** Vorno Pages is not deployed as of September 13, 2026. This policy will apply before Swagatar, LLC makes that service available. It does not change how the current, third-party session-sharing feature is operated.

## Who operates the service

Swagatar, LLC operates the planned Pages publishing service and is the controller of the personal data described here. Contact us at [hello@vorno.ai](mailto:hello@vorno.ai) for privacy, deletion, or abuse reports.

## What a published Page can contain

A Page may contain the text, HTML, images, and other content a Vorno user chooses to publish. A Page may also include a session snapshot **only when the publisher explicitly opts in**. We also process the publication URL and identifiers, timestamps, size and rate-limit information, and security or abuse signals needed to operate and protect the service.

Do not publish information you would not want a recipient to copy or redistribute. A publisher is responsible for having the right to publish the content.

## Public access and passwords

A Page link is world-readable by anyone who receives it, unless the publisher enables password protection. A password reduces accidental access; it does not make a Page private. Anyone with the link and password can share them, and people can copy, save, screenshot, or archive content while it is available.

## Retention and deletion

Published Page content is retained for **30 days after its last content update** (`contentUpdatedAt`), unless it is unpublished first. Changing Page metadata or manifest, or setting, changing, or clearing a password, does not extend that period.

- On unpublish, immediately revoke public access to the Page.
- Delete the stored content immediately when possible. If physical deletion fails, retry it and warn the publisher; the Page remains logically revoked while that work is retried.
- Keep operational logs for no more than **90 days**.

Unpublishing cannot retrieve material another person already copied while it was available. If you cannot unpublish a Page you control, contact us at [hello@vorno.ai](mailto:hello@vorno.ai) with the Page URL and enough information for us to verify your request.

## Service providers

The planned service uses Cloudflare’s Workers and R2 infrastructure to process and store published Pages and limited operational data. Cloudflare acts as an infrastructure service provider for Swagatar, LLC. We will update this policy before adding a different material subprocessor for Page content.

## Security

The planned service is designed to keep Page publication separate from the Vorno marketing site and from session sharing. It will use a distinct Pages origin, scoped administrative credentials, secret scanning before publication, request size and rate limits, no-store responses, and an opaque sandboxed frame with a restrictive content-security policy. These measures reduce risk; they cannot prevent a recipient from copying content that a publisher makes available.

## Your choices

Publishing is opt-in. You can choose not to publish a Page, omit a session snapshot, password-protect a Page, update it, or unpublish it. For questions, deletion requests, or abuse reports, email [hello@vorno.ai](mailto:hello@vorno.ai).

We may update this policy before the Pages service launches. Material changes will be published at this URL.
