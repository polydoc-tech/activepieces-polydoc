# activepieces-polydoc

An [Activepieces](https://www.activepieces.com) community piece for [PolyDoc](https://polydoc.tech), a REST API that converts HTML or URLs to **PDF**, captures **screenshots**, and generates EU-compliant **e-invoices** (Factur-X / ZUGFeRD hybrid PDF/A-3).

One piece, three actions:

- **Convert to PDF** - layout, margins, page format, page ranges, bookmarks, accessible/tagged PDFs.
- **Capture Screenshot** - PNG / JPEG / WebP, full page, viewport and device-pixel-ratio control, file or base64 output.
- **Generate E-Invoice** - Factur-X or ZUGFeRD, profiles from `minimum` to `extended`.

Each action takes content from a **URL**, an inline **HTML** string, or a saved **template** (with Liquid `templateData`). The result is returned as a file by default, or uploaded to your **cloud storage** (presigned URL) or delivered to a **webhook**.

## Installation

In Activepieces: **Settings -> My Pieces -> Install Piece**, then enter the npm package name `activepieces-polydoc`.

For a self-hosted instance you can also upload a built tarball via **Platform Admin -> Setup -> Pieces**.

## Connection

Create a **PolyDoc** connection with an API key from [dashboard.polydoc.tech](https://dashboard.polydoc.tech) (API Keys). The key is sent as `Authorization: Bearer <key>`. Toggle **Sandbox** to test against sandbox quota (output is watermarked). The connection test runs a tiny forced-sandbox screenshot, so it never touches production quota.

## Anything not in the UI?

Every action has an **Advanced (JSON)** field that is deep-merged into the request body, so any API capability not surfaced as a control (e.g. `pdf.watermark`, `pdf.pdfa`, `pdf.encryption`, `render.*`, `request.*`) is still reachable. See the full request schema at [docs.polydoc.tech](https://docs.polydoc.tech).

## Example flows

Importable flow templates live in [`examples/`](./examples), one per use case. Import them via **Flows -> Import Flow**:

- `pdf-from-template-webhook.json` - invoice PDF from a saved template, triggered by a webhook.
- `url-screenshot-scheduled.json` - scheduled full-page screenshot of a URL.
- `einvoice-webhook-to-pdf.json` - ZUGFeRD / EN 16931 e-invoice from a webhook payload.

## Development

```bash
npm install
npm run build       # tsc -> dist/
npm run lint        # eslint
npm test            # unit tests (request body builder)
npm run scrub:check # fail on em-dashes in UI/customer text
```

Live smoke test against the real API (uses sandbox quota, needs network access to api.polydoc.tech):

```bash
POLYDOC_API_KEY=api_xxx POLYDOC_TEMPLATE_ID=jlE-whg npm run test:integration
```

## License

[MIT](./LICENSE)
