'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  Users,
  UserRound,
  Layers,
  Clock3,
  Wallet,
  Receipt,
  Pill,
  FolderOpen,
  FileText,
  Flag,
  TriangleAlert,
  ListChecks,
  ChartNoAxesCombined,
  Settings,
  Plug,
  Award,
  BriefcaseBusiness,
  Download,
  Search,
  PanelLeft,
  HelpCircle,
  MessageCircle,
  Bell,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Check,
  ArrowLeft,
  ArrowUpDown,
  Archive,
  RotateCcw,
  Printer,
  Mail,
  Bookmark,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Send,
  MoreHorizontal,
  ClipboardList,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { clientAuth, type ClientConfig } from '@/lib/client';
import { SignIn } from '@/components/sign-in';
import {
  modules,
  moduleById,
  isoDate,
  addDays,
  shiftHours,
  money,
  invoiceTotals,
  csvCell,
  validateValues,
  type Field,
  type OpRecord,
  type OperationsState,
  type Settings as SettingsData,
  type Module,
} from '@/lib/operations';
import styles from './workspace.module.css';

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  shifts: CalendarDays,
  signals: Activity,
  staff: UserRound,
  clients: Users,
  teams: Layers,
  leave: CalendarDays,
  timesheets: Clock3,
  'pay-items': Wallet,
  pricebooks: Wallet,
  invoices: Receipt,
  funds: Wallet,
  medications: Pill,
  administrations: CheckCircle2,
  'care-plans': ClipboardList,
  notes: FileText,
  documents: FolderOpen,
  forms: FileText,
  responses: ClipboardList,
  incidents: TriangleAlert,
  complaints: Flag,
  actions: ListChecks,
  reports: ChartNoAxesCombined,
  account: Settings,
  integrations: Plug,
  certifications: Award,
  hr: BriefcaseBusiness,
  downloads: Download,
  audit: Clock3,
  messages: MessageCircle,
};
const navigation = [
  { group: '', items: ['dashboard', 'shifts', 'signals'] },
  { group: 'PEOPLE', items: ['staff', 'clients', 'teams', 'leave'] },
  { group: 'FINANCE', items: ['timesheets', 'pay-items', 'pricebooks', 'invoices', 'funds'] },
  { group: 'OPERATIONS', items: ['medications', 'administrations', 'care-plans', 'notes'] },
  {
    group: 'DOCUMENTATION',
    items: ['documents', 'forms', 'responses', 'incidents', 'complaints', 'actions'],
  },
  { group: 'INTELLIGENCE', items: ['reports'] },
  { group: 'ADMIN', items: ['account', 'integrations', 'certifications', 'hr', 'audit'] },
];
const label = (id: string) =>
  moduleById(id)?.label ||
  (
    {
      dashboard: 'Dashboard',
      reports: 'Reports',
      account: 'Account',
      integrations: 'Integrations',
      downloads: 'Download Center',
      audit: 'Activity Log',
    } as Record<string, string>
  )[id] ||
  id;
