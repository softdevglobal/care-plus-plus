/** Care++ operations domain. Demo records are fictional. */
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
  reference?: string;
  default?: string | number | boolean;
};
export type Module = {
  id: string;
  label: string;
  singular: string;
  group: string;
  action: string;
  columns: string[];
  fields: Field[];
  statuses?: string[];
};
const f = (
  key: string,
  label: string,
  type: Field['type'] = 'text',
  extra: Partial<Field> = {},
): Field => ({ key, label, type, ...extra });
const title = f('title', 'Title', 'text', { required: true });
const date = f('date', 'Date', 'date', { required: true });
const client = f('clientId', 'Client', 'select', { reference: 'clients' });
const staff = f('staffId', 'Staff', 'select', { reference: 'staff' });
const assignee = f('assigneeId', 'Assignee', 'select', { reference: 'staff' });
const notes = f('notes', 'Notes', 'textarea');
const due = f('due', 'Due Date', 'date');
const priority = f('priority', 'Priority', 'select', {
  options: ['Low', 'Normal', 'High', 'Critical'],
  default: 'Normal',
});
const status = (options: string[]) =>
  f('status', 'Status', 'select', { options, default: options[0] });
export const complaintCategories = [
  'Service Delivery',
  'Staff Conduct',
  'Communication',
  'Billing',
  'Safety',
  'Rights & Dignity',
  'Privacy',
  'Other',
];
export const shiftTypes = [
  'Personal Care',
  'Domestic Assistance',
  'Community Access',
  'Transport',
  'Support Coordination',
  'Sleepover',
  'Night Shift',
  'Respite Care',
  '24 Hour Care',
  'On Call',
  'Remote Work',
];
export const modules: Module[] = [
  {
    id: 'staff',
    label: 'Staff',
    singular: 'Staff member',
    group: 'PEOPLE',
    action: 'Add Staff',
    columns: ['name', 'role', 'teamId', 'email', 'phone', 'employment', 'status'],
    statuses: ['Active', 'Onboarding', 'Inactive'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('preferredName', 'Preferred Name'),
      f('email', 'Email', 'email', { required: true }),
      f('phone', 'Mobile'),
      f('role', 'Role', 'select', {
        options: ['Carer', 'Office User', 'Administrator'],
        default: 'Carer',
      }),
      f('teamId', 'Team', 'select', { reference: 'teams' }),
      f('employment', 'Employment Type', 'select', {
        options: ['Casual', 'Part Time', 'Full Time', 'Contractor'],
        default: 'Casual',
      }),
      f('gender', 'Gender'),
      f('birthDate', 'Date of Birth', 'date'),
      f('address', 'Address'),
      f('emergencyContact', 'Emergency Contact'),
      f('joined', 'Joined Date', 'date'),
      f('review', 'Next Review Date', 'date'),
      f('maxHours', 'Weekly Hour Cap', 'number', { default: 38 }),
      status(['Active', 'Onboarding', 'Inactive']),
      notes,
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    singular: 'Client',
    group: 'PEOPLE',
    action: 'Add Client',
    columns: ['name', 'type', 'email', 'phone', 'ndisNumber', 'teamId', 'status'],
    statuses: ['Active', 'Onboarding', 'Inactive'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('preferredName', 'Preferred Name'),
      f('type', 'Client Type', 'select', {
        options: ['NDIS', 'Private', 'Aged Care', 'Other'],
        default: 'NDIS',
      }),
      f('email', 'Email', 'email'),
      f('phone', 'Mobile'),
      f('address', 'Address'),
      f('birthDate', 'Date of Birth', 'date'),
      f('ndisNumber', 'NDIS Number'),
      f('teamId', 'Team', 'select', { reference: 'teams' }),
      f('emergencyContact', 'Emergency Contact'),
      f('needs', 'Need to Know', 'textarea'),
      f('preferences', 'Useful Information', 'textarea'),
      f('review', 'Review Date', 'date'),
      status(['Active', 'Onboarding', 'Inactive']),
      notes,
    ],
  },
  {
    id: 'teams',
    label: 'Teams',
    singular: 'Team',
    group: 'PEOPLE',
    action: 'New Team',
    columns: ['name', 'managerId', 'location', 'status'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('managerId', 'Team Manager', 'select', { reference: 'staff' }),
      f('location', 'Location'),
      status(['Active', 'Inactive']),
      notes,
    ],
  },
  {
    id: 'shifts',
    label: 'Scheduler',
    singular: 'Shift',
    group: '',
    action: 'Add Shift',
    columns: ['title', 'clientId', 'staffId', 'date', 'start', 'end', 'status'],
    statuses: ['Draft', 'Published', 'Completed', 'Cancelled'],
    fields: [
      title,
      client,
      staff,
      date,
      f('start', 'Start Time', 'time', { required: true, default: '09:00' }),
      f('end', 'End Time', 'time', { required: true, default: '17:00' }),
      f('breakMinutes', 'Unpaid Break (minutes)', 'number', { default: 0 }),
      f('type', 'Shift Type', 'select', { options: shiftTypes, default: 'Personal Care' }),
      f('location', 'Location'),
      f('rate', 'Hourly Charge ($)', 'number', { default: 0 }),
      f('payRate', 'Hourly Cost ($)', 'number', { default: 0 }),
      status(['Draft', 'Published', 'Completed', 'Cancelled']),
      notes,
    ],
  },
  {
    id: 'leave',
    label: 'Leave & Availability',
    singular: 'Leave request',
    group: 'PEOPLE',
    action: 'Add Leave',
    columns: ['staffId', 'date', 'endDate', 'type', 'status'],
    fields: [
      { ...staff, required: true },
      date,
      f('endDate', 'End Date', 'date', { required: true }),
      f('type', 'Leave Type', 'select', {
        options: ['Annual Leave', 'Personal Leave', 'Unpaid Leave', 'Unavailable'],
        default: 'Annual Leave',
      }),
      status(['Pending', 'Approved', 'Declined']),
      notes,
    ],
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    singular: 'Timesheet',
    group: 'FINANCE',
    action: 'Add Timesheet',
    columns: ['staffId', 'date', 'start', 'end', 'breakMinutes', 'status'],
    statuses: ['Unapproved', 'Approved', 'Exported'],
    fields: [
      { ...staff, required: true },
      client,
      f('shiftId', 'Shift', 'select', { reference: 'shifts' }),
      date,
      f('start', 'Clock In', 'time', { required: true }),
      f('end', 'Clock Out', 'time', { required: true }),
      f('breakMinutes', 'Unpaid Break (minutes)', 'number', { default: 0 }),
      status(['Unapproved', 'Approved', 'Exported']),
      notes,
    ],
  },
  {
    id: 'pay-items',
    label: 'Pay Items',
    singular: 'Pay item',
    group: 'FINANCE',
    action: 'Add Pay Item',
    columns: ['name', 'group', 'days', 'start', 'end', 'rate', 'externalId'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('group', 'Pay Group', 'text', { default: 'Default Casual' }),
      f('days', 'Day of Week', 'select', {
        options: ['Weekdays', 'Saturday', 'Sunday', 'Public Holidays'],
        default: 'Weekdays',
      }),
      f('start', 'Start Time', 'time', { default: '06:00' }),
      f('end', 'End Time', 'time', { default: '20:00' }),
      f('rate', 'Rate ($)', 'number', { required: true }),
      f('effective', 'Effective Date', 'date'),
      f('externalId', 'External ID'),
      notes,
    ],
  },
  {
    id: 'pricebooks',
    label: 'Price Books',
    singular: 'Price book item',
    group: 'FINANCE',
    action: 'Add Price',
    columns: ['name', 'itemCode', 'unit', 'rate', 'effective'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('itemCode', 'Support Item Code'),
      f('unit', 'Unit', 'select', {
        options: ['Hour', 'Each', 'Kilometre', 'Day'],
        default: 'Hour',
      }),
      f('rate', 'Rate ($)', 'number', { required: true }),
      f('effective', 'Effective Date', 'date'),
      notes,
    ],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    singular: 'Invoice',
    group: 'FINANCE',
    action: 'Generate Invoice',
    columns: ['reference', 'clientId', 'amount', 'paid', 'status', 'date', 'due'],
    statuses: ['Draft', 'Issued', 'Paid', 'Void'],
    fields: [
      { ...client, required: true },
      f('shiftId', 'Source Shift', 'select', { reference: 'shifts' }),
      date,
      { ...due, required: true },
      f('description', 'Service Description', 'textarea', { required: true }),
      f('quantity', 'Quantity', 'number', { default: 1, required: true }),
      f('rate', 'Unit Price ($)', 'number', { required: true }),
      f('taxRate', 'Tax (%)', 'number', { default: 0 }),
      f('paid', 'Payment Recorded ($)', 'number', { default: 0 }),
      status(['Draft', 'Issued', 'Paid', 'Void']),
      notes,
    ],
  },
  {
    id: 'funds',
    label: 'Client Funding',
    singular: 'Funding allocation',
    group: 'FINANCE',
    action: 'Add Funding',
    columns: ['name', 'clientId', 'budget', 'spent', 'date', 'due'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      { ...client, required: true },
      f('budget', 'Allocated Budget ($)', 'number', { required: true }),
      f('spent', 'Recorded Usage ($)', 'number', { default: 0 }),
      date,
      { ...due, label: 'Expiry Date' },
      f('manager', 'Plan Manager'),
      notes,
    ],
  },
  {
    id: 'medications',
    label: 'Medications',
    singular: 'Medication plan',
    group: 'OPERATIONS',
    action: 'Add Medication',
    columns: ['name', 'clientId', 'dose', 'route', 'frequency', 'status'],
    fields: [
      f('name', 'Medication', 'text', { required: true }),
      { ...client, required: true },
      f('dose', 'Prescribed Dose', 'text', { required: true }),
      f('route', 'Route', 'select', {
        options: ['Oral', 'Topical', 'Inhaled', 'Other'],
        default: 'Oral',
      }),
      f('frequency', 'Prescribed Schedule', 'text', { required: true }),
      f('prescriber', 'Prescriber'),
      f('instructions', 'Source Plan Instructions', 'textarea', { required: true }),
      f('review', 'Review Date', 'date'),
      status(['Active', 'Paused', 'Ceased']),
      notes,
    ],
  },
  {
    id: 'administrations',
    label: 'Medication Records',
    singular: 'Administration record',
    group: 'OPERATIONS',
    action: 'Record Administration',
    columns: ['medicationId', 'clientId', 'staffId', 'date', 'time', 'outcome'],
    fields: [
      f('medicationId', 'Medication Plan', 'select', { reference: 'medications', required: true }),
      { ...client, required: true },
      { ...staff, required: true },
      date,
      f('time', 'Time', 'time', { required: true }),
      f('outcome', 'Outcome', 'select', {
        options: ['Administered', 'Refused', 'Missed', 'Withheld'],
        required: true,
      }),
      notes,
    ],
  },
  {
    id: 'care-plans',
    label: 'Care Plans',
    singular: 'Care plan',
    group: 'OPERATIONS',
    action: 'Add Care Plan',
    columns: ['title', 'clientId', 'assigneeId', 'review', 'status'],
    fields: [
      title,
      { ...client, required: true },
      assignee,
      f('goals', 'Goals', 'textarea', { required: true }),
      f('tasks', 'Support Tasks', 'textarea'),
      f('consent', 'Consent Recorded', 'checkbox'),
      f('review', 'Review Date', 'date'),
      status(['Draft', 'Active', 'Completed', 'Archived']),
      notes,
    ],
  },
  {
    id: 'notes',
    label: 'Progress Notes',
    singular: 'Progress note',
    group: 'OPERATIONS',
    action: 'Add Note',
    columns: ['title', 'clientId', 'staffId', 'date', 'category', 'status'],
    fields: [
      title,
      { ...client, required: true },
      staff,
      date,
      f('category', 'Category', 'select', {
        options: ['Progress Notes', 'Feedback', 'Enquiry', 'Incident'],
        default: 'Progress Notes',
      }),
      f('description', 'Note', 'textarea', { required: true }),
      status(['Submitted', 'Reviewed', 'Follow Up']),
      notes,
    ],
  },
  {
    id: 'documents',
    label: 'Document Hub',
    singular: 'Document',
    group: 'DOCUMENTATION',
    action: 'Add Document',
    columns: ['name', 'category', 'clientId', 'staffId', 'expiry', 'status'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('category', 'Category', 'select', {
        options: ['Policy', 'Staff Credential', 'Client Agreement', 'Care Plan', 'Other'],
        default: 'Other',
      }),
      client,
      staff,
      f('expiry', 'Expiry Date', 'date'),
      status(['Draft', 'Current', 'Expired', 'Archived']),
      f('content', 'Document Text', 'textarea'),
      notes,
    ],
  },
  {
    id: 'forms',
    label: 'Forms',
    singular: 'Form template',
    group: 'DOCUMENTATION',
    action: 'Create Form',
    columns: ['name', 'category', 'status', 'updatedAt'],
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('category', 'Category', 'select', {
        options: ['Client Intake', 'Staff Onboarding', 'Feedback', 'Assessment', 'Other'],
        default: 'Other',
      }),
      f('questions', 'Questions (one per line)', 'textarea', { required: true }),
      status(['Draft', 'Published', 'Archived']),
      notes,
    ],
  },
  {
    id: 'responses',
    label: 'Form Responses',
    singular: 'Form response',
    group: 'DOCUMENTATION',
    action: 'Add Response',
    columns: ['formId', 'clientId', 'staffId', 'date', 'status'],
    fields: [
      f('formId', 'Form', 'select', { reference: 'forms', required: true }),
      client,
      staff,
      date,
      f('answers', 'Answers', 'textarea', { required: true }),
      status(['Submitted', 'Reviewed']),
      notes,
    ],
  },
  {
    id: 'incidents',
    label: 'Incidents',
    singular: 'Incident',
    group: 'DOCUMENTATION',
    action: 'New Ticket',
    columns: ['reference', 'title', 'status', 'date', 'due', 'clientId', 'assigneeId', 'priority'],
    statuses: ['Open', 'Investigating', 'Escalated', 'Resolved'],
    fields: [
      title,
      client,
      staff,
      date,
      due,
      assignee,
      priority,
      f('category', 'Category', 'select', {
        options: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'],
        required: true,
      }),
      f('description', 'What Happened', 'textarea', { required: true }),
      f('immediateAction', 'Immediate Actions', 'textarea'),
      f('reportability', 'NDIS Reportability', 'select', {
        options: ['Pending Assessment', 'Reportable', 'Not Reportable'],
        default: 'Pending Assessment',
      }),
      status(['Open', 'Investigating', 'Escalated', 'Resolved']),
      f('resolution', 'Resolution', 'textarea'),
    ],
  },
  {
    id: 'complaints',
    label: 'Complaints',
    singular: 'Complaint',
    group: 'DOCUMENTATION',
    action: 'Lodge a Complaint',
    columns: [
      'reference',
      'status',
      'risk',
      'category',
      'clientId',
      'assigneeId',
      'due',
      'updatedAt',
    ],
    statuses: ['Open', 'Acknowledged', 'Investigating', 'Resolved', 'Closed'],
    fields: [
      title,
      f('description', 'Description', 'textarea'),
      f('category', 'Category', 'select', { options: complaintCategories, required: true }),
      { ...date, label: 'Date Received' },
      assignee,
      due,
      f('private', 'Mark this complaint as private', 'checkbox'),
      { ...client, label: 'Participant' },
      f('complainant', 'Complainant Name'),
      f('contact', 'Contact Details'),
      f('relationship', 'Relationship to Participant'),
      f('channel', 'Received Via', 'select', {
        options: ['Phone', 'Email', 'In Person', 'Online', 'Other'],
        default: 'Email',
      }),
      f('risk', 'Risk Level', 'select', {
        options: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low',
      }),
      f('outcome', 'Desired Outcome', 'textarea'),
      status(['Open', 'Acknowledged', 'Investigating', 'Resolved', 'Closed']),
      f('resolution', 'Resolution', 'textarea'),
    ],
  },
  {
    id: 'actions',
    label: 'Action Items',
    singular: 'Action item',
    group: 'DOCUMENTATION',
    action: 'New Action Item',
    columns: ['title', 'assigneeId', 'due', 'priority', 'status', 'parent'],
    statuses: ['Open', 'In Progress', 'Awaiting Verification', 'Completed'],
    fields: [
      title,
      assignee,
      due,
      priority,
      f('parent', 'Related Reference'),
      f('description', 'Description', 'textarea'),
      status(['Open', 'In Progress', 'Awaiting Verification', 'Completed']),
      f('resolution', 'Completion Details', 'textarea'),
    ],
  },
  {
    id: 'signals',
    label: 'Signals',
    singular: 'Risk signal',
    group: '',
    action: 'Add Signal',
    columns: ['risk', 'clientId', 'category', 'title', 'staffId', 'status'],
    statuses: ['Open', 'Needs Follow Up', 'Incident', 'Acknowledged', 'Cleared'],
    fields: [
      title,
      client,
      staff,
      date,
      f('risk', 'Risk', 'select', {
        options: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium',
      }),
      f('category', 'Category', 'select', {
        options: ['Safety', 'Behaviour', 'Medication', 'Documentation', 'Other'],
        default: 'Other',
      }),
      f('description', 'Evidence / Source Note', 'textarea', { required: true }),
      status(['Open', 'Needs Follow Up', 'Incident', 'Acknowledged', 'Cleared']),
      notes,
    ],
  },
  {
    id: 'certifications',
    label: 'Certifications',
    singular: 'Certification',
    group: 'ADMIN',
    action: 'Add Certification',
    columns: ['name', 'staffId', 'issuer', 'expiry', 'status'],
    fields: [
      f('name', 'Certification', 'text', { required: true }),
      { ...staff, required: true },
      f('issuer', 'Issuer'),
      f('number', 'Credential Reference'),
      f('date', 'Issue Date', 'date'),
      f('expiry', 'Expiry Date', 'date'),
      status(['Pending Verification', 'Verified', 'Expired']),
      notes,
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    singular: 'HR case',
    group: 'ADMIN',
    action: 'Add HR Record',
    columns: ['title', 'staffId', 'category', 'due', 'status'],
    fields: [
      title,
      staff,
      f('category', 'Category', 'select', {
        options: ['Onboarding', 'Review', 'Training', 'Employment', 'Other'],
        default: 'Onboarding',
      }),
      due,
      status(['Open', 'In Progress', 'Completed']),
      notes,
    ],
  },
  {
    id: 'messages',
    label: 'Messages',
    singular: 'Message draft',
    group: 'ADMIN',
    action: 'New Draft',
    columns: ['title', 'recipient', 'updatedAt', 'status'],
    fields: [
      f('title', 'Subject', 'text', { required: true }),
      f('recipient', 'Recipient'),
      f('body', 'Message', 'textarea', { required: true }),
      status(['Draft', 'Archived']),
    ],
  },
];
export type OpRecord = {
  id: string;
  module: string;
  reference: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  archived: boolean;
  [key: string]: string | number | boolean;
};
export type OpEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  module: string;
  recordId: string;
  title: string;
};
export type Settings = {
  name: string;
  timezone: string;
  weekStart: string;
  timeFormat: string;
  payRun: string;
  invoicePrefix: string;
  invoiceTerms: number;
  address: string;
  email: string;
  phone: string;
};
export type OperationsState = {
  version: 1;
  revision: number;
  records: OpRecord[];
  events: OpEvent[];
  settings: Settings;
};
export const initialSettings: Settings = {
  name: 'Care++',
  timezone: 'Australia/Sydney',
  weekStart: 'Monday',
  timeFormat: '12-hour',
  payRun: 'Weekly',
  invoicePrefix: 'INV',
  invoiceTerms: 14,
  address: '',
  email: '',
  phone: '',
};
export const moduleById = (id: string) => modules.find((m) => m.id === id);
export const isoDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDays = (value: string, n: number) => {
  const d = new Date(value + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export function shiftHours(row: Record<string, unknown>) {
  const minute = (s: unknown) => {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + m;
  };
  let minutes = minute(row.end) - minute(row.start);
  if (minutes <= 0) minutes += 1440;
  return Math.max(0, (minutes - Number(row.breakMinutes || 0)) / 60);
}
export const money = (n: unknown) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(n) || 0);
export function invoiceTotals(row: Record<string, unknown>) {
  const subtotal = Math.round(Number(row.quantity) * Number(row.rate) * 100);
  const tax = Math.round((subtotal * Number(row.taxRate || 0)) / 100);
  return {
    subtotal: subtotal / 100,
    tax: tax / 100,
    amount: (subtotal + tax) / 100,
    balance: Math.max(0, subtotal + tax - Math.round(Number(row.paid || 0) * 100)) / 100,
  };
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
}
export function validateValues(
  module: string,
  values: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const definition = moduleById(module);
  if (!definition) throw new Error('Unknown module.');
  const allowed = new Set(definition.fields.map((f) => f.key));
  for (const key of Object.keys(values))
    if (!allowed.has(key)) throw new Error(`Unknown field: ${key}`);
  const result: Record<string, string | number | boolean> = {};
  for (const field of definition.fields) {
    const raw = values[field.key] ?? field.default ?? (field.type === 'checkbox' ? false : '');
    if (!['string', 'number', 'boolean'].includes(typeof raw))
      throw new Error(`${field.label}: invalid value.`);
    if (field.type === 'checkbox') {
      if (typeof raw !== 'boolean') throw new Error(`${field.label}: choose yes or no.`);
      result[field.key] = raw;
      continue;
    }
    const value = String(raw).trim();
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (value.length > (field.type === 'textarea' ? 12000 : 300))
      throw new Error(`${field.label} is too long.`);
    if (field.type === 'number' && value) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 1e8)
        throw new Error(`${field.label}: enter a valid non-negative number.`);
      result[field.key] = n;
      continue;
    }
    if (
      field.type === 'date' &&
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw new Error(`${field.label}: invalid date.`);
    if (field.type === 'time' && value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
      throw new Error(`${field.label}: invalid time.`);
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      throw new Error(`${field.label}: invalid email.`);
    if (field.options && value && !field.options.includes(value))
      throw new Error(`${field.label}: invalid option.`);
    result[field.key] = value;
  }
  if (['shifts', 'timesheets'].includes(module) && (!shiftHours(result) || shiftHours(result) > 24))
    throw new Error('The unpaid break must be shorter than the shift.');
  if (module === 'invoices') {
    if (Number(result.quantity) <= 0) throw new Error('Quantity must be greater than zero.');
    if (Number(result.taxRate) > 100) throw new Error('Tax cannot exceed 100%.');
    Object.assign(result, invoiceTotals(result));
    if (Number(result.paid) > Number(result.amount))
      throw new Error('Payment exceeds the invoice total.');
    if (result.status === 'Paid' && Number(result.balance) > 0)
      throw new Error('Record the full payment before marking the invoice paid.');
    if (String(result.due) < String(result.date))
      throw new Error('Due date cannot precede issue date.');
  }
  if (module === 'leave' && String(result.endDate) < String(result.date))
    throw new Error('End date cannot precede start date.');
  if (
    ['complaints', 'incidents'].includes(module) &&
    ['Resolved', 'Closed'].includes(String(result.status)) &&
    !result.resolution
  )
    throw new Error('Add a resolution before closing this case.');
  return result;
}
export function validateRelations(
  module: string,
  values: Record<string, string | number | boolean>,
  records: OpRecord[],
  id?: string,
) {
  const previous = id ? records.find((r) => r.id === id && r.module === module) : undefined;
  for (const field of moduleById(module)!.fields)
    if (
      field.reference &&
      values[field.key] &&
      !records.some(
        (r) =>
          r.module === field.reference &&
          r.id === values[field.key] &&
          (!r.archived || previous?.[field.key] === r.id),
      )
    )
      throw new Error(`${field.label}: select an available record.`);
  if (['timesheets', 'invoices'].includes(module) && values.shiftId) {
    const shift = records.find((r) => r.module === 'shifts' && r.id === values.shiftId);
    if (shift?.clientId !== values.clientId)
      throw new Error('The source shift belongs to a different client.');
    if (module === 'timesheets' && shift?.staffId !== values.staffId)
      throw new Error('The source shift belongs to a different staff member.');
    if (module === 'invoices' && shift?.status !== 'Completed')
      throw new Error('Complete the source shift before invoicing it.');
    if (
      records.some(
        (r) =>
          r.module === module && r.id !== id && r.shiftId === values.shiftId && r.status !== 'Void',
      )
    )
      throw new Error(
        `This shift already has a ${module === 'invoices' ? 'non-void invoice' : 'timesheet'}.`,
      );
  }
  if (module === 'shifts' && values.staffId && values.status !== 'Cancelled') {
    const interval = (r: Record<string, unknown>) => {
      const start = Date.parse(`${r.date}T${r.start}:00`);
      let end = Date.parse(`${r.date}T${r.end}:00`);
      if (end <= start) end += 86400000;
      return [start, end];
    };
    const [a, b] = interval(values);
    for (const row of records.filter(
      (r) =>
        r.module === 'shifts' &&
        r.id !== id &&
        !r.archived &&
        r.staffId === values.staffId &&
        r.status !== 'Cancelled',
    )) {
      const [c, d] = interval(row);
      if (a < d && b > c) throw new Error('This staff member already has an overlapping shift.');
    }
    if (
      records.some(
        (r) =>
          r.module === 'leave' &&
          !r.archived &&
          r.status === 'Approved' &&
          r.staffId === values.staffId &&
          String(r.date) <= String(values.date) &&
          String(r.endDate) >= String(values.date),
      )
    )
      throw new Error('This staff member has approved leave on this date.');
  }
  if (module === 'administrations') {
    const plan = records.find((r) => r.id === values.medicationId);
    if (plan?.clientId !== values.clientId)
      throw new Error('The medication plan belongs to a different client.');
    if (plan?.status !== 'Active') throw new Error('The medication plan is not active.');
  }
}
export function emptyOperations(): OperationsState {
  return { version: 1, revision: 0, records: [], events: [], settings: { ...initialSettings } };
}
export function seedOperations(): OperationsState {
  const state = emptyOperations();
  state.settings.name = 'Horizon Care';
  const today = isoDate();
  const add = (module: string, id: string, values: Record<string, unknown>) => {
    const now = new Date().toISOString();
    state.records.push({
      id,
      module,
      reference: `${module.slice(0, 3).toUpperCase()}-${String(state.records.length + 1).padStart(4, '0')}`,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: 'Sample data',
      archived: false,
      ...validateValues(module, values),
    });
  };
  add('teams', 'team-community', { name: 'Community Support', location: 'Sydney' });
  add('staff', 'staff-amelia', {
    name: 'Amelia Reed',
    email: 'amelia@example.test',
    phone: '0400 000 001',
    role: 'Administrator',
    teamId: 'team-community',
  });
  add('staff', 'staff-sarah', {
    name: 'Sarah Mitchell',
    email: 'sarah@example.test',
    phone: '0400 000 002',
    teamId: 'team-community',
  });
  add('staff', 'staff-james', {
    name: 'James Wilson',
    email: 'james@example.test',
    phone: '0400 000 003',
    employment: 'Part Time',
    teamId: 'team-community',
  });
  add('clients', 'client-alex', {
    name: 'Alex Morgan',
    email: 'alex@example.test',
    phone: '0400 000 101',
    teamId: 'team-community',
    needs: 'Fictional sample client.',
    preferences: 'Enjoys community activities.',
  });
  add('clients', 'client-jordan', {
    name: 'Jordan Lee',
    email: 'jordan@example.test',
    teamId: 'team-community',
  });
  for (let i = 0; i < 5; i++)
    add('shifts', `shift-${i}`, {
      title: i % 2 ? 'Community access' : 'Personal care',
      clientId: i % 2 ? 'client-jordan' : 'client-alex',
      staffId: i === 4 ? '' : i % 2 ? 'staff-james' : 'staff-sarah',
      date: addDays(today, i - 2),
      start: '09:00',
      end: '13:00',
      rate: 65,
      payRate: 38,
      status: i < 2 ? 'Completed' : i === 4 ? 'Draft' : 'Published',
      type: i % 2 ? 'Community Access' : 'Personal Care',
    });
  add('timesheets', 'time-1', {
    staffId: 'staff-sarah',
    clientId: 'client-alex',
    shiftId: 'shift-0',
    date: addDays(today, -2),
    start: '09:00',
    end: '13:00',
  });
  add('care-plans', 'plan-1', {
    title: 'Community participation',
    clientId: 'client-alex',
    assigneeId: 'staff-sarah',
    goals: 'Build confidence attending a weekly community activity.',
    tasks: 'Discuss preferred activity\nSupport travel\nRecord feedback',
    consent: true,
    review: addDays(today, 30),
    status: 'Active',
  });
  add('actions', 'action-1', {
    title: 'Review client support preferences',
    assigneeId: 'staff-amelia',
    due: addDays(today, 2),
    priority: 'Normal',
  });
  add('documents', 'document-1', {
    name: 'Feedback and complaints procedure',
    category: 'Policy',
    status: 'Current',
    content:
      'Sample procedure\n1. Record the concern.\n2. Assign an owner and acknowledge receipt.\n3. Investigate and agree follow-up actions.\n4. Record the outcome and review learning.',
  });
  add('forms', 'form-1', {
    name: 'Service Feedback',
    category: 'Feedback',
    questions: 'How was your recent support?\nWhat worked well?\nWhat could we improve?',
    status: 'Published',
  });
  add('pricebooks', 'price-1', {
    name: 'Personal care - weekday',
    unit: 'Hour',
    rate: 65,
    effective: today,
  });
  add('pay-items', 'pay-1', { name: 'Weekday ordinary hours', rate: 38, effective: today });
  add('funds', 'fund-1', {
    name: 'Community participation',
    clientId: 'client-alex',
    budget: 12000,
    spent: 1040,
    date: today,
    due: addDays(today, 365),
  });
  return state;
}
