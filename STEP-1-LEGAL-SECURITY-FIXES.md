# Step 1 — Legal & Security Fixes

Updated in this separate workspace copy on 1 November 2026.

## Changes
- Added `vercel.json` with Vercel response headers and static-asset cache rules.
- Aligned the CSP meta policy on `index.html`, `privacy.html`, and `terms.html` with the site-wide policy. The Formspree origin is allowed only for form submission and the form API connection.
- Aligned `_headers` and `.htaccess` CSP values with the same policy for hosts that support those files.
- Updated Privacy Policy wording to describe the actual submitted fields, Formspree as a separate processor, browser `localStorage` (not cookies), and the limits of deletion requests to third-party copies.
- Changed the privacy-page fact label from “Cookies” to “Browser storage”.

## Not verified by a local source audit
- Vercel deployment response headers: must be checked after deploying this folder.
- Formspree inbox delivery, account settings, retention, and provider-side deletion: must be tested/checked in the Formspree account.
- Legal sufficiency under Indian law: this is a technical/content consistency pass, not legal advice or a legal compliance certification.
