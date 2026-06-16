# Activepieces PolyDoc connector - implementation roadmap

Living roadmap for the Activepieces piece, built per `../../CONNECTOR-PLAYBOOK.md`,
mirroring the n8n reference (`../../n8n-nodes-polydoc`) and the Pipedream sibling
(`../../pipedream-polydoc`). Fresh standalone repo at
`~/Projects/polydoc/tools/activepieces-polydoc/`.

Status legend: [ ] todo | [~] in progress | [x] done

---

## 0. Decision record (why this shape)

Activepieces pieces ship two ways: (A) a PR into the `activepieces/activepieces`
monorepo for an official, verified listing under the `@activepieces/piece-*` scope,
and (B) a self-published community piece (our own npm package) that users install
via **Settings -> My Pieces -> Install Piece -> npm package name**.

**This is path B**: a standalone npm package named `activepieces-polydoc`, parallel
to `n8n-nodes-polydoc`. Path A (monorepo PR for official listing) is a documented
future option, not this pass.

**Converge the product, diverge the content** holds: ONE piece exposing the full API
via **three discrete actions** (idiomatic Activepieces, reviewer-preferred), plus
three angle-split example flows (PDF / screenshot / e-invoice), the direct analog of
the n8n template trio.

### Deviations from the n8n model (and why)

1. **Three discrete actions, not one operation dropdown.** In n8n the connector is
   one node with an `operation` field; in Activepieces each action is its own flow
   step, so `Convert to PDF`, `Capture Screenshot`, and `Generate E-Invoice` are
   separate actions sharing the pure body builder and the source/delivery/advanced
   props.

2. **Static props, not conditional show/hide.** Activepieces has no n8n-style
   `displayOptions`, and its `DynamicProperties` value set excludes `LongText`
   (needed for HTML), `Checkbox`, and `Number`. So the source and delivery inputs are
   flat optional props (a `Source Type` dropdown + a single `Source` LongText that
   holds the URL / HTML / template ID; a `Delivery` dropdown + the cloud/webhook
   fields), resolved at run time by the selected mode. The action validates that
   Cloud Storage has a presigned URL and Webhook has a URL. Cleaner conditional
   rendering is a later UX refinement.

3. **Credential test is the auth `validate` hook.** The playbook's mandatory
   credential test maps to `PieceAuth.CustomAuth.validate()` (a minimal forced-sandbox
   screenshot), not a separate action.

4. **Binary output via `context.files.write`.** Download delivery writes the bytes to
   a file and returns a file handle + metadata; cloud/webhook and screenshot-base64
   return the API JSON. (Screenshot base64 forces a JSON response even under Download
   delivery, so the action flips `isBinary` off in that case.)

---

## 1. Product model (mirror the n8n node)

PolyDoc API = 2 endpoints: `POST /pdf/convert`, `POST /screenshot/convert`. Auth:
`Authorization: Bearer <API_KEY>`. Sandbox: `X-Sandbox: true` header, per-request (so
the credential test can force sandbox). Field definitions:
`../../polydoc-gateway/src/schemas/{common,pdf,screenshot}.ts` (source of truth).

Actions: **Convert to PDF** `/pdf/convert` | **Capture Screenshot**
`/screenshot/convert` | **Generate E-Invoice** `/pdf/convert` with an `eInvoice`
payload. Source mode: URL / inline HTML / Template (`source: "[template:<id>]"` +
`templateData`). Delivery: Download (file) / Cloud Storage (presigned) / Webhook, plus
an **Advanced (JSON)** deep-merge escape hatch.

The pure `buildRequestBody` (+ `mergeDeep`, `resolveSource`, `buildLayout`,
`buildScreenshot`, `defaultFilename`) is ported verbatim into `src/lib/common/` with no
Activepieces imports, unit-tested 1:1 against the Pipedream sibling's suite.

### Three angle-split assets (analog of the n8n templates)

| n8n template | Activepieces example flow (`examples/`) | Angle |
|---|---|---|
| `invoice-pdf-from-template.json` | `pdf-from-template-webhook.json` | PDF |
| `url-screenshot-scheduled.json` | `url-screenshot-scheduled.json` | Screenshot |
| `einvoice-webhook-to-pdf.json` | `einvoice-webhook-to-pdf.json` | E-Invoice |

