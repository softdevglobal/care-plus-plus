# Care++

Care++ is a new, standalone codebase for a unified care and service operations workspace. It is **not** a fork of the existing CarePlus or BMS Pro Trade repositories. The current application is a reviewable care operations foundation with fictional demo data. The full combined system and data migration are [planned](docs/ROADMAP.md), not delivered by this first version.

## Run the local preview

Requires Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm demo
```

Open `http://127.0.0.1:3200/operations/dashboard`. The demo listens only on localhost and saves fictional records under `.local/operations-preview/`, which is excluded from Git.

## Current functions

- Care staff and client records, teams, care plans, medications, administration records, notes, forms, incidents, complaints, actions and reports.
- Weekly care scheduler, leave, timesheets, pricing, draft invoices and funding records.
- Search, filters, archive and restore, CSV export, revision checks and an in-app change history.
- Optional Firebase Authentication and Firestore wiring for a separately configured Care++ project. Only active provider administrators may access the operations API.

The application does **not** yet connect to BMS Pro Trade or ShiftCare. It does not send messages, collect payments, upload files, run payroll, automate clinical signals or provide complete mobile attendance. Demo records are fictional. The Firestore workspace is currently a bounded aggregate document, so it must be replaced with per-record storage, scalable audit retention and reviewed access controls before storing real care information.

## Independent Firebase setup

For a non-demo installation, create a **separate Care++ Firebase project** and fill the variables in `.env.example` through an uncommitted `.env.local` or your hosting environment. Enable email/password sign-in and verified emails. Provision each permitted account in Firestore as `memberships/{firebaseUid}` with `active: true`, `role: "provider_admin"` and an explicit `providerId`. No user can self-assign access from the UI. Keep service credentials on the server. This wiring is for development and review until the [production gates](docs/ROADMAP.md) are satisfied.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm build
```

The [comparison](docs/COMPARISON.md) records the observed BMS Pro Trade and ShiftCare workflows that guide the unified product.
