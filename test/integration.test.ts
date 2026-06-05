import { describe, expect, it } from 'vitest';
import { buildRequestBody } from '../src/lib/common/build-request-body';
import { polyDocRequest, resolveAuth } from '../src/lib/common/client';
import type { PolyDocParams } from '../src/lib/common/types';

// Live smoke test against the real PolyDoc API. Skipped unless POLYDOC_API_KEY
// is set; always uses X-Sandbox so it draws sandbox quota, never production. It
// builds request bodies with the SAME buildRequestBody the actions use, so it
// validates the builder against the live contract, not just in isolation. The
// sandbox limit is ~5 req/sec, so cases run sequentially with a small gap.
const API_KEY = process.env.POLYDOC_API_KEY;
const BASE = (process.env.POLYDOC_BASE_URL ?? 'https://api.polydoc.tech').replace(/\/+$/, '');
const TEMPLATE_ID = process.env.POLYDOC_TEMPLATE_ID ?? 'jlE-whg';

const SANDBOX_GAP_MS = 400;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(params: PolyDocParams): Promise<Response> {
  const { endpoint, body } = buildRequestBody(params);
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'X-Sandbox': 'true',
    },
    body: JSON.stringify(body),
  });
  await sleep(SANDBOX_GAP_MS);
  return res;
}

const dl = { mode: 'download' as const };

describe.skipIf(!API_KEY)('PolyDoc live API (sandbox)', () => {
  it('PDF from inline HTML returns a PDF', async () => {
    const res = await call({ operation: 'pdf', sourceType: 'html', html: '<h1>Smoke</h1>', delivery: dl });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('PDF from a saved template renders', async () => {
    const res = await call({
      operation: 'pdf',
      sourceType: 'template',
      templateId: TEMPLATE_ID,
      delivery: dl,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('Screenshot of a URL returns a PNG', async () => {
    const res = await call({
      operation: 'screenshot',
      sourceType: 'url',
      url: 'https://example.com',
      screenshotOptions: { imageType: 'png' },
      delivery: dl,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });

  it('E-Invoice (ZUGFeRD / EN 16931) returns a hybrid PDF', async () => {
    const invoice = {
      number: 'INV-SMOKE-1',
      issueDate: '2026-06-04',
      dueDate: '2026-07-04',
      currencyCode: 'EUR',
      seller: {
        name: 'Acme GmbH',
        address: { line1: 'Hauptstr. 1', city: 'Berlin', postalCode: '10115', countryCode: 'DE' },
        taxId: 'DE123456789',
      },
      buyer: {
        name: 'Buyer SARL',
        address: { line1: 'Rue 2', city: 'Paris', postalCode: '75001', countryCode: 'FR' },
      },
      lines: [
        {
          description: 'Widget',
          quantity: 2,
          unitPrice: 10,
          lineTotal: 20,
          vatRate: 19,
          vatCategoryCode: 'S',
        },
      ],
      taxSummary: [{ categoryCode: 'S', rate: 19, taxableAmount: 20, taxAmount: 3.8 }],
      paymentTerms: 'Net 30 days',
      totalNetAmount: 20,
      totalTaxAmount: 3.8,
      totalGrossAmount: 23.8,
    };
    const res = await call({
      operation: 'einvoice',
      sourceType: 'html',
      html: '<h1>Invoice INV-SMOKE-1</h1>',
      eInvoiceStandard: 'zugferd',
      eInvoiceProfile: 'en16931',
      invoice,
      delivery: dl,
    });
    if (res.status !== 200) {
      // Surface the validation detail to make a failure actionable.
      throw new Error(`e-invoice failed (${res.status}): ${await res.text()}`);
    }
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('polyDocRequest (the action HTTP path) returns PDF bytes', async () => {
    const auth = resolveAuth({ apiKey: API_KEY, sandbox: true, baseUrl: BASE });
    const request = buildRequestBody({
      operation: 'pdf',
      sourceType: 'html',
      html: '<h1>Client smoke</h1>',
      delivery: dl,
    });
    const response = await polyDocRequest(auth, request);
    await sleep(SANDBOX_GAP_MS);
    expect(response.status).toBe(200);
    const contentType = response.headers['content-type'];
    expect(String(contentType)).toContain('application/pdf');
    const buf = Buffer.from(response.body as ArrayBuffer);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