Templates use the legacy `template:` wrapper format (imports on old + new instances).
They are repo files imported via Flows -> Import Flow, not bundled in the npm package.

---

## 2. Passes

### Pass 1 - Build + verify locally [x] (this pass)

- [x] Scaffold repo (`tools/activepieces-polydoc/`), `git init`, root tooling,
  `.gitignore`, MIT `LICENSE`, `package.json` (name `activepieces-polydoc`).
- [x] `src/lib/common/{constants,types}.ts` + `build-request-body.ts` (pure port).
- [x] Unit tests `test/build-request-body.test.ts` (ported 1:1, 15 cases), green.
- [x] `auth.ts` (CustomAuth: apiKey / sandbox / baseUrl + forced-sandbox `validate`).
- [x] `client.ts` (`resolveAuth`, `polyDocRequest`, `extractApiErrorMessage`).
- [x] `props.ts` (shared source / delivery / metadata / advanced + resolvers),
  `output.ts` (file write / base64 / JSON passthrough).
- [x] Actions: `convert-pdf`, `capture-screenshot`, `generate-einvoice`.
- [x] `index.ts` (`createPiece`, 3 actions, no triggers).
- [x] `npm run build` + `npm run lint` clean; compiled piece loads and exposes the
  three actions + CustomAuth.
- [x] Per-angle example flows in `examples/` (PDF / screenshot / e-invoice).
- [x] `release.yml` (OIDC trusted-publishing scaffold), README, this roadmap.
- [x] `npm run scrub:check` (em-dash sweep) clean.
- [x] Live sandbox smoke (`test/integration.test.ts`, gated on `POLYDOC_API_KEY`,
  forced `X-Sandbox: true`, spaced for the ~5/sec limit). Passes from an allowlisted
  network (the build environment is edge-blocked, see known unknowns).

### Pass 2 - Publish [x]

- [x] Hosted square logo at `https://polydoc.tech/logo.png` (200, image/png); `index.ts`
  points there.
- [x] Create `polydoc-tech/activepieces-polydoc` on GitHub (gh CLI, polydoc-tech) and
  push `main`.
- [x] First `npm publish` (`0.1.0`) under the `polydoc.tech` npm account (manual, since
  npm login is interactive). Verified by installing the published tarball fresh from the
  registry and loading it: `piece.metadata()` exposes `displayName: PolyDoc`,
  `CUSTOM_AUTH` (apiKey + sandbox + validate), and the three actions.
- [x] Configure the npm Trusted Publisher on npmjs.com (GitHub Actions -> repo
  `polydoc-tech/activepieces-polydoc` -> workflow `release.yml`, environment blank).
- [x] OIDC release pipeline proven end to end: tag `v0.1.1` triggered `release.yml`,
  which published `0.1.1` (now `latest`) with no stored token. SLSA provenance v1
  attestation is attached (`dist.attestations`).
- [x] Cut releases with `npm version patch && git push --follow-tags`.

### Out of scope (later)

- Path A: open an `activepieces/activepieces` monorepo PR for an official verified
  listing.
- Add an Activepieces section to the integrations docs guide
  (`polydoc-web/documentation/.../integrations/`) and record Activepieces gotchas in
  `CONNECTOR-PLAYBOOK.md`.

---

## 3. Open questions / known unknowns

- **Build-environment edge block (live tests pass elsewhere).** From the build
  environment, every request to `api.polydoc.tech` (including an unauthenticated
  `GET /health`) returns a bare `403` with `content-length: 0` and no
  `server`/`content-type` header, while `polydoc.tech` returns `200`. The TLS cert is
  the real Let's Encrypt cert for the host, so the request reaches the origin and is
  denied at the ingress/edge, not by the app and not by auth. The live smoke passes
  from an allowlisted network. Cross-check the `polydoc enforces NetworkPolicy` memory
  if it recurs.
- **`minimumSupportedRelease`** is the Activepieces *app* release. The framework floors
  it to its own minimum (0.82.0 for `@activepieces/pieces-framework@0.29.1`), so it is
  pinned to `0.82.0` to match what the metadata actually emits.
- **Flow-template schema generations** (legacy `template:` vs HEAD `flows:[]`): the
  examples use the legacy wrapper, which the import parser normalizes on both.
