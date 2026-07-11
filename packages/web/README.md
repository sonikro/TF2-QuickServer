# web

Frontend package for [quickserver.tf](https://quickserver.tf) — the TF2-QuickServer landing page.

Built with Next.js (static export) + Tailwind CSS.

## Commands

```bash
npm run dev      # development server on localhost:3000
npm run build    # production build → static export in out/
npm run start    # start production server
```

## Deployment

The static export in `out/` is deployed to an S3 bucket.
