# BMS Pro Trade and ShiftCare comparison

Observed on 23 September 2026 using signed-in accounts. This records visible workflows, not an audit of either vendor's backend. No live records or settings were changed.

| Area | BMS Pro Trade observed | ShiftCare observed | Care++ direction |
| --- | --- | --- | --- |
| Entry point | Today dashboard and customer activity | Care operations dashboard | One role-aware home and task feed |
| Calendar | Inspections and jobs, staff assignment, capacity and service filters | Staff and client roster, vacant and recurring shifts, publishing | Shared calendar with distinct trade and care states |
| Work requests | Public booking link and inspection request pipeline | Care shift requests and job board | Retain request, inspection and care shift flows |
| Quotations and jobs | Draft and sent quotes, acceptance, jobs and tasks | No equivalent trade quote flow inspected | Implement trade workflow in Care++ |
| People | Customers and trade staff | Participants, carers, teams and onboarding | Link profiles with explicit role and identity mapping |
| Invoicing | Job invoices and payment status | Shift invoices, pay items, timesheets and funding | One billing ledger with traceable source service |
| Care delivery | CarePlus record capture screen | Plans, medications, notes, forms and documents | Permission-controlled care modules and secure files |
| Governance | CarePlus incident, complaint, risk, evidence and action capture | Complaint workflow, incident reports, actions and signals | One case register linked to a participant, job or visit |
| Communication | SMS controls and notifications | Messages and notifications | Delivery, consent and audit rules before enabling sends |

BMS currently shows a CarePlus record delivery screen with zero deliveries in the inspected account and customers marked as not mapped. This is evidence of the visible interface only; the integration was not exercised. ShiftCare supplied the reference for deeper rostering and care work. Care++ is a new application codebase and does not reuse either production database or automatically import their records.

The target is one login and navigation, linked staff and customer/participant identities, a shared scheduling entry point and one billing workflow. The [roadmap](ROADMAP.md) lists the implementation and migration gates. The first Care++ commit contains a standalone care operations foundation; trade workflows and live integrations remain to be built.
