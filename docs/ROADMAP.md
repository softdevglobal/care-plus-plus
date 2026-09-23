# Care++ implementation roadmap

Current status: standalone care operations foundation with local fictional data and optional independent Firebase authentication/storage. This is a prototype, not a complete replacement for BMS Pro Trade or ShiftCare.

1. **Core architecture:** Replace the bounded single-document workspace with per-record collections, durable audit events, backups, granular roles, attachment storage and tested tenancy isolation.
2. **Trade work:** Build booking requests, inspections, quotations, jobs, services, item catalogue and customer decisions in Care++ with a documented status model.
3. **Shared identities and calendar:** Explicitly link trade customers to care participants when appropriate, unify staff profiles, add recurring and group care shifts, vacancies, attendance and approval.
4. **Care completeness:** Extend plans, medication administration safeguards, secure documents, forms, incidents, complaints, deadlines and action verification with regulatory review.
5. **Finance and communications:** Link delivered services to timesheets, pay rules and one invoice; handle funding, adjustments, payment reconciliation and consent-aware messaging.
6. **Migration and cutover:** Export from both current systems, map identities, import into staging, reconcile records and balances, test permissions and obtain acceptance before using Care++ for live operations.

Every stage needs automated domain tests, accessible desktop and mobile checks, and review with the people who perform the work. No production accounts or records were moved to create this repository.