const dateText = (value: unknown) =>
  value
    ? new Date(String(value).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const initials = (name: unknown) =>
  String(name || '')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
type Draft = {
  module: string;
  record?: OpRecord;
  values: Record<string, string | number | boolean>;
};
type Report = {
  id: string;
  title: string;
  description: string;
  module: string;
  group: string;
  filter?: (r: OpRecord) => boolean;
};
const reportDefinitions: Report[] = [
  {
    id: 'vacant',
    title: 'Vacant Shifts',
    description: "Shifts that don't have assigned staff members.",
    module: 'shifts',
    group: 'Shifts',
    filter: (r) => !r.staffId && r.status !== 'Cancelled',
  },
  {
    id: 'shift-details',
    title: 'Shift Details',
    description: 'All performed and scheduled shifts.',
    module: 'shifts',
    group: 'Shifts',
  },
  {
    id: 'cancelled',
    title: 'Cancelled Shifts',
    description: 'Cancelled services and their recorded details.',
    module: 'shifts',
    group: 'Shifts',
    filter: (r) => r.status === 'Cancelled',
  },
  {
    id: 'sleepover',
    title: 'Sleepover Report',
    description: 'Scheduled sleepover services.',
    module: 'shifts',
    group: 'Shifts',
    filter: (r) => r.type === 'Sleepover',
  },
  {
    id: 'time',
    title: 'Timesheet Approval',
    description: 'Worked hours and approval status.',
    module: 'timesheets',
    group: 'Staff',
  },
  {
    id: 'staff-documents',
    title: 'Staff Document Expiry',
    description: 'Staff documents with a recorded expiry date.',
    module: 'documents',
    group: 'Staff',
    filter: (r) => !!r.staffId && !!r.expiry,
  },
  {
    id: 'pay-review',
    title: 'Pay Review Date',
    description: 'Staff members with a scheduled review.',
    module: 'staff',
    group: 'Staff',
    filter: (r) => !!r.review,
  },
  {
    id: 'staff-onboarding',
    title: 'Staff Onboarding Status',
    description: 'Onboarding and active staff records.',
    module: 'staff',
    group: 'Staff',
  },
  {
    id: 'client-documents',
    title: 'Client Document Expiry',
    description: 'Client documents with a recorded expiry date.',
    module: 'documents',
    group: 'Clients',
    filter: (r) => !!r.clientId && !!r.expiry,
  },
  {
    id: 'care-plan-progress',
    title: 'Care Plan Progress',
    description: 'Care plan ownership, goals and review dates.',
    module: 'care-plans',
    group: 'Clients',
  },
  {
    id: 'medication-usage',
    title: 'Medication Usage Report',
    description: 'Medication plans exactly as recorded.',
    module: 'medications',
    group: 'Clients',
  },
  {
    id: 'administrations',
    title: 'Medication Administration Outcomes',
    description: 'Recorded outcomes including refused and missed doses.',
    module: 'administrations',
    group: 'Clients',
  },
  {
    id: 'fund-expiry',
    title: 'Fund Expiry',
    description: 'Funding allocations, usage and expiry dates.',
    module: 'funds',
    group: 'Clients',
  },
  {
    id: 'clients',
    title: 'Client Full Report',
    description: 'Client directory and profile information.',
    module: 'clients',
    group: 'Clients',
  },
  {
    id: 'invoice-balance',
    title: 'Outstanding Invoices',
    description: 'Issued invoices with an unpaid balance.',
    module: 'invoices',
    group: 'Finance',
    filter: (r) => Number(r.balance) > 0 && r.status === 'Issued',
  },
  {
    id: 'complaints',
    title: 'Complaints Register',
    description: 'Recorded concerns, ownership and outcomes.',
    module: 'complaints',
    group: 'Compliance',
  },
  {
    id: 'incidents',
    title: 'Incident Overview',
    description: 'Incident tickets, severity and follow-up.',
    module: 'incidents',
    group: 'Compliance',
  },
];

export default function OperationsWorkspace({
  demo,
  config,
}: {
  demo: boolean;
  config: ClientConfig;
}) {
  const router = useRouter(),
    pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const view = segments[1] || 'dashboard',
    recordId = segments[2];
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(demo),
    [state, setState] = useState<OperationsState | null>(null),
    [actor, setActor] = useState('Administrator'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [globalSearch, setGlobalSearch] = useState(''),
    [searchOpen, setSearchOpen] = useState(false),
    [help, setHelp] = useState(false),
    [notifications, setNotifications] = useState(false),
    [userMenu, setUserMenu] = useState(false),
    [draft, setDraft] = useState<Draft | null>(null),
    [step, setStep] = useState(0),
    [formError, setFormError] = useState(''),
    [messageOpen, setMessageOpen] = useState(false);
  const [search, setSearch] = useState(''),
    [statusFilter, setStatusFilter] = useState(''),
    [riskFilter, setRiskFilter] = useState(''),
    [categoryFilter, setCategoryFilter] = useState(''),
    [archived, setArchived] = useState(false),
    [sort, setSort] = useState({ key: 'updatedAt', direction: -1 }),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(25),
    [selected, setSelected] = useState<string[]>([]),
    [tab, setTab] = useState('Overview');
  const [week, setWeek] = useState(isoDate()),
    [calendarBy, setCalendarBy] = useState('Staff'),
    [reportId, setReportId] = useState(''),
    [reportFrom, setReportFrom] = useState(''),
    [reportTo, setReportTo] = useState(''),
    [downloads, setDownloads] = useState<{ name: string; at: string; content: string }[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null),
    searchRef = useRef<HTMLInputElement>(null),
    stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (demo) return;
    if (!config.apiKey) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(clientAuth(config), (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, [config, demo]);
  const request = useCallback(
    async (body?: unknown) => {
      const headers: Record<string, string> = {};
      if (user) headers.authorization = `Bearer ${await user.getIdToken()}`;
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch('/api/operations', {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to load operations.');
      return result;
    },
    [user],
  );
  const load = useCallback(async () => {
    setError('');
    try {
      const data = await request();
      setState(data.state);
      setActor(data.actor.name);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [request]);
  useEffect(() => {
    if (demo || user) void load();
  }, [demo, user, load]);
  useEffect(() => {
    setSearch('');
    setStatusFilter('');
    setRiskFilter('');
    setCategoryFilter('');
    setArchived(false);
    setSelected([]);
    setPage(1);
    setTab('Overview');
    setMobileNav(false);
    setError('');
    headingRef.current?.focus();
  }, [view, recordId]);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [search, statusFilter, riskFilter, categoryFilter, archived, pageSize]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const records = state?.records || [],
    active = records.filter((r) => !r.archived),
    definition = moduleById(view),
    record = records.find((r) => r.id === recordId && r.module === view);
  const findName = (id: unknown) => {
    const row = records.find((r) => r.id === id);
    return String(row?.name || row?.title || row?.reference || '—');
  };
  const rowsFor = (id: string) => active.filter((r) => r.module === id);
  const go = (id: string, item?: string) =>
    router.push(`/operations/${id}${item ? '/' + item : ''}`);
  const fieldValue = (r: OpRecord, key: string): string => {
    const field = moduleById(r.module)?.fields.find((f) => f.key === key);
    if (field?.reference) return findName(r[key]);
    if (['amount', 'paid', 'balance', 'rate', 'budget', 'spent', 'payRate'].includes(key))
      return money(r[key]);
    if (field?.type === 'date' || ['createdAt', 'updatedAt'].includes(key)) return dateText(r[key]);
    if (typeof r[key] === 'boolean') return r[key] ? 'Yes' : 'No';
    return r[key] === '' || r[key] === undefined ? '—' : String(r[key]);
  };
  function newDraft(
    module: string,
    values: Record<string, string | number | boolean> = {},
    existing?: OpRecord,
  ) {
    const def = moduleById(module)!;
    const defaults = Object.fromEntries(
      def.fields.map((f) => [
        f.key,
        existing?.[f.key] ??
          values[f.key] ??
          f.default ??
          (f.key === 'date' ? isoDate() : f.type === 'checkbox' ? false : ''),
      ]),
    );
    setDraft({ module, record: existing, values: defaults });
    setStep(0);
    setFormError('');
  }
  async function mutate(action: string, module?: string, id?: string, values?: unknown) {
    const result = await request({
      action,
      module,
      id,
      values,
      revision: stateRef.current!.revision,
    });
    stateRef.current = result.state;
    setState(result.state);
    return result.state as OperationsState;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setFormError('');
    const def = moduleById(draft.module)!;
    if (draft.module === 'complaints' && !draft.record && step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      validateValues(draft.module, draft.values);
      const next = await mutate('save', draft.module, draft.record?.id, draft.values);
      const row = draft.record
        ? next.records.find((r) => r.id === draft.record!.id)
        : next.records.at(-1);
      setDraft(null);
      setToast(`${def.singular} saved`);
      if (row) go(draft.module, row.id);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(row: OpRecord, value: string) {
    const values = Object.fromEntries(
      moduleById(row.module)!.fields.map((f) => [f.key, row[f.key] ?? '']),
    );
    values.status = value;
    await mutate('save', row.module, row.id, values);
  }
  function downloadText(name: string, content: string, type = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloads((d) => [{ name, at: new Date().toISOString(), content }, ...d].slice(0, 20));
    setToast(`${name} downloaded`);
  }
  function exportRows(module: string, rows: OpRecord[]) {
    const def = moduleById(module)!;
    const keys = ['reference', ...def.fields.map((f) => f.key), 'createdAt', 'updatedAt'];
    const csv = [
      keys.map(csvCell).join(','),
      ...rows.map((row) => keys.map((k) => csvCell(fieldValue(row, k))).join(',')),
    ].join('\r\n');
    downloadText(`${module}-${isoDate()}.csv`, csv);
  }
  const filtered = records
    .filter(
      (r) =>
        r.module === view &&
        r.archived === archived &&
        (!statusFilter || r.status === statusFilter) &&
        (!riskFilter || r.risk === riskFilter) &&
        (!categoryFilter || r.category === categoryFilter) &&
        (!search ||
          Object.values(r).join(' ').toLowerCase().includes(search.toLowerCase()) ||
          [r.clientId, r.staffId, r.assigneeId].some((id) =>
            findName(id).toLowerCase().includes(search.toLowerCase()),
          )),
    )
    .sort(
      (a, b) =>
        String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), undefined, {
          numeric: true,
        }) * sort.direction,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    currentPage = Math.min(page, pages),
    pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const Icon = icons[view] || FolderOpen;
  const globalMatches = active
    .filter(
      (r) =>
        globalSearch &&
        [r.title, r.name, r.reference, r.email]
          .join(' ')
          .toLowerCase()
          .includes(globalSearch.toLowerCase()),
    )
    .slice(0, 12);

  function Badge({ value }: { value: unknown }) {
    const v = String(value || 'Draft');
    const color = /critical|high|overdue|escalated|missed|refused/i.test(v)
      ? 'red'
      : /active|approved|paid|completed|resolved|verified|administered|current|cleared/i.test(v)
        ? 'green'
        : /draft|inactive|archived|void|cancelled|ceased/i.test(v)
          ? 'grey'
          : /pending|unapproved|medium|investigating|follow/i.test(v)
            ? 'amber'
            : 'blue';
    return <span className={`${styles.badge} ${styles[color]}`}>{v}</span>;
  }
  function Metric({
    title,
    value,
    tone = 'blue',
    onClick,
  }: {
    title: string;
    value: ReactNode;
    tone?: string;
    onClick?: () => void;
  }) {
    return (
      <button className={styles.metric} onClick={onClick} disabled={!onClick}>
        <span>
          {title}
          <i className={styles[tone]} />
        </span>
        <strong>{value}</strong>
      </button>
    );
  }
  function Empty({
    title = 'No Data',
    description,
    action,
  }: {
    title?: string;
    description?: string;
    action?: () => void;
  }) {
    return (
      <div className={styles.empty}>
        <FolderOpen size={32} strokeWidth={1.25} />
        <strong>{title}</strong>
        {description && <p>{description}</p>}
        {action && (
          <button className={styles.primary} onClick={action}>
            <Plus size={15} /> Add your first record
          </button>
        )}
      </div>
    );
  }
  function Table({
    def,
    rows,
    selectable = false,
  }: {
    def: Module;
    rows: OpRecord[];
    selectable?: boolean;
  }) {
    const sortedRows = [...rows].sort((a, b) => {
      const field = def.fields.find((f) => f.key === sort.key);
      const first = field?.reference ? findName(a[sort.key]) : String(a[sort.key] ?? '');
      const second = field?.reference ? findName(b[sort.key]) : String(b[sort.key] ?? '');
      return first.localeCompare(second, undefined, { numeric: true }) * sort.direction;
    });
    return (
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              {selectable && (
                <th>
                  <input
                    aria-label="Select all visible records"
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.includes(r.id))}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  />
                </th>
              )}
              {def.columns.map((key) => (
                <th key={key}>
                  <button
                    onClick={() =>
                      setSort((s) => ({ key, direction: s.key === key ? -s.direction : 1 }))
                    }
                  >
                    {def.fields.find((f) => f.key === key)?.label ||
                      (
                        {
                          reference: 'Reference',
                          amount: 'Amount',
                          updatedAt: 'Updated',
                        } as Record<string, string>
                      )[key] ||
                      key}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
              <th>
                <span className={styles.srOnly}>Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.id}>
                {selectable && (
                  <td>
                    <input
                      aria-label={`Select ${r.name || r.title || r.reference}`}
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((v) =>
                          e.target.checked ? [...v, r.id] : v.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                )}
                {def.columns.map((key, i) => (
                  <td key={key}>
                    {i === 0 ? (
                      <button className={styles.rowLink} onClick={() => go(def.id, r.id)}>
                        {['staff', 'clients'].includes(def.id) && (
                          <span className={styles.avatar}>{initials(r.name)}</span>
                        )}
                        {fieldValue(r, key)}
                      </button>
                    ) : ['status', 'risk', 'priority', 'outcome'].includes(key) ? (
                      <Badge value={r[key]} />
                    ) : (
                      fieldValue(r, key)
                    )}
                  </td>
                ))}
                <td>
                  <button
                    className={styles.iconButton}
                    title="View record"
                    aria-label={`View ${r.name || r.title || r.reference}`}
                    onClick={() => go(def.id, r.id)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty />}
      </div>
    );
  }
  function SectionHeader({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children?: ReactNode;
  }) {
    return (
      <div className={styles.pageHeader}>
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            <Icon size={23} />
            {title}
          </h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className={styles.buttons}>{children}</div>
      </div>
    );
  }
  function Stats() {
    const own = rowsFor(view);
    if (view === 'complaints')
      return (
        <div className={styles.metrics}>
          <Metric
            title="Total Open"
            value={own.filter((r) => !['Resolved', 'Closed'].includes(String(r.status))).length}
            onClick={() => setStatusFilter('Open')}
          />
          <Metric
            title="Critical Risk"
            value={
              own.filter(
                (r) => r.risk === 'Critical' && !['Resolved', 'Closed'].includes(String(r.status)),
              ).length
            }
            tone="red"
            onClick={() => setRiskFilter('Critical')}
          />
          <Metric
            title="Resolved This Month"
            value={
              own.filter(
                (r) =>
                  r.status === 'Resolved' &&
                  String(r.updatedAt).slice(0, 7) === isoDate().slice(0, 7),
              ).length
            }
            tone="green"
            onClick={() => setStatusFilter('Resolved')}
          />
        </div>
      );
    if (view === 'invoices') {
      const invoices = own.filter((r) => r.status !== 'Void');
      return (
        <div className={`${styles.metrics} ${styles.four}`}>
          <Metric
            title="Total Invoiced Value"
            value={money(invoices.reduce((a, r) => a + Number(r.amount || 0), 0))}
          />
          <Metric
            title="Paid Value"
            value={money(invoices.reduce((a, r) => a + Number(r.paid || 0), 0))}
            tone="green"
          />
          <Metric
            title="Outstanding Value"
            value={money(invoices.reduce((a, r) => a + Number(r.balance || 0), 0))}
          />
          <Metric
            title="Overdue Value"
            value={money(
              invoices
                .filter((r) => r.status === 'Issued' && String(r.due) < isoDate())
                .reduce((a, r) => a + Number(r.balance || 0), 0),
            )}
            tone="red"
          />
        </div>
      );
    }
    if (view === 'timesheets')
      return (
        <div className={styles.metrics}>
          <Metric
            title="Approved Timesheets"
            value={own.filter((r) => r.status === 'Approved').length}
            tone="green"
            onClick={() => setStatusFilter('Approved')}
          />
          <Metric
            title="Unapproved Timesheets"
            value={own.filter((r) => r.status === 'Unapproved').length}
            tone="amber"
            onClick={() => setStatusFilter('Unapproved')}
          />
          <Metric
            title="Total Recorded Hours"
            value={own.reduce((a, r) => a + shiftHours(r), 0).toFixed(2)}
          />
        </div>
      );
    if (view === 'actions')
      return (
        <div className={`${styles.metrics} ${styles.four}`}>
          <Metric
            title="Overdue"
            value={
              own.filter((r) => r.status !== 'Completed' && r.due && String(r.due) < isoDate())
                .length
            }
            tone="red"
          />
          <Metric
            title="Due Soon"
            value={
              own.filter(
                (r) =>
                  r.status !== 'Completed' &&
                  r.due &&
                  String(r.due) >= isoDate() &&
                  String(r.due) <= addDays(isoDate(), 7),
              ).length
            }
            tone="amber"
          />
          <Metric
            title="Awaiting Verification"
            value={own.filter((r) => r.status === 'Awaiting Verification').length}
            onClick={() => setStatusFilter('Awaiting Verification')}
          />
          <Metric
            title="Open"
            value={own.filter((r) => r.status === 'Open').length}
            onClick={() => setStatusFilter('Open')}
          />
        </div>
      );
    if (view === 'incidents')
      return (
        <div className={styles.metrics}>
          <Metric
            title="Open Incidents"
            value={own.filter((r) => r.status !== 'Resolved').length}
          />
          <Metric
            title="Escalated Incidents"
            value={own.filter((r) => r.status === 'Escalated').length}
            tone="red"
            onClick={() => setStatusFilter('Escalated')}
          />
          <Metric
            title="Resolved Incidents"
            value={own.filter((r) => r.status === 'Resolved').length}
            tone="green"
            onClick={() => setStatusFilter('Resolved')}
          />
        </div>
      );
    return null;
  }
  function ListView() {
    if (!definition) return null;
    return (
      <>
        <SectionHeader
          title={
            view === 'invoices'
              ? 'Invoicing Dashboard'
              : view === 'medications'
                ? 'Medication Management'
                : definition.label
          }
          subtitle={
            view === 'invoices'
              ? 'Monitor invoice performance, balances, and payment records'
              : view === 'signals'
                ? 'Review manually recorded risks and supporting evidence'
                : undefined
          }
        >
          <button onClick={() => exportRows(view, filtered)}>
            <Download size={15} />
            Export CSV
          </button>
          <button className={styles.primary} onClick={() => newDraft(view)}>
            <Plus size={16} />
            {definition.action}
          </button>
        </SectionHeader>
        <Stats />
        {['clients', 'signals', 'documents', 'forms', 'incidents'].includes(view) && (
          <div className={styles.tabs}>
            {(view === 'clients'
              ? ['All Clients', 'Active', 'Onboarding', 'Inactive']
              : view === 'signals'
                ? ['All Signals', ...(definition.statuses || [])]
                : view === 'documents'
                  ? ['All Documents', 'Current', 'Draft', 'Expired']
                  : view === 'forms'
                    ? ['All Forms', 'Published', 'Draft']
                    : ['All Incidents', ...(definition.statuses || [])]
            ).map((t, i) => (
              <button
                className={statusFilter === (i ? t : '') ? styles.activeTab : ''}
                key={t}
                onClick={() => setStatusFilter(i ? t : '')}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className={styles.filters}>
          <label className={styles.search}>
            <Search size={16} />
            <input
              aria-label={`Search ${definition.label}`}
              placeholder={`Search ${definition.label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {definition.fields.find((f) => f.key === 'status') && (
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {definition.fields
                .find((f) => f.key === 'status')!
                .options?.map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          )}
          {definition.fields.find((f) => f.key === 'risk') && (
            <select
              aria-label="Filter by risk"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="">All Risk Levels</option>
              {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {definition.fields.find((f) => f.key === 'category') && (
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {definition.fields
                .find((f) => f.key === 'category')!
                .options?.map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          )}
          <button
            className={archived ? styles.selected : ''}
            onClick={() => setArchived(!archived)}
          >
            <Archive size={15} />
            Archived
          </button>
          {(search || statusFilter || riskFilter || categoryFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setRiskFilter('');
                setCategoryFilter('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {selected.length > 0 && (
          <div className={styles.selection}>
            <strong>{selected.length} selected</strong>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  for (const id of selected)
                    await mutate(archived ? 'restore' : 'archive', view, id);
                  setSelected([]);
                  setToast('Records updated');
                })
              }
            >
              {archived ? 'Restore' : 'Archive'} selected
            </button>
            {view === 'timesheets' && !archived && (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    for (const id of selected) {
                      const r = stateRef.current!.records.find((r) => r.id === id)!;
                      await changeStatus(r, 'Approved');
                    }
                    setSelected([]);
                    setToast('Timesheets approved');
                  })
                }
              >
                Approve selected
              </button>
            )}
          </div>
        )}
        <Table def={definition} rows={pageRows} selectable />
        <div className={styles.pagination}>
          <span>
            Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} items
          </span>
          <label>
            <select
              aria-label="Records per page"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            records per page
          </label>
          <div>
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {currentPage} / {pages}
            </span>
            <button
              aria-label="Next page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </>
    );
  }

  function Dashboard() {
    const today = isoDate(),
      shifts = rowsFor('shifts'),
      upcoming = shifts
        .filter((r) => String(r.date) >= today && r.status !== 'Cancelled')
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .slice(0, 5);
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));
    const hours = days.map((d) =>
      shifts
        .filter((r) => r.date === d && r.status !== 'Cancelled')
        .reduce((sum, r) => sum + shiftHours(r), 0),
    );
    return (
      <>
        <SectionHeader
          title="Dashboard"
          subtitle={`Welcome back, ${actor.split(' ')[0]}. Here's what's happening across your services.`}
        >
          <button onClick={() => load()} disabled={busy}>
            <RefreshCw size={15} />
            Refresh
          </button>
          <button className={styles.primary} onClick={() => newDraft('shifts')}>
            <Plus size={16} />
            Add Shift
          </button>
        </SectionHeader>
        <div className={styles.tabs}>
          {['Operations', 'My Tasks', 'Leave'].map((t) => (
            <button
              key={t}
              className={
                tab === t || (tab === 'Overview' && t === 'Operations') ? styles.activeTab : ''
              }
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'My Tasks' ? (
          <Table
            def={moduleById('actions')!}
            rows={rowsFor('actions').filter((r) => r.status !== 'Completed')}
          />
        ) : tab === 'Leave' ? (
          <>
            <div className={styles.toolbar}>
              <button className={styles.primary} onClick={() => newDraft('leave')}>
                <Plus size={15} />
                Add Leave
              </button>
            </div>
            <Table def={moduleById('leave')!} rows={rowsFor('leave')} />
          </>
        ) : (
          <>
            <div className={`${styles.metrics} ${styles.four}`}>
              <Metric
                title="Shifts Today"
                value={shifts.filter((r) => r.date === today && r.status !== 'Cancelled').length}
                onClick={() => go('shifts')}
              />
              <Metric
                title="Open Incidents"
                value={rowsFor('incidents').filter((r) => r.status !== 'Resolved').length}
                tone="red"
                onClick={() => go('incidents')}
              />
              <Metric
                title="Unapproved Timesheets"
                value={rowsFor('timesheets').filter((r) => r.status === 'Unapproved').length}
                tone="amber"
                onClick={() => go('timesheets')}
              />
              <Metric
                title="Active Clients"
                value={rowsFor('clients').filter((r) => r.status === 'Active').length}
                tone="green"
                onClick={() => go('clients')}
              />
            </div>
            <div className={styles.dashboardGrid}>
              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <h2>Scheduled Hours</h2>
                  <span>Current week</span>
                </div>
                <div className={styles.chart}>
                  {days.map((d, i) => (
                    <div key={d}>
                      <span>{hours[i]}h</span>
                      <i
                        style={{ height: Math.max(3, (hours[i] / Math.max(...hours, 1)) * 145) }}
                      />
                      <small>
                        {new Date(d + 'T12:00:00').toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <h2>Needs Attention</h2>
                  <ListChecks size={18} />
                </div>
                {[
                  {
                    title: 'Vacant shifts',
                    count: shifts.filter((r) => !r.staffId && r.status !== 'Cancelled').length,
                    to: 'shifts',
                  },
                  {
                    title: 'Open complaints',
                    count: rowsFor('complaints').filter(
                      (r) => !['Closed', 'Resolved'].includes(String(r.status)),
                    ).length,
                    to: 'complaints',
                  },
                  {
                    title: 'Actions to complete',
                    count: rowsFor('actions').filter((r) => r.status !== 'Completed').length,
                    to: 'actions',
                  },
                  {
                    title: 'Draft invoices',
                    count: rowsFor('invoices').filter((r) => r.status === 'Draft').length,
                    to: 'invoices',
                  },
                ].map((item) => (
                  <button className={styles.attention} key={item.to} onClick={() => go(item.to)}>
                    <span>{item.title}</span>
                    <strong>{item.count}</strong>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </section>
              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <h2>Upcoming Shifts</h2>
                  <button className={styles.textButton} onClick={() => go('shifts')}>
                    View Scheduler <ChevronRight size={14} />
                  </button>
                </div>
                {upcoming.length ? (
                  upcoming.map((r) => (
                    <button
                      className={styles.upcoming}
                      key={r.id}
                      onClick={() => go('shifts', r.id)}
                    >
                      <span className={styles.dateTile}>
                        {String(r.date).slice(-2)}
                        <small>
                          {new Date(String(r.date) + 'T12:00:00').toLocaleDateString('en-AU', {
                            month: 'short',
                          })}
                        </small>
                      </span>
                      <span>
                        <strong>{String(r.title)}</strong>
                        <small>
                          {findName(r.clientId)} · {String(r.start)}–{String(r.end)}
                        </small>
                      </span>
                      <Badge value={r.status} />
                    </button>
                  ))
                ) : (
                  <Empty title="No upcoming shifts" />
                )}
              </section>
              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <h2>Recent Activity</h2>
                  <button className={styles.textButton} onClick={() => go('audit')}>
                    View all
                  </button>
                </div>
                <EventList limit={5} />
              </section>
            </div>
          </>
        )}
      </>
    );
  }
  function EventList({ id, limit = 50 }: { id?: string; limit?: number }) {
    const events = state!.events.filter((e) => !id || e.recordId === id).slice(0, limit);
    return events.length ? (
      <ol className={styles.timeline}>
        {events.map((e) => (
          <li key={e.id}>
            <span className={styles.eventDot} />
            <div>
              <strong>{e.title}</strong>
              <p>
                {e.actor} ·{' '}
                {e.action === 'save'
                  ? 'Saved'
                  : e.action === 'archive'
                    ? 'Archived'
                    : e.action === 'restore'
                      ? 'Restored'
                      : 'Updated settings'}
              </p>
              <small>{new Date(e.at).toLocaleString('en-AU')}</small>
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <Empty title="No activity yet" description="Saved changes will appear here." />
    );
  }
  function Scheduler() {
    const d = new Date(week + 'T12:00:00');
    const offset = (d.getDay() + (state!.settings.weekStart === 'Monday' ? 6 : 0)) % 7;
    const first = addDays(week, -offset),
      days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
    const shifts = rowsFor('shifts').filter(
      (r) =>
        days.includes(String(r.date)) &&
        (!search ||
          [r.title, findName(r.staffId), findName(r.clientId)]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
    const people = calendarBy === 'Staff' ? rowsFor('staff') : rowsFor('clients');
    const key = calendarBy === 'Staff' ? 'staffId' : 'clientId';
    const groups = [
      { id: '', name: calendarBy === 'Staff' ? 'Vacant Shift' : 'No Client' },
      ...people.map((p) => ({ id: p.id, name: String(p.name) })),
    ];
    return (
      <>
        <SectionHeader title="Scheduler">
          <button onClick={() => exportRows('shifts', shifts)}>
            <Download size={15} />
            Export
          </button>
          <button
            disabled={busy || !shifts.some((s) => s.status === 'Draft')}
            onClick={() =>
              run(async () => {
                for (const r of shifts.filter((r) => r.status === 'Draft'))
                  await changeStatus(r, 'Published');
                setToast('Shifts published in this workspace');
              })
            }
          >
            Publish Shifts
          </button>
          <button className={styles.primary} onClick={() => newDraft('shifts')}>
            <Plus size={16} />
            Add Shift
          </button>
        </SectionHeader>
        <div className={styles.schedulerToolbar}>
          <div className={styles.segmented}>
            {['Staff', 'Client'].map((v) => (
              <button
                key={v}
                className={calendarBy === v ? styles.selected : ''}
                onClick={() => setCalendarBy(v)}
              >
                {v === 'Staff' ? <UserRound size={15} /> : <Users size={15} />} {v}
              </button>
            ))}
          </div>
          <button onClick={() => setWeek(isoDate())}>Today</button>
          <button aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}>
            <ChevronLeft size={16} />
          </button>
          <label>
            <span className={styles.srOnly}>Week containing</span>
            <input
              aria-label="Week containing"
              type="date"
              value={week}
              onChange={(e) => e.target.value && setWeek(e.target.value)}
            />
          </label>
          <button aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}>
            <ChevronRight size={16} />
          </button>
          <strong>
            {new Date(week + 'T12:00:00').toLocaleDateString('en-AU', {
              month: 'long',
              year: 'numeric',
            })}
          </strong>
        </div>
        <div className={styles.costStrip}>
          <span>
            Revenue{' '}
            <strong>
              {money(
                shifts
                  .filter((r) => r.status !== 'Cancelled')
                  .reduce((s, r) => s + shiftHours(r) * Number(r.rate), 0),
              )}
            </strong>
          </span>
          <span>
            Cost{' '}
            <strong>
              {money(
                shifts
                  .filter((r) => r.status !== 'Cancelled')
                  .reduce((s, r) => s + shiftHours(r) * Number(r.payRate), 0),
              )}
            </strong>
          </span>
          <span>
            Margin{' '}
            <strong>
              {money(
                shifts
                  .filter((r) => r.status !== 'Cancelled')
                  .reduce((s, r) => s + shiftHours(r) * (Number(r.rate) - Number(r.payRate)), 0),
              )}
            </strong>
          </span>
          <span className={styles.muted}>Based on the rates recorded on each shift</span>
        </div>
        <div className={styles.filters}>
          <label className={styles.search}>
            <Search size={16} />
            <input
              aria-label="Search schedule"
              placeholder="Search staff, client or shift…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className={styles.legend}>
            <Badge value="Draft" />
            <Badge value="Published" />
            <Badge value="Completed" />
            <Badge value="Cancelled" />
          </div>
        </div>
        <div className={styles.calendarWrap}>
          <table className={styles.calendar}>
            <thead>
              <tr>
                <th>
                  {calendarBy === 'Staff' ? 'Staff' : 'Clients'}
                  <small>
                    {dateText(first)} – {dateText(days[6])}
                  </small>
                </th>
                {days.map((day) => (
                  <th key={day} className={day === isoDate() ? styles.today : ''}>
                    <small>
                      {new Date(day + 'T12:00:00').toLocaleDateString('en-AU', {
                        weekday: 'short',
                      })}
                    </small>
                    <strong>{Number(day.slice(-2))}</strong>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((person) => (
                <tr key={person.id}>
                  <th>
                    <div className={styles.person}>
                      {person.id && <span className={styles.avatar}>{initials(person.name)}</span>}
                      <span>
                        {person.name}
                        <small>
                          {shifts
                            .filter((r) => r[key] === person.id && r.status !== 'Cancelled')
                            .reduce((s, r) => s + shiftHours(r), 0)
                            .toFixed(2)}{' '}
                          Hours
                        </small>
                      </span>
                    </div>
                  </th>
                  {days.map((day) => (
                    <td key={day} className={day === isoDate() ? styles.today : ''}>
                      {shifts
                        .filter((r) => r[key] === person.id && r.date === day)
                        .map((r) => (
                          <button
                            key={r.id}
                            className={`${styles.shiftCard} ${r.status === 'Draft' ? styles.draftShift : r.status === 'Completed' ? styles.completeShift : r.status === 'Cancelled' ? styles.cancelledShift : ''}`}
                            onClick={() => go('shifts', r.id)}
                          >
                            <strong>
                              {String(r.start)} – {String(r.end)}
                            </strong>
                            <span>{String(r.title)}</span>
                            <small>
                              {findName(calendarBy === 'Staff' ? r.clientId : r.staffId)}
                            </small>
                            <span className={styles.shiftStatus}>{String(r.status)}</span>
                          </button>
                        ))}
                      <button
                        className={styles.addShift}
                        aria-label={`Add shift for ${person.name} on ${day}`}
                        onClick={() => newDraft('shifts', { [key]: person.id, date: day })}
                      >
                        <Plus size={14} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  function Detail() {
    if (!definition || !record)
      return (
        <Empty
          title="Record not found"
          description="The record may have been removed or the link may be incorrect."
        />
      );
    const related = active.filter(
      (r) =>
        r.id !== record.id &&
        (r.clientId === record.id ||
          r.staffId === record.id ||
          r.formId === record.id ||
          r.parent === record.reference ||
          r.shiftId === record.id),
    );
    return (
      <>
        <button className={styles.back} onClick={() => go(view)}>
          <ArrowLeft size={16} />
          Back to {definition.label}
        </button>
        <SectionHeader
          title={String(record.name || record.title || record.reference)}
          subtitle={`${record.reference} · Last updated ${dateText(record.updatedAt)}`}
        >
          <button onClick={() => window.print()}>
            <Printer size={15} />
            Print
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await mutate(record.archived ? 'restore' : 'archive', view, record.id);
                setToast(record.archived ? 'Record restored' : 'Record archived');
              })
            }
          >
            {record.archived ? <RotateCcw size={15} /> : <Archive size={15} />}{' '}
            {record.archived ? 'Restore' : 'Archive'}
          </button>
          <button
            className={styles.primary}
            disabled={record.archived}
            onClick={() => newDraft(view, {}, record)}
          >
            Edit {definition.singular}
          </button>
        </SectionHeader>
        {record.archived && (
          <div className={styles.notice}>This record is archived. Restore it to make changes.</div>
        )}
        <div className={styles.tabs}>
          {['Overview', 'Related Records', 'Activity'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? styles.activeTab : ''}>
              {t}
              {t === 'Related Records' ? ` (${related.length})` : ''}
            </button>
          ))}
        </div>
        {tab === 'Activity' ? (
          <section className={styles.panel}>
            <EventList id={record.id} />
          </section>
        ) : tab === 'Related Records' ? (
          <section className={styles.panel}>
            {related.length ? (
              related.map((r) => (
                <button key={r.id} className={styles.attention} onClick={() => go(r.module, r.id)}>
                  <Badge value={label(r.module)} />
                  <span>{String(r.name || r.title || r.reference)}</span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <Empty title="No linked records yet" />
            )}
          </section>
        ) : (
          <>
            <div className={styles.detailGrid}>
              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <h2>{definition.singular} Details</h2>
                  {record.status && <Badge value={record.status} />}
                </div>
                <dl className={styles.facts}>
                  {definition.fields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? styles.wide : ''}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.key === 'status' ? (
                          <Badge value={record[field.key]} />
                        ) : (
                          fieldValue(record, field.key)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <aside className={styles.panel}>
                <h2>Quick Actions</h2>
                <div className={styles.quickActions}>
                  {view === 'shifts' && (
                    <>
                      <button
                        onClick={() =>
                          newDraft('shifts', {
                            ...Object.fromEntries(
                              definition.fields.map((f) => [f.key, record[f.key]]),
                            ),
                            date: addDays(String(record.date), 7),
                            status: 'Draft',
                          })
                        }
                      >
                        <Plus size={15} />
                        Duplicate to next week
                      </button>
                      <button
                        disabled={
                          record.status === 'Cancelled' ||
                          rowsFor('timesheets').some((r) => r.shiftId === record.id)
                        }
                        onClick={() =>
                          newDraft('timesheets', {
                            shiftId: record.id,
                            clientId: record.clientId,
                            staffId: record.staffId,
                            date: record.date,
                            start: record.start,
                            end: record.end,
                            breakMinutes: record.breakMinutes,
                          })
                        }
                      >
                        <Clock3 size={15} />
                        Create Timesheet
                      </button>
                      <button
                        disabled={
                          !record.clientId ||
                          record.status !== 'Completed' ||
                          records.some(
                            (r) =>
                              r.module === 'invoices' &&
                              r.shiftId === record.id &&
                              r.status !== 'Void',
                          )
                        }
                        onClick={() =>
                          newDraft('invoices', {
                            shiftId: record.id,
                            clientId: record.clientId,
                            date: isoDate(),
                            due: addDays(isoDate(), state!.settings.invoiceTerms),
                            description: String(record.title) + ' · ' + dateText(record.date),
                            quantity: shiftHours(record),
                            rate: record.rate,
                          })
                        }
                      >
                        <Receipt size={15} />
                        Create Invoice
                      </button>
                    </>
                  )}
                  {['clients', 'staff'].includes(view) && (
                    <>
                      <button
                        onClick={() =>
                          newDraft('shifts', {
                            [view === 'clients' ? 'clientId' : 'staffId']: record.id,
                          })
                        }
                      >
                        <CalendarDays size={15} />
                        Schedule a Shift
                      </button>
                      <button
                        onClick={() =>
                          newDraft('documents', {
                            [view === 'clients' ? 'clientId' : 'staffId']: record.id,
                          })
                        }
                      >
                        <FolderOpen size={15} />
                        Add Document
                      </button>
                    </>
                  )}
                  {view === 'clients' && (
                    <>
                      <button onClick={() => newDraft('care-plans', { clientId: record.id })}>
                        Add Care Plan
                      </button>
                      <button onClick={() => newDraft('notes', { clientId: record.id })}>
                        Add Progress Note
                      </button>
                      <button onClick={() => newDraft('funds', { clientId: record.id })}>
                        Add Funding
                      </button>
                    </>
                  )}
                  {view === 'forms' && (
                    <button
                      disabled={record.status !== 'Published'}
                      onClick={() =>
                        newDraft('responses', {
                          formId: record.id,
                          answers: String(record.questions)
                            .split('\n')
                            .map((q) => q + '\nAnswer: ')
                            .join('\n\n'),
                        })
                      }
                    >
                      Complete This Form
                    </button>
                  )}
                  {view === 'medications' && (
                    <button
                      disabled={record.status !== 'Active'}
                      onClick={() =>
                        newDraft('administrations', {
                          medicationId: record.id,
                          clientId: record.clientId,
                        })
                      }
                    >
                      Record Administration
                    </button>
                  )}
                  {['complaints', 'incidents', 'signals'].includes(view) && (
                    <button
                      onClick={() =>
                        newDraft('actions', {
                          parent: record.reference,
                          assigneeId: record.assigneeId || '',
                          title: 'Follow up ' + String(record.reference),
                        })
                      }
                    >
                      <ListChecks size={15} />
                      Create Follow-up Action
                    </button>
                  )}
                  {view === 'documents' && (
                    <button
                      onClick={() =>
                        downloadText(
                          String(record.name) + '.txt',
                          String(record.content || record.notes),
                          'text/plain;charset=utf-8',
                        )
                      }
                    >
                      <Download size={15} />
                      Download Text
                    </button>
                  )}
                  <button onClick={() => exportRows(view, [record])}>
                    <Download size={15} />
                    Export Record
                  </button>
                </div>
                <hr />
                <small>
                  Created by {String(record.createdBy)}
                  <br />
                  {dateText(record.createdAt)}
                  <br />
                  Revision {record.revision}
                </small>
              </aside>
            </div>
            {view === 'invoices' && (
              <section className={`${styles.panel} ${styles.invoice}`}>
                <div>
                  <h2>INVOICE {record.reference}</h2>
                  <strong>{state!.settings.name}</strong>
                  <p>{state!.settings.address}</p>
                  <p>Bill to: {findName(record.clientId)}</p>
                  <p>
                    Issued {dateText(record.date)} · Due {dateText(record.due)}
                  </p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{String(record.description)}</td>
                      <td>{String(record.quantity)}</td>
                      <td>{money(record.rate)}</td>
                      <td>{money(record.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>
                <dl>
                  <div>
                    <dt>Tax</dt>
                    <dd>{money(record.tax)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{money(record.amount)}</dd>
                  </div>
                  <div>
                    <dt>Payment Recorded</dt>
                    <dd>{money(record.paid)}</dd>
                  </div>
                  <div>
                    <dt>Balance Due</dt>
                    <dd>{money(record.balance)}</dd>
                  </div>
                </dl>
              </section>
            )}
          </>
        )}
      </>
    );
  }

  function Reports() {
    const report = reportDefinitions.find((r) => r.id === reportId);
    const reportRows = report
      ? rowsFor(report.module).filter(
          (r) =>
            (!report.filter || report.filter(r)) &&
            (!reportFrom || String(r.date || r.createdAt).slice(0, 10) >= reportFrom) &&
            (!reportTo || String(r.date || r.createdAt).slice(0, 10) <= reportTo),
        )
      : [];
    return (
      <>
        <SectionHeader
          title={report?.title || 'Reports'}
          subtitle={
            report?.description || 'Understand your services, people, and financial activity.'
          }
        >
          {report && (
            <>
              <button onClick={() => setReportId('')}>
                <ArrowLeft size={15} />
                All Reports
              </button>
              <button onClick={() => exportRows(report.module, reportRows)}>
                <Download size={15} />
                Export CSV
              </button>
            </>
          )}
        </SectionHeader>
        {report ? (
          <>
            <div className={styles.filters}>
              <label>
                From{' '}
                <input
                  aria-label="Report start date"
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                />
              </label>
              <label>
                To{' '}
                <input
                  aria-label="Report end date"
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                />
              </label>
              <span>{reportRows.length} records</span>
              <button
                onClick={() => {
                  setReportFrom('');
                  setReportTo('');
                }}
              >
                Clear dates
              </button>
            </div>
            <Table def={moduleById(report.module)!} rows={reportRows} />
          </>
        ) : (
          ['Shifts', 'Clients', 'Staff', 'Finance', 'Compliance'].map((group) => (
            <section key={group} className={styles.reportSection}>
              <h2>{group}</h2>
              <div className={styles.reportGrid}>
                {reportDefinitions
                  .filter((r) => r.group === group)
                  .map((r) => (
                    <button
                      key={r.id}
                      className={styles.reportCard}
                      onClick={() => setReportId(r.id)}
                    >
                      <FileText size={23} />
                      <strong>{r.title}</strong>
                      <p>{r.description}</p>
                      <span>
                        View Report <ChevronRight size={14} />
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))
        )}
      </>
    );
  }
  function Integrations() {
    return (
      <>
        <SectionHeader
          title="Integrations"
          subtitle="External services require their own configured connection."
        />
        <div className={styles.notice}>
          This workspace does not yet send data to these services. The cards below describe the
          connections still to be implemented.
        </div>
        <div className={styles.reportGrid}>
          {[
            { name: 'Xero', description: 'Payroll and accounting exports', color: '#13b5e9' },
            { name: 'MYOB', description: 'Payroll and accounting', color: '#7345a5' },
            {
              name: 'Employment Hero',
              description: 'Staff and payroll synchronisation',
              color: '#3d2a70',
            },
            {
              name: 'Google Calendar',
              description: 'Staff schedule synchronisation',
              color: '#4285f4',
            },
            { name: 'Stripe', description: 'Online invoice payments', color: '#635bff' },
            { name: 'PRODA', description: 'NDIS claiming connection', color: '#456a55' },
            { name: 'QuickBooks', description: 'Accounting and invoices', color: '#279b3a' },
            {
              name: 'CSV Export',
              description: 'Download records for your own systems',
              color: '#1e2b5f',
            },
          ].map((item) => (
            <section className={styles.integration} key={item.name}>
              <span style={{ background: item.color }}>{initials(item.name)}</span>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <Badge value={item.name === 'CSV Export' ? 'Available' : 'Not Connected'} />
              {item.name === 'CSV Export' && (
                <button onClick={() => go('downloads')}>Open Download Center</button>
              )}
            </section>
          ))}
        </div>
      </>
    );
  }
  function renderField(field: Field) {
    if (!draft) return null;
    const value = draft.values[field.key];
    const change = (value: string | number | boolean) =>
      setDraft((d) => (d ? { ...d, values: { ...d.values, [field.key]: value } } : d));
    return (
      <label
        key={field.key}
        className={
          field.type === 'textarea'
            ? styles.wide
            : field.type === 'checkbox'
              ? styles.checkboxField
              : undefined
        }
      >
        <span>
          {field.label}
          {field.required && <em> *</em>}
        </span>
        {field.type === 'checkbox' ? (
          <input type="checkbox" checked={!!value} onChange={(e) => change(e.target.checked)} />
        ) : field.type === 'textarea' ? (
          <textarea
            value={String(value ?? '')}
            required={field.required}
            rows={4}
            maxLength={12000}
            onChange={(e) => change(e.target.value)}
          />
        ) : field.type === 'select' ? (
          <select
            value={String(value ?? '')}
            required={field.required}
            onChange={(e) => change(e.target.value)}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.reference
              ? records
                  .filter((r) => r.module === field.reference && (!r.archived || r.id === value))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {String(r.name || r.title || r.reference)}
                      {r.archived ? ' (archived)' : ''}
                    </option>
                  ))
              : field.options?.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={field.type || 'text'}
            value={String(value ?? '')}
            required={field.required}
            min={field.type === 'number' ? 0 : undefined}
            step={field.type === 'number' ? '0.01' : undefined}
            maxLength={field.type === 'text' ? 300 : undefined}
            onChange={(e) =>
              change(
                field.type === 'number' && e.target.value !== ''
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}
      </label>
    );
  }
  const draftDef = draft ? moduleById(draft.module) : undefined,
    wizard = draft?.module === 'complaints' && !draft.record;
  const wizardGroups = [
    ['title', 'description', 'category', 'date', 'assigneeId', 'due', 'private'],
    ['clientId', 'complainant', 'contact', 'relationship', 'channel'],
    ['risk', 'outcome', 'status', 'resolution'],
  ];
  if (!authReady) return <div className={styles.loading}>Connecting to your workspace…</div>;
  if (!demo && !user)
    return (
      <SignIn
        config={config}
        notice="Sign in with your Care++ administrator account to open Operations."
      />
    );
  return (
    <div className={`${styles.app} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.previewBar}>
        <span>
          <strong>{demo ? 'Local development workspace' : 'Operations preview'}</strong> ·{' '}
          {demo
            ? 'Fictional sample data · Changes are saved on this computer'
            : 'Provider administrator access'}
        </span>
        <Link href="/">
          Care++ home <ExternalLink size={12} />
        </Link>
      </div>
      {mobileNav && (
        <button
          className={styles.mobileBackdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.mobileOpen : ''}`}>
        <Link className={styles.logo} href="/operations/dashboard">
          <ShieldCheck size={28} />
          <span>
            Care++<small>OPERATIONS</small>
          </span>
        </Link>
        <button className={styles.bookmark} onClick={() => go('dashboard')}>
          <Bookmark size={17} />
          <span>Workspace</span>
          <ChevronRight size={14} />
        </button>
        <nav aria-label="Operations navigation">
          {navigation.map((group) => (
            <div key={group.group}>
              {group.group && <div className={styles.navGroup}>{group.group}</div>}
              {group.items.map((id) => {
                const NavIcon = icons[id] || FolderOpen;
                return (
                  <Link
                    key={id}
                    href={`/operations/${id}`}
                    title={label(id)}
                    className={`${styles.navItem} ${view === id ? styles.activeNav : ''}`}
                    aria-current={view === id ? 'page' : undefined}
                  >
                    <NavIcon size={18} />
                    <span>{label(id)}</span>
                    {id === 'signals' &&
                      rowsFor('signals').filter((r) => r.status === 'Open').length > 0 && (
                        <b>{rowsFor('signals').filter((r) => r.status === 'Open').length}</b>
                      )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <Link href="/operations/downloads" className={styles.downloadLink}>
          <Download size={17} />
          <span>Download Center</span>
        </Link>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={styles.iconButton}
            aria-label="Toggle sidebar"
            onClick={() => {
              if (window.innerWidth < 800) setMobileNav(!mobileNav);
              else setCollapsed(!collapsed);
            }}
          >
            <PanelLeft size={23} />
          </button>
          <button className={styles.globalSearch} onClick={() => setSearchOpen(true)}>
            <Search size={17} />
            <span>Search clients, staff, records…</span>
            <kbd>Ctrl+K</kbd>
          </button>
          <div className={styles.topActions}>
            <button className={styles.iconButton} aria-label="Help" onClick={() => setHelp(true)}>
              <HelpCircle size={20} />
            </button>
            <button
              className={styles.iconButton}
              aria-label="Messages"
              onClick={() => setMessageOpen(!messageOpen)}
            >
              <MessageCircle size={21} />
            </button>
            <button
              className={styles.iconButton}
              aria-label="Notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={20} />
              {rowsFor('actions').some((r) => r.status !== 'Completed') && <i />}
            </button>
            <button
              className={styles.userButton}
              aria-label="User menu"
              onClick={() => setUserMenu(!userMenu)}
            >
              {initials(actor)}
            </button>
          </div>
          {userMenu && (
            <div className={styles.userMenu}>
              <strong>{actor}</strong>
              <small>Provider Administrator</small>
              <button
                onClick={() => {
                  go('account');
                  setUserMenu(false);
                }}
              >
                Account Settings
              </button>
              <Link href="/">Care++ home</Link>
              {!demo && (
                <button onClick={() => signOut(clientAuth(config))}>
                  <LogOut size={15} />
                  Sign Out
                </button>
              )}
            </div>
          )}
          {notifications && (
            <div className={styles.notificationMenu}>
              <h3>Action reminders</h3>
              {rowsFor('actions')
                .filter((r) => r.status !== 'Completed')
                .slice(0, 5)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      go('actions', r.id);
                      setNotifications(false);
                    }}
                  >
                    {String(r.title)}
                    <small>Due {dateText(r.due)}</small>
                  </button>
                ))}
              {!rowsFor('actions').length && <p>No outstanding actions.</p>}
            </div>
          )}
        </header>
        <main className={styles.main}>
          {error && (
            <div role="alert" className={styles.error}>
              <TriangleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => load()}>Refresh</button>
            </div>
          )}
          {!state ? (
            <div className={styles.loading}>
              {error ? 'Workspace could not be loaded.' : 'Loading your operations workspace…'}
            </div>
          ) : recordId ? (
            Detail()
          ) : view === 'dashboard' ? (
            Dashboard()
          ) : view === 'shifts' ? (
            Scheduler()
          ) : view === 'reports' ? (
            Reports()
          ) : view === 'integrations' ? (
            Integrations()
          ) : view === 'account' ? (
            <>
              <SectionHeader title="Settings" subtitle={state.settings.name} />
              <AccountForm
                key={state.revision}
                value={state.settings}
                busy={busy}
                onSave={(values) =>
                  run(async () => {
                    await mutate('settings', undefined, undefined, values);
                    setToast('Account settings saved');
                  })
                }
              />
            </>
          ) : view === 'audit' ? (
            <>
              <SectionHeader
                title="Activity Log"
                subtitle="The latest 500 changes made in this operations workspace."
              />
              <section className={styles.panel}>
                <EventList />
              </section>
            </>
          ) : view === 'downloads' ? (
            <>
              <SectionHeader
                title="Download Center"
                subtitle="Export current records or download files generated in this session."
              />
              <div className={styles.reportGrid}>
                {modules
                  .filter((m) => rowsFor(m.id).length)
                  .map((m) => (
                    <button
                      className={styles.reportCard}
                      key={m.id}
                      onClick={() => exportRows(m.id, rowsFor(m.id))}
                    >
                      <Download size={22} />
                      <strong>{m.label}</strong>
                      <p>{rowsFor(m.id).length} active records</p>
                      <span>Download CSV</span>
                    </button>
                  ))}
              </div>
              {downloads.length > 0 && (
                <section className={styles.panel}>
                  <h2>This Session</h2>
                  {downloads.map((d, i) => (
                    <button
                      key={i}
                      className={styles.attention}
                      onClick={() => downloadText(d.name, d.content)}
                    >
                      <Download size={16} />
                      {d.name}
                      <small>{new Date(d.at).toLocaleTimeString()}</small>
                    </button>
                  ))}
                </section>
              )}
            </>
          ) : definition ? (
            ListView()
          ) : (
            <Empty title="Page not found" />
          )}
        </main>
        <footer className={styles.footer}>
          <span>
            <strong>Care++ Operations</strong> · {state?.settings.name || 'Workspace'}
          </span>
          <span>All changes saved to your workspace</span>
        </footer>
      </div>
      {toast && (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <Dialog.Root
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !busy) setDraft(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={`${styles.modal} ${styles.appSurface}`}
            aria-describedby="operations-form-description"
          >
            <div className={styles.modalHeader}>
              <Dialog.Title>
                {draft?.record ? `Edit ${draftDef?.singular}` : draftDef?.action}
              </Dialog.Title>
              <Dialog.Close className={styles.iconButton} disabled={busy} aria-label="Close form">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description id="operations-form-description" className={styles.formDescription}>
              {wizard
                ? `Step ${step + 1} of 3 · ${['Complaint Details', 'People & Contact', 'Risk & Outcome'][step]}`
                : 'Complete the details below. Fields marked * are required.'}
            </Dialog.Description>
            {wizard && (
              <div className={styles.steps}>
                {['Complaint Details', 'People & Contact', 'Risk & Outcome'].map((t, i) => (
                  <span key={t} className={i === step ? styles.currentStep : ''}>
                    <b>{i + 1}</b>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={saveDraft}>
              {formError && (
                <div role="alert" className={styles.error}>
                  {formError}
                </div>
              )}
              <div className={styles.formGrid}>
                {draftDef?.fields
                  .filter((f) => !wizard || wizardGroups[step].includes(f.key))
                  .map(renderField)}
              </div>
              {draft?.module === 'invoices' && (
                <div className={styles.invoiceTotal}>
                  Total <strong>{money(invoiceTotals(draft.values).amount)}</strong>
                </div>
              )}
              {['shifts', 'timesheets'].includes(draft?.module || '') &&
                draft?.values.start &&
                draft.values.end && (
                  <p className={styles.formDescription}>
                    Duration: {shiftHours(draft.values).toFixed(2)} hours. An end time at or before
                    the start time is treated as the following day.
                  </p>
                )}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (wizard && step > 0 ? setStep(step - 1) : setDraft(null))}
                >
                  {wizard && step > 0 ? 'Back' : 'Cancel'}
                </button>
                <button className={styles.primary} type="submit" disabled={busy}>
                  {busy
                    ? 'Saving…'
                    : wizard && step < 2
                      ? 'Next'
                      : draft?.record
                        ? 'Save Changes'
                        : wizard
                          ? 'Lodge Complaint'
                          : 'Save'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={`${styles.modal} ${styles.searchModal} ${styles.appSurface}`}>
            <Dialog.Title>Search workspace</Dialog.Title>
            <Dialog.Description>Find a client, staff member, record, or page.</Dialog.Description>
            <label className={styles.search}>
              <Search size={18} />
              <input
                ref={searchRef}
                autoFocus
                aria-label="Search workspace"
                placeholder="Type a name, reference, or page…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </label>
            <div className={styles.searchResults}>
              {navigation
                .flatMap((g) => g.items)
                .filter((id) => label(id).toLowerCase().includes(globalSearch.toLowerCase()))
                .slice(0, 6)
                .map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      go(id);
                      setSearchOpen(false);
                    }}
                  >
                    <FolderOpen size={16} />
                    {label(id)}
                    <small>Page</small>
                  </button>
                ))}
              {globalMatches.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    go(r.module, r.id);
                    setSearchOpen(false);
                  }}
                >
                  <FileText size={16} />
                  {String(r.name || r.title || r.reference)}
                  <small>{label(r.module)}</small>
                </button>
              ))}
            </div>
            <Dialog.Close className={styles.closeSearch}>Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={`${styles.modal} ${styles.appSurface}`}>
            <Dialog.Title>Operations Help</Dialog.Title>
            <Dialog.Description>Use the sidebar to manage your services.</Dialog.Description>
            <div className={styles.helpContent}>
              <h3>Start with your people</h3>
              <p>
                Add staff, clients, and teams. Select them when creating shifts, care plans, or
                cases.
              </p>
              <h3>From shift to invoice</h3>
              <p>
                Create and publish a shift. Open the shift to record a timesheet or prepare an
                invoice. Payment records are entered manually; no payments are collected here.
              </p>
              <h3>Follow up concerns</h3>
              <p>
                Lodge complaints, assign an owner, assess risk, and create related action items. Add
                a resolution before closing a case.
              </p>
              <h3>Records and exports</h3>
              <p>
                Changes persist on the server. Archive records to remove them from active lists, or
                restore them from the Archived filter. Exports appear in Download Center for this
                session.
              </p>
              <h3>Current boundaries</h3>
              <p>
                Care++ is in development. External integrations, message delivery, automated care
                signals, file uploads, mobile clock-in and complete care and trade workflows are
                not implemented yet.
              </p>
            </div>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {messageOpen && (
        <aside className={styles.messaging}>
          <div>
            <strong>
              <MessageCircle size={17} />
              Messaging
            </strong>
            <button aria-label="Close messaging" onClick={() => setMessageOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p>Prepare message drafts. Email and SMS delivery are not connected.</p>
          {rowsFor('messages')
            .slice(0, 3)
            .map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  go('messages', r.id);
                  setMessageOpen(false);
                }}
              >
                {String(r.title)}
                <Badge value={r.status} />
              </button>
            ))}
          <button
            className={styles.primary}
            onClick={() => {
              newDraft('messages');
              setMessageOpen(false);
            }}
          >
            <Plus size={15} />
            New Draft
          </button>
        </aside>
      )}
    </div>
  );
}

function AccountForm({
  value,
  busy,
  onSave,
}: {
  value: SettingsData;
  busy: boolean;
  onSave: (value: SettingsData) => void;
}) {
  const [draft, setDraft] = useState(value);
  const field = (key: keyof SettingsData, label: string, type = 'text', options?: string[]) => (
    <label key={key}>
      <span>{label}</span>
      {options ? (
        <select
          value={String(draft[key])}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          required={['name', 'invoicePrefix'].includes(key)}
          type={type}
          min={0}
          max={type === 'number' ? 365 : undefined}
          value={draft[key]}
          onChange={(e) =>
            setDraft({
              ...draft,
              [key]: type === 'number' ? Number(e.target.value) : e.target.value,
            })
          }
        />
      )}
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <section className={styles.panel}>
        <h2>Company Details</h2>
        <div className={styles.formGrid}>
          {field('name', 'Company Name')}
          {field('email', 'Contact Email', 'email')}
          {field('phone', 'Phone')}
          {field('address', 'Address')}
        </div>
      </section>
      <section className={styles.panel}>
        <h2>Scheduler & Invoicing</h2>
        <div className={styles.formGrid}>
          {field('timezone', 'Timezone', 'text', [
            'Australia/Sydney',
            'Australia/Melbourne',
            'Australia/Brisbane',
            'Australia/Perth',
            'Australia/Adelaide',
            'Australia/Darwin',
            'Australia/Hobart',
          ])}
          {field('weekStart', 'Week Starts On', 'text', ['Monday', 'Sunday'])}
          {field('timeFormat', 'Time Format', 'text', ['12-hour', '24-hour'])}
          {field('payRun', 'Pay Run', 'text', ['Weekly', 'Fortnightly', 'Monthly'])}
          {field('invoicePrefix', 'Invoice Prefix')}
          {field('invoiceTerms', 'Invoice Terms (days)', 'number')}
        </div>
      </section>
      <button className={styles.primary} type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
