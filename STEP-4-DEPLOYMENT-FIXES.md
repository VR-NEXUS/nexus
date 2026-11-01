# NEXUS Step 4 — Deployment fixes

- Updated Vercel Content-Security-Policy to allow only the exact SHA-256 hashes of the inline JSON-LD block on index.html and the inline 404 animation block. No `unsafe-inline` was added to script-src.
- Aligned the HTML CSP meta policies with the Vercel header policy.
- Added canonical URLs for the homepage, Privacy Policy, and Terms using the currently known production URL: https://nexus-plum-one.vercel.app.
- Added sitemap.xml for those indexable pages and referenced it in robots.txt.
- Added `noindex, nofollow` to the 404 page.

## Deployment checks still required

These are source/configuration fixes only. After deploying, verify the actual response headers, homepage, legal pages, sitemap, robots.txt, and a deliberately nonexistent URL in a browser. If a custom domain is later connected, update canonical URLs and sitemap entries to that domain before making it primary.
