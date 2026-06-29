# Business Insurance Checks

Validates **Certificates of Motor Insurance** submitted for drivers and decides,
automatically, whether each one should be **approved**, **rejected** (with
reasons), or sent for **manual review**.

It is not just OCR. The pipeline is:

```
upload -> extract (OCR + structured data) -> normalise -> validate (rules) -> decide -> audit
```

against the authoritative driver/vehicle record held in the **TMC system**.

---

## What it checks

Every submission runs five checks plus document classification (see
`src/domain/matching/`):

| Check | Rule | Outcomes |
| --- | --- | --- |
| Document type | Must be a Certificate of Motor Insurance | reject if not / illegible; review if uncertain |
| Driver match | Name matches the TMC record | pass (exact) / review (partial) / reject (none/missing) |
| Vehicle match | Registration matches the TMC record | pass / reject (mismatch or missing) |
| Business use | Business use explicitly permitted | pass (yes) / review (unclear) / reject (no/missing) |
| Policy validity | Currently in cover | pass / reject (expired/missing dates) / review (future-dated) |

**Decision combiner** (`src/domain/decision.ts`):

- any check **fails** -> `REJECTED` (all failing reasons reported)
- any check needs **review**, extraction confidence is below the threshold, or
  tampering is suspected -> `MANUAL_REVIEW`
- otherwise -> `APPROVED`

A reject always takes precedence over a review, so reviewers only see genuinely
ambiguous cases. Duplicate files (same content hash) never auto-approve.

---

## Tech stack

- **Next.js (App Router) + TypeScript (strict)** - one repo for the intake API
  and the reviewer dashboard.
- **Prisma** - SQLite for local/dev (zero setup), Postgres for production (one
  connection-string change).
- **Zod** - validates every external boundary (env, webhook body, model output).
- **Vision LLM** for combined OCR + structured extraction, behind a provider
  port: OpenAI (`openai`) or Anthropic (`@anthropic-ai/sdk`), selectable by which
  API key is set.
- **Tailwind CSS v4 + lucide-react** - the reviewer UI (calm, professional, one
  accent colour; Linear/Vercel style).
- **Vitest** - unit tests on the pure validation logic and pipeline.

---

## Project structure

```
src/
  domain/                 Pure business logic (no I/O), fully unit-tested
    constants.ts          Statuses, check names, rejection reason taxonomy
    extraction.schema.ts  Zod contract for extracted certificate data
    normalise.ts          Name / registration normalisation
    matching/             One file per check (classify, driver, vehicle, usage, validity)
    decision.ts           Combine check results into a decision
    validate.ts           Run all checks end to end (pure)
  services/
    extraction/           Extractor port + Claude adapter + mock adapter
    tmc/                  TmcClient port + seed (fixtures) adapter
    pipeline.ts           Orchestration at the I/O edge (extract->validate->persist->audit)
    audit.ts              Append-only audit log writer
    submissions.ts        Dashboard data access + manual-review mutation
    runtime.ts            Wires production dependencies together
  lib/                    env (Zod), db (Prisma), auth (sessions + shared secret), labels
  app/                    Next.js routes: intake API, login, dashboard, detail
prisma/
  schema.prisma           Submission + AuditLog models
  seed.ts                 Synthetic data covering every decision path
fixtures/
  tmc-records.json        Seed TMC driver/vehicle records (stand-in for the API)
tests/                    Vitest suite
```

---

## Running locally

Requires Node 20+.

```bash
npm install
cp .env.example .env          # then fill in the secrets (see below)
npx prisma db push            # create the SQLite database
npm run db:seed               # load synthetic demo submissions
npm run dev                   # http://localhost:3000
```

Sign in to the dashboard with the `DASHBOARD_PASSWORD` you set in `.env`.

### Environment variables

Every variable is documented in [`.env.example`](./.env.example). The required
secrets:

- `INTAKE_SHARED_SECRET` - bearer token the intake caller must present.
- `DASHBOARD_PASSWORD` - reviewer login.
- `SESSION_SECRET` - signs session cookies.
- Extraction provider (**optional**, but required to read real documents).
  Precedence: `OPENAI_API_KEY` (uses `OPENAI_MODEL`, default `gpt-4o`), then
  `ANTHROPIC_API_KEY` (uses `ANTHROPIC_MODEL`). With neither set, the system uses
  the **mock extractor**, which does not read documents and returns fixed
  placeholder data (fine for dev and the dashboard; never use in production). The
  extraction mode used is recorded on every submission and shown in the UI.

