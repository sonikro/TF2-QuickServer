<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# packages/web — TF2-QuickServer Landing Page

This is the public-facing landing page at [quickserver.tf](https://quickserver.tf). It is a **fully static Next.js site** deployed to S3 + CloudFront. There is no server runtime.

## Tech Stack

- **Next.js** 16.2.10 (static export mode)
- **React** 19.2.4
- **Tailwind CSS** v4 (via PostCSS)
- **TypeScript** 5
- **flag-icons** — flag sprites for region display
- **react-icons** — SVG icon library

## Architecture — Static Export Only

The site uses `next.config.ts` with `output: "export"` and `images.unoptimized: true`.

This means:

- **No server-side features.** API routes, server actions, `getServerSideProps`, `getStaticProps`, `getStaticPaths`, middleware, rewrites, and redirects do not work in static export mode.
- **No `next/image` optimization.** Images are served as-is from `/public/`.
- **No ISR or on-demand revalidation.** The site is rebuilt and re-deployed as a whole.
- **No `next/link` prefetching** with dynamic routes — there is only one page (the landing page).

Everything must run on the client. Interactive components use the `"use client"` directive.

## Project Structure

```
packages/web/
├── public/              # Static assets (logo.png, avatars/*.jpg)
├── src/
│   ├── app/
│   │   ├── globals.css  # Tailwind imports + custom CSS
│   │   ├── layout.tsx   # Root layout (metadata, fonts, body wrapper)
│   │   └── page.tsx     # Single landing page (composes all sections)
│   └── components/
│       ├── navbar.tsx       # Fixed nav with scroll-aware active link
│       ├── hero.tsx         # Hero section with CTA buttons
│       ├── features.tsx     # Feature cards grid
│       ├── testimonials.tsx # Community testimonials
│       ├── stats.tsx        # Live stats (days running, servers, players)
│       ├── video-overview.tsx # YouTube embed
│       ├── how-it-works.tsx # Step-by-step guide
│       ├── install-bot.tsx  # Discord bot install CTA
│       ├── regions.tsx      # Supported regions (OCI + AWS)
│       ├── commands.tsx     # Discord commands table
│       └── footer.tsx       # Site footer with links
├── out/                # Build output (gitignored) — static files for upload
├── next.config.ts      # Static export config
├── postcss.config.mjs  # PostCSS with Tailwind
├── tsconfig.json
└── package.json
```

## Key Conventions

### Only One Page

This is a single-page application. There is no routing, no `[param]` dynamic segments, and no multi-page navigation. All sections are stacked vertically and linked via anchor IDs (`#features`, `#stats`, `#regions`, `#commands`, `#how-it-works`, `#install`).

### Client Components With `"use client"`

Components that use React hooks (`useState`, `useEffect`, `useRef`) MUST have `"use client"` at the top. Current client components:

- `navbar.tsx` — scroll-based active section tracking, mobile menu toggle
- `stats.tsx` — calculates days-since-first-server from `Date.now()` (hydration-safe)

Components without hooks (hero, features, testimonials, video-overview, how-it-works, install-bot, regions, commands, footer) are server components that render to static HTML at build time.

### Images

- Place static images in `/public/`.
- Use `next/image` with `width` and `height` (no optimization, served as-is).
- External images are referenced by absolute URL (e.g., OpenGraph image from GitHub raw).

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` syntax.
- Custom CSS variables and `@theme inline` blocks in `globals.css`.
- UI uses a dark theme (`#0d1117` background) with an orange accent (`#f39c12`).
- Use `@apply` sparingly — prefer inline utility classes.

## Commands

Run from the repository root (`TF2-QuickServer/`):

```bash
npm run dev:web      # Next.js dev server on localhost:3000
npm run build:web    # Production build → static export in packages/web/out/
```

Or from `packages/web/`:

```bash
npm run dev          # Next.js dev server
npm run build        # Production build → out/
npm run start        # Serve the built output locally
```

## Deployment — S3 + CloudFront

### Infrastructure (Terraform)

The deployment infrastructure is in `terraform/landing-page/` and uses **Terragrunt** for state management.

Key resources:

| Resource | Purpose |
|----------|---------|
| `aws_s3_bucket.landing_page` | Private S3 bucket (random suffix, versioning enabled, SSE AES256) |
| `aws_cloudfront_origin_access_identity.landing_page` | OAI so only CloudFront can read the bucket |
| `aws_s3_bucket_policy.landing_page` | Bucket policy granting `s3:GetObject` to the OAI |
| `aws_cloudfront_distribution.landing_page` | CloudFront distribution (HTTP/2+3, PriceClass_100, caching optimized, HTTPS only) |
| `aws_route53_record.landing_page` | DNS A record aliased to CloudFront |
| `aws_acm_certificate.landing_page` | TLS certificate validated via DNS (Route53) |
| `null_resource.sync_web_files` | Upload via `aws s3 sync` with different cache headers |

### Cache Headers

Two `aws s3 sync` commands set appropriate cache lifetimes:

| Pattern | Cache-Control | Rationale |
|---------|--------------|-----------|
| All files except `_next/*` | `max-age=3600` | HTML can change on each deploy |
| `_next/*` | `max-age=604800` (7 days) | Content-hashed, immutable |

### 404 Handling

CloudFront is configured with a custom error response: 404 errors return `/404.html` (generated by Next.js static export).

### TLS

An ACM certificate (DNS-validated via Route53) is attached to the CloudFront distribution with TLSv1.2_2021 minimum.

### Deploy Process

1. Build: `npm run build:web` (from repo root) → produces `packages/web/out/`
2. Apply Terraform: `cd terraform/landing-page && terragrunt apply`
   - The `null_resource.sync_web_files` provisioner uploads the `out/` contents to S3
   - CloudFront distribution is updated (invalidation not handled by Terraform — must be done manually if needed)

## What NOT To Do

- Do NOT add API routes (`app/api/`). They do not work in static export mode.
- Do NOT use `getServerSideProps`, `getStaticProps`, `getStaticPaths`, or `generateStaticParams` — they are unnecessary or unsupported for a single-page static export.
- Do NOT add server actions (`"use server"`). They do not work in static export mode.
- Do NOT add middleware or rewrite/redirect rules in `next.config.ts`. They do not work in static export mode.
- Do NOT add dynamic routes (`[slug]`) unless adding multi-page navigation (currently there is only one page).
- Do NOT use `next/image` with external domains or optimization — it is disabled.
- Do NOT import server-only modules (fs, crypto, database clients) in components.
- Do NOT add `next/font` with variable fonts that require a server — `Inter` from `next/font/google` is safe (downloaded at build time).