Generate secrets with `openssl rand -hex 32`.

To smoke-test extraction against a real file:

```bash
node --env-file=.env --import tsx scripts/smoke-openai.ts path/to/certificate.pdf
```

---

## Submitting a document (intake API)

`POST /api/intake` - `multipart/form-data`, authenticated with the shared
secret.

```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Authorization: Bearer $INTAKE_SHARED_SECRET" \
  -F tmcReference=EMP-001 \
  -F "file=@certificate.pdf;type=application/pdf"
# -> 201 {"submissionId":"...","decision":"APPROVED"}
```

Fields:

- `tmcReference` - identifier used to look up the authoritative TMC record.
- `file` - the certificate. Accepts PDF, JPEG, PNG, WEBP, up to 15 MB.

Responses: `201` with the decision, `401` (bad secret), `400/413/415` (bad
input), `500` (logged server-side).

---

## Driver upload links (signed, no login)

The intended production flow: the TMC portal mints a signed link for a driver
and the driver uploads their certificate without logging in. The link carries
the expected driver name and registration, HMAC-signed, so the values the
certificate is matched against cannot be tampered with.

Mint a link (the portal calls this, authenticated with the intake secret):

```bash
curl -X POST http://localhost:3000/api/upload-links \
  -H "Authorization: Bearer $INTAKE_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reference":"EMP-001","driverName":"John Smith","vehicleRegistration":"AB12 CDE"}'
# -> 201 {"url":"http://localhost:3000/u/<signed-token>"}
```

The driver opens that URL (`/u/[token]`), uploads the document, and sees a
plain-language result. No TMC lookup happens: the match record comes from the
signed token. Links default to a 7-day lifetime (`ttlSeconds` overrides it).
`UPLOAD_LINK_SECRET` must match between the portal and this app.

## The reviewer dashboard

- **/** - submissions list with status counts and filters (All / Manual review /
  Approved / Rejected).
- **/upload** - submit a certificate through the UI; runs the same pipeline as the
  intake API and opens the resulting submission.
- **/submissions/[id]** - extracted fields side by side with the TMC record, each
  validation check and its outcome, rejection reasons, the full audit trail, and
  (for items awaiting review) **Approve / Reject** actions with a note.

Manual decisions are recorded with the reviewer, timestamp, and note, and append
a row to the audit log. Audit entries are never updated or deleted.

---

## Connecting the real TMC system

The single integration point is the `TmcClient` interface
(`src/services/tmc/tmc-client.ts`):

```ts
interface TmcClient {
  getRecord(reference: string): Promise<TmcRecord | null>;
}
```

The default `SeedTmcClient` reads `fixtures/tmc-records.json`. To use the real
API, implement this interface with an HTTP client and swap it in
`src/services/runtime.ts`. No business logic changes.

---

## Deployment

1. Set `provider = "postgresql"` in `prisma/schema.prisma` and point
   `DATABASE_URL` at Postgres.
2. Set all secrets and `ANTHROPIC_API_KEY` in the host's environment.
3. `npm run build` then `npm run start` (the build runs `prisma generate`).
4. Run `npx prisma db push` (or `prisma migrate deploy` if you adopt migrations)
   against the production database.

Any Node host works (Railway, Render, Fly, a container). Uploaded files are
written to `./uploads`; mount a persistent volume there, or swap the file write
in `src/services/pipeline.ts` for object storage.

---

## Maintenance

- **Where the logs live**: every state change is in the `AuditLog` table (open it
  with `npm run db:studio`). Unexpected server errors are logged to stdout.
- **Add or update TMC records (dev)**: edit `fixtures/tmc-records.json`.
- **Tune auto-review sensitivity**: change `CONFIDENCE_THRESHOLD` in the
  environment.
- **Add a rejection reason or exception rule**: add the code to
  `src/domain/constants.ts` and emit it from the relevant check in
  `src/domain/matching/`. Add a test in `tests/`.
- **Change the extraction model**: set `ANTHROPIC_MODEL`.

---

## Tests

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
```

The suite covers normalisation, every check, the decision combiner, the adapters,
and the pipeline (including the unknown-reference, extraction-failure, and
duplicate paths).
