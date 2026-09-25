import { widgetIndex } from "./widget-index.js";
const widgetMetadata = Object.fromEntries(widgetIndex.map(widget => [widget.id, widget]));

/** The gallery, CLI and MCP tools all read this catalogue. Examples are compiled in tests. */
export const widgetImport = "@cloudgatedevs/cloudgate-client/react/widgets";
export const widgetGuidelines = `Use the installed @cloudgatedevs/cloudgate-client package as the source of truth. Read its package.json version and exports before choosing components. Import reusable React widgets from @cloudgatedevs/cloudgate-client/react/widgets and the shared stylesheet once from @cloudgatedevs/cloudgate-client/react/styles.css. These widgets work without authentication, a router, or a Cloudgate provider.

Search this catalogue before writing UI. Read the selected widget's props, example and relevant recipe. Compose these components instead of copying their implementation or introducing another UI/chart library. Preserve the app's layout and appearance settings. Use inherited --ink-*, --mist*, --accent, --accent-fg, --accent-text and --secondary tokens; do not hardcode light backgrounds or brand colors. Use semantic Badge/Alert tones and text, not color alone. Use --cg-section-gap and --cg-card-padding for custom layout spacing. Inherit the saved wide, content, compact or flex layout; do not shrink root type or add fixed page-width wrappers. Widgets already respond to --cg-control-height and --cg-cell-padding. Respect reduced motion. Keep public widgets independent of back-office permissions.

DataTable supports local rows OR loadRows (not both). loadRows receives {page, pageSize, search, sort, filters, signal}; page starts at 1, sort is null or {key,direction:'asc'|'desc'}. Return {rows,total}, where total is the count AFTER filtering and BEFORE pagination. Forward the AbortSignal to fetch. Map sort/filter keys to the server's allowlist, apply tenant scoping and permissions on the server, and translate page to skip/take if needed. Never download the whole dataset to simulate server pagination. Use stable unique getRowId values. Changing reloadKey resets to page 1; use this after create/edit/delete. Use pagination='load-more' or 'infinite' for incremental loading; page-sized requests are merged by row ID. Search is debounced. Avoid permanent loading on failures; show an actionable retry.

Use Input/Select labels, accessible names on IconButton, descriptive Dialog titles, named Tabs, and chart labels. Use render(value,row) for table cells and accessor(row) for sortable/searchable derived values. Select and Input use native change events; Switch and Slider receive the new value directly. Slider and Switch are controlled. Tabs is controlled and supports arrow/Home/End navigation. Dialog is controlled with open/onClose and uses the SDK's shared entrance/exit animations, focus trap and focus restoration. Keep Dialog mounted while open changes so exit animation can finish.

Charts take plain data and series descriptors; formatValue formats ticks, tooltips and the accessible data table. Line gaps represent missing values; bars support negative numbers. Donut ignores negative/non-numeric values and displays an empty state if the positive total is zero. Keep series reasonably small and aggregate dense time series at the API. Never present sample gallery data as real customer data.

Use the saved palette's --cgw-success, --cgw-warning, --cgw-danger and --cgw-info for status colours and --cgw-chart-1 through --cgw-chart-6 for chart series. For a scoped appearance preview, import paletteVariables and PALETTE_PRESETS from the platform entry. Preserve the saved theme_custom_palette when applying a built-in palette; do not replace the user's named custom palette or save preview settings automatically.

For each feature, verify loading, empty, error, disabled/read-only, narrow screen, keyboard, light/dark/system, compact density, custom palettes (including pale primary colours) and reduced motion. UI permission checks improve usability; enforce every read/write on the backend too. The React widget catalogue is distinct from the legacy Cloudweb page-builder cookbook: do not use widgetBuilderConfig or page-builder JSON for React modules. If this installed SDK lacks a needed export, use existing supported components or explain the required SDK upgrade; never invent an API or silently install a new SDK version.`;

const example = (imports, body) =>
  `import { ${imports} } from '${widgetImport}';\n\n${body}`;
const prop = (name, type, description) => ({ name, type, description });
export const widgets = [
  {
    ...widgetMetadata["data-table"],
    exports: ["DataTable"],
    description:
      "Searchable, sortable records with server pagination, incremental loading, selection and column controls.",
    props: [
      prop(
        "columns",
        "Column<T>[]",
        "key, label, accessor(row)?, render(value,row)?, sortable?, searchable?, compare?, align?, width?.",
      ),
      prop("rows", "T[]", "Local records. Omit when loadRows is provided."),
      prop(
        "loadRows",
        "(query) => Promise<{rows:T[],total:number}>",
        "Server query includes page (1-based), pageSize, search, sort, filters and AbortSignal.",
      ),
      prop(
        "getRowId",
        "(row:T) => string | number",
        "Stable unique row ID. Defaults to row.id.",
      ),
      prop(
        "pagination",
        "'pages' | 'load-more' | 'infinite'",
        "Defaults to numbered pages; infinite scroll also retains a Load more button.",
      ),
      prop(
        "pageSize / pageSizes",
        "number / number[]",
        "Initial page size (10) and page size options ([10,25,50]).",
      ),
      prop(
        "initialSort",
        "{key:string,direction:'asc'|'desc'} | null",
        "Initial sort; clicking a header cycles ascending, descending, none.",
      ),
      prop(
        "filters",
        "Record<string, unknown>",
        "JSON-serializable server filters. Local mode supports exact values or arrays of values.",
      ),
      prop(
        "reloadKey",
        "string | number",
        "Change after a mutation to reload page 1.",
      ),
      prop(
        "searchable / debounceMs",
        "boolean / number",
        "Search enabled by default, with 300ms debounce.",
      ),
      prop(
        "selectable / selectedIds / onSelectionChange",
        "boolean / RowId[] / (ids) => void",
        "Optional controlled selection across pages. Caller owns bulk actions and clearing after deletion.",
      ),
      prop(
        "toolbar / rowActions",
        "ReactNode / (row) => ReactNode",
        "Compose filter controls and accessible row actions.",
      ),
      prop(
        "loading / error / onRetry",
        "boolean / Error / () => void",
        "Local data state overrides. Remote errors already show retry.",
      ),
      prop(
        "onQueryChange",
        "(query) => void",
        "Observe table queries for diagnostics; do not fetch a second copy here.",
      ),
      prop(
        "label / searchPlaceholder / emptyTitle / emptyDescription",
        "string",
        "Accessible table label and user-facing messages.",
      ),
    ],
    example: example(
      "DataTable, Badge",
      `const columns = [\n  { key: 'name', label: 'Name' },\n  { key: 'status', label: 'Status', render: value => <Badge tone={value === 'Active' ? 'success' : 'neutral'}>{value}</Badge> },\n  { key: 'amount', label: 'Amount', align: 'right', render: value => '$' + value.toFixed(2) },\n];\nexport default function Example() {\n  return <DataTable label="Orders" columns={columns} rows={[{id: 1, name: 'Design subscription', status: 'Active', amount: 49}]} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["line-chart"],
    exports: ["LineChart"],
    description:
      "A responsive trend chart with subtle area fills, series controls and accessible values.",
    props: [
      prop(
        "data",
        "Record<string,unknown>[]",
        "One record per x-axis label; null values form gaps.",
      ),
      prop(
        "series",
        "{key:string,label:string}[]",
        "Keys of numeric measures and their display names.",
      ),
      prop("xKey", "string", "Defaults to label."),
      prop("label", "string", "Accessible chart title."),
      prop("formatValue", "(number) => string", "Axis and value formatter."),
      prop("height", "number", "SVG viewBox height (260 default)."),
      prop(
        "loading / showDataTable",
        "boolean",
        "Loading skeleton / expandable data table (enabled by default).",
      ),
    ],
    example: example(
      "LineChart",
      `export default function Example() {\n  return <LineChart label="Monthly revenue" data={[{label:'Jan', revenue:2400}, {label:'Feb', revenue:3200}, {label:'Mar', revenue:2800}]} series={[{key:'revenue', label:'Revenue'}]} formatValue={n => '$' + Math.round(n).toLocaleString()} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["bar-chart"],
    exports: ["BarChart"],
    description:
      "Compare grouped measures, including positive and negative values.",
    props: [
      prop(
        "data / series / xKey",
        "Same as LineChart",
        "Grouped bars with a zero baseline; missing values are omitted.",
      ),
      prop(
        "label / formatValue / height / loading / showDataTable",
        "Same as LineChart",
        "Supports keyboard focus and an accessible data table.",
      ),
    ],
    example: example(
      "BarChart",
      `export default function Example() {\n  return <BarChart label="Orders by channel" data={[{label:'Web', current:125, previous:90}, {label:'Mobile', current:180, previous:135}]} series={[{key:'current',label:'This month'}, {key:'previous',label:'Last month'}]} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["donut-chart"],
    exports: ["DonutChart"],
    description:
      "A clear breakdown with a focusable ring, totals and percentage legend.",
    props: [
      prop(
        "data",
        "Record<string,unknown>[]",
        "Positive finite values contribute to the total.",
      ),
      prop("labelKey / valueKey", "string", "Defaults to label / value."),
      prop(
        "label / formatValue / loading / showDataTable",
        "string / function / boolean / boolean",
        "Accessible name, formatter and states.",
      ),
    ],
    example: example(
      "DonutChart",
      `export default function Example() {\n  return <DonutChart label="Traffic sources" data={[{label:'Direct',value:64}, {label:'Search',value:28}, {label:'Referral',value:8}]} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["metric-card"],
    exports: ["MetricCard"],
    description:
      "A focused headline number with context, an optional icon and a semantic trend.",
    props: [
      prop(
        "label / value / description",
        "ReactNode",
        "Metric title, prominent value and supporting context.",
      ),
      prop(
        "trend / tone",
        "ReactNode / Tone",
        "Explicit trend text and semantic tone. The caller decides whether an increase is good.",
      ),
      prop("icon", "React component", "Optional lucide-compatible icon."),
      prop("loading", "boolean", "Display a skeleton instead of the value."),
      prop(
        "children",
        "ReactNode",
        "Optional extra content such as a progress indicator.",
      ),
    ],
    example: example(
      "MetricCard",
      `export default function Example() {\n  return <MetricCard label="Monthly revenue" value="$24,680" trend="+12.8%" tone="success" description="vs. last month" />;\n}`,
    ),
  },
  {
    ...widgetMetadata["card"],
    exports: ["Card"],
    description:
      "A flexible surface with a consistent header, content area and optional footer.",
    props: [
      prop(
        "title / description / action",
        "ReactNode",
        "Header title, supporting text and trailing action.",
      ),
      prop(
        "children / footer",
        "ReactNode",
        "Body and optional separated footer.",
      ),
      prop(
        "className / ...sectionProps",
        "HTML attributes",
        "Compose layouts without changing the shared visual language.",
      ),
    ],
    example: example(
      "Card, Button",
      `export default function Example() {\n  return <Card title="Your workspace" description="A place for your next idea." footer={<Button>Open workspace</Button>}><p>Everything you need to move your project forward.</p></Card>;\n}`,
    ),
  },
  {
    ...widgetMetadata["button"],
    exports: ["Button", "IconButton"],
    description:
      "Consistent actions with clear hierarchy, loading feedback and accessible icon buttons.",
    props: [
      prop(
        "variant",
        "'primary' | 'secondary' | 'ghost' | 'danger'",
        "Primary is the default.",
      ),
      prop("size", "'sm' | 'md' | 'lg'", "Medium is the default."),
      prop(
        "loading / disabled",
        "boolean",
        "Prevents repeat submissions; loading exposes aria-busy.",
      ),
      prop("icon", "React component", "Optional leading icon."),
      prop(
        "label (IconButton)",
        "string",
        "Required accessible label, also shown as a title.",
      ),
      prop(
        "type / ...buttonProps",
        "HTML button attributes",
        "Defaults to type=button; explicitly use submit in forms.",
      ),
    ],
    example: example(
      "Button",
      `export default function Example() {\n  return <div className="cgw-row"><Button>Save changes</Button><Button variant="secondary">Cancel</Button><Button loading>Saving</Button></div>;\n}`,
    ),
  },
  {
    ...widgetMetadata["input"],
    exports: ["Input", "Textarea"],
    description:
      "Labelled fields with optional leading icons, hints and connected validation messages.",
    props: [
      prop(
        "label / hint / error",
        "ReactNode",
        "Accessible label, helper text or validation error.",
      ),
      prop("icon (Input)", "React component", "Leading icon."),
      prop(
        "value / onChange / ...inputProps",
        "Native HTML attributes",
        "Native event callback; supports type, required, disabled, autoComplete, min/max etc.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Input, Textarea", `export default function Example() {\n  const [name, setName] = useState('');\n  return <div className="cgw-stack"><Input label="Project name" value={name} onChange={e => setName(e.target.value)} hint="Visible to your team." /><Textarea label="Description" placeholder="What are you building?" /></div>;\n}`)}`,
  },
  {
    ...widgetMetadata["select"],
    exports: ["Select"],
    description:
      "A styled native select with predictable keyboard and mobile behaviour.",
    props: [
      prop(
        "options",
        "{value:string|number,label:string,disabled?:boolean}[]",
        "Option values must be unique.",
      ),
      prop(
        "label / hint / error / placeholder",
        "ReactNode / string",
        "Accessible field labels and feedback.",
      ),
      prop(
        "value / onChange",
        "Native select attributes",
        "Read the new string value from event.target.value.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Select", `export default function Example() {\n  const [period, setPeriod] = useState('30');\n  return <Select label="Reporting period" value={period} onChange={e => setPeriod(e.target.value)} options={[{value:'7',label:'Last 7 days'}, {value:'30',label:'Last 30 days'}]} />;\n}`)}`,
  },
  {
    ...widgetMetadata["slider"],
    exports: ["Slider"],
    description:
      "A native range control with a visible value and keyboard support.",
    props: [
      prop(
        "label / value / onChange",
        "string / number / (value:number) => void",
        "Controlled slider. Callback receives a number.",
      ),
      prop("min / max / step", "number", "Defaults to 0 / 100 / 1."),
      prop(
        "formatValue",
        "(value:number) => string",
        "Visible value and aria-valuetext.",
      ),
      prop(
        "hint / disabled",
        "string / boolean",
        "Supporting text and disabled state.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Slider", `export default function Example() {\n  const [value, setValue] = useState(60);\n  return <Slider label="Monthly capacity" value={value} onChange={setValue} formatValue={n => n + '%'} />;\n}`)}`,
  },
  {
    ...widgetMetadata["switch"],
    exports: ["Switch", "Checkbox"],
    description:
      "Binary choices with clear labels, helper text and native checkbox selection.",
    props: [
      prop(
        "Switch: label / hint / checked / onChange",
        "string / string / boolean / (checked:boolean) => void",
        "Controlled switch uses a boolean callback.",
      ),
      prop(
        "Checkbox: label / hint / checked / onChange",
        "ReactNode / string / boolean / native event",
        "Checkbox uses event.target.checked.",
      ),
      prop(
        "Checkbox: indeterminate",
        "boolean",
        "Shows mixed selection with aria-checked=mixed.",
      ),
      prop("disabled", "boolean", "Prevents interaction."),
    ],
    example: `import { useState } from 'react';\n${example("Switch, Checkbox", `export default function Example() {\n  const [enabled, setEnabled] = useState(true);\n  return <div className="cgw-stack"><Switch label="Email updates" hint="A weekly summary of activity." checked={enabled} onChange={setEnabled} /><Checkbox label="Include project activity" defaultChecked /></div>;\n}`)}`,
  },
  {
    ...widgetMetadata["tabs"],
    exports: ["Tabs"],
    description:
      "Compact sections with arrow-key navigation and connected tab panels.",
    props: [
      prop(
        "items",
        "{value:string,label:ReactNode,content?:ReactNode,icon?:Component,count?:number,disabled?:boolean}[]",
        "Stable unique values. Provide content for connected panels.",
      ),
      prop(
        "value / onChange",
        "string / (value:string) => void",
        "Controlled selected tab; value must match an enabled item.",
      ),
      prop("label", "string", "Accessible label for the tab list."),
    ],
    example: `import { useState } from 'react';\n${example("Tabs", `export default function Example() {\n  const [tab, setTab] = useState('overview');\n  return <Tabs label="Project sections" value={tab} onChange={setTab} items={[{value:'overview',label:'Overview',content:<p>Your project at a glance.</p>}, {value:'activity',label:'Activity',count:3,content:<p>Recent activity.</p>}]} />;\n}`)}`,
  },
  {
    ...widgetMetadata["dialog"],
    exports: ["Dialog"],
    description:
      "An animated modal with focus trapping, Escape dismissal and focus restoration.",
    props: [
      prop(
        "open / onClose",
        "boolean / () => void",
        "Keep mounted and toggle open so the closing animation can complete.",
      ),
      prop(
        "title / description",
        "ReactNode",
        "Accessible heading and optional supporting text.",
      ),
      prop(
        "size",
        "'sm' | 'md' | 'lg' | 'xl'",
        "Medium default; max-height stays within viewport.",
      ),
      prop(
        "children / footer",
        "ReactNode",
        "Scrollable body and pinned action area.",
      ),
    ],
    example: `import { useState } from 'react';\n${example("Dialog, Button", `export default function Example() {\n  const [open, setOpen] = useState(false);\n  return <><Button onClick={() => setOpen(true)}>Open dialog</Button><Dialog open={open} onClose={() => setOpen(false)} title="Ready to continue?" description="Review your changes before saving." footer={<Button onClick={() => setOpen(false)}>Done</Button>}><p>Your changes are ready.</p></Dialog></>;\n}`)}`,
  },
  {
    ...widgetMetadata["badge"],
    exports: ["Badge"],
    description: "Subtle status labels that remain readable in every theme.",
    props: [
      prop(
        "tone",
        "'neutral'|'accent'|'success'|'warning'|'danger'|'info'",
        "Semantic status, neutral by default.",
      ),
      prop("dot", "boolean", "Optional status dot; always pair it with text."),
      prop("children", "ReactNode", "Short descriptive status label."),
    ],
    example: example(
      "Badge",
      `export default function Example() {\n  return <div className="cgw-row"><Badge tone="success" dot>Active</Badge><Badge tone="warning" dot>Pending</Badge><Badge tone="danger" dot>Failed</Badge></div>;\n}`,
    ),
  },
  {
    ...widgetMetadata["alert"],
    exports: ["Alert"],
    description: "Contextual feedback with an optional action and dismissal.",
    props: [
      prop(
        "title / children / action",
        "ReactNode",
        "Heading, explanation and action.",
      ),
      prop("tone", "Tone", "Defaults to info; danger uses role=alert."),
      prop("onDismiss", "() => void", "Optional dismiss action."),
    ],
    example: example(
      "Alert, Button",
      `export default function Example() {\n  return <Alert tone="warning" title="A little attention needed" action={<Button variant="secondary" size="sm">Review settings</Button>}>Your changes are saved. Complete the setup when you are ready.</Alert>;\n}`,
    ),
  },
  {
    ...widgetMetadata["empty-state"],
    exports: ["EmptyState"],
    description: "A useful next step when a list, chart or module has no data.",
    props: [
      prop(
        "title / description",
        "string",
        "Clear explanation of the empty state.",
      ),
      prop("icon", "React component", "Optional icon."),
      prop("action", "ReactNode", "An appropriate next step."),
    ],
    example: example(
      "EmptyState, Button",
      `export default function Example() {\n  return <EmptyState title="Your first project starts here" description="Create a project to bring your ideas together." action={<Button>Create project</Button>} />;\n}`,
    ),
  },
  {
    ...widgetMetadata["skeleton"],
    exports: ["Skeleton"],
    description: "A quiet loading placeholder that respects reduced motion.",
    props: [
      prop("width / height", "CSS length", "Defaults to 100% / 1rem."),
      prop(
        "className / style",
        "string / CSSProperties",
        "Optional shape overrides. Put role=status on the parent loading region.",
      ),
    ],
    example: example(
      "Skeleton",
      `export default function Example() {\n  return <div className="cgw-stack" role="status" aria-label="Loading project"><Skeleton width="40%" /><Skeleton /><Skeleton width="75%" /></div>;\n}`,
    ),
  },
  {
    ...widgetMetadata["progress"],
    exports: ["Progress"],
    description:
      "Determinate progress with an accessible value and optional percentage.",
    props: [
      prop(
        "label / value / max",
        "string / number / number",
        "Provide a label; value clamped to 0..max (100 default).",
      ),
      prop(
        "tone / showValue",
        "Tone / boolean",
        "Accent and visible percentage by default.",
      ),
    ],
    example: example(
      "Progress",
      `export default function Example() {\n  return <Progress label="Project setup" value={72} tone="success" />;\n}`,
    ),
  },
];

export const widgetRecipes = [
  {
    id: "remote-table-edit",
    name: "Remote table with editing",
    description:
      "Server pagination, status filtering, an edit dialog and refresh after saving.",
    widgets: ["data-table", "dialog", "input", "select", "button"],
    code: `import { useState } from 'react';\n${example("DataTable, Dialog, Input, Select, Button", `const columns = [{key:'name',label:'Name'}, {key:'status',label:'Status'}];\n// Adapt these app-specific endpoints and validate permissions on the server.\nasync function loadRows({page, pageSize, search, sort, filters, signal}) {\n  const params = new URLSearchParams({page:String(page), pageSize:String(pageSize), search, status:filters.status || ''});\n  if (sort) { params.set('sort', sort.key); params.set('direction', sort.direction); }\n  const response = await fetch('/api/projects?' + params, {signal, credentials:'same-origin'});\n  if (!response.ok) throw new Error('Could not load projects. Please try again.');\n  return response.json(); // { rows: Project[], total: filtered count }\n}\nexport default function ProjectList({canEdit = false}) {\n  const [status, setStatus] = useState(''), [editing, setEditing] = useState(null);\n  const [revision, setRevision] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState('');\n  async function save(event) {\n    event.preventDefault(); setSaving(true); setError('');\n    try {\n      const response = await fetch('/api/projects/' + encodeURIComponent(editing.id), {method:'PATCH', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:editing.name})});\n      if (!response.ok) throw new Error('Could not save your changes.');\n      setEditing(null); setRevision(n => n + 1);\n    } catch (err) { setError(err.message); } finally { setSaving(false); }\n  }\n  return <><DataTable label="Projects" columns={columns} loadRows={loadRows} filters={{status}} reloadKey={revision}\n    toolbar={<Select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)} options={[{value:'',label:'All statuses'},{value:'Active',label:'Active'},{value:'Paused',label:'Paused'}]} />}\n    rowActions={canEdit ? row => <Button size="sm" variant="ghost" onClick={() => {setEditing({...row}); setError('');}}>Edit {row.name}</Button> : undefined} />\n    <Dialog open={!!editing} onClose={saving ? undefined : () => setEditing(null)} title="Edit project"><form onSubmit={save} className="cgw-stack"><Input label="Project name" required value={editing?.name || ''} onChange={e => setEditing({...editing,name:e.target.value})} error={error} /><Button type="submit" loading={saving}>Save changes</Button></form></Dialog></>;\n}`)}`,
  },
  {
    id: "dashboard",
    name: "Metrics dashboard",
    description:
      "Compose cards, a period filter, trends and a channel breakdown. Connect the period to your API.",
    widgets: ["metric-card", "line-chart", "donut-chart", "select", "card"],
    code: `import { useState } from 'react';\n${example("Card, MetricCard, LineChart, DonutChart, Select", `export default function Dashboard({summary, trend, channels, onPeriodChange, loading}) {\n  const [period, setPeriod] = useState('30');\n  return <div className="cgw-stack"><Select label="Period" value={period} onChange={e => {setPeriod(e.target.value); onPeriodChange?.(e.target.value);}} options={[{value:'7',label:'Last 7 days'}, {value:'30',label:'Last 30 days'}]} />\n    <MetricCard label="Revenue" value={summary?.revenue ?? '—'} description="For the selected period" loading={loading} />\n    <Card title="Revenue over time"><LineChart label="Revenue over time" data={trend} series={[{key:'revenue',label:'Revenue'}]} loading={loading} /></Card>\n    <Card title="Channels"><DonutChart label="Channels" data={channels} loading={loading} /></Card></div>;\n}`)}`,
  },
  {
    id: "permission-settings",
    name: "Permission-aware settings",
    description:
      "A readable form that becomes editable with a grant; server authorization remains required.",
    widgets: ["card", "input", "switch", "button", "alert"],
    code: `import { useState } from 'react';\n${example("Card, Input, Switch, Button, Alert", `export default function ModuleSettings({initialValues, canEdit, onSave}) {\n  const [form, setForm] = useState(initialValues), [saving, setSaving] = useState(false), [message, setMessage] = useState(null);\n  async function submit(event) {\n    event.preventDefault(); if (!canEdit || saving) return; setSaving(true); setMessage(null);\n    try { await onSave(form); setMessage({tone:'success',text:'Settings saved.'}); }\n    catch (err) { setMessage({tone:'danger',text:err.message || 'Could not save settings.'}); }\n    finally { setSaving(false); }\n  }\n  return <Card title="Module settings" description={canEdit ? 'Manage how this module works.' : 'You have read-only access.'}><form onSubmit={submit} className="cgw-stack">\n    <Input label="Module name" value={form.name} disabled={!canEdit || saving} onChange={e => setForm({...form,name:e.target.value})} required />\n    <Switch label="Email updates" checked={form.updates} disabled={!canEdit || saving} onChange={updates => setForm({...form,updates})} />\n    {message && <Alert tone={message.tone}>{message.text}</Alert>}\n    {canEdit && <Button type="submit" loading={saving}>Save settings</Button>}\n  </form></Card>;\n}`)}`,
  },
];
export const widgetCatalog = {
  schemaVersion: 1,
  importPath: widgetImport,
  stylesheet: "@cloudgatedevs/cloudgate-client/react/styles.css",
  widgets,
  recipes: widgetRecipes,
};
export function searchWidgets(query = "") {
  const synonyms = {
    paginated: "pagination",
    paginate: "pagination",
    paging: "pagination",
    tables: "table",
    charts: "chart",
    dropdown: "select",
    dropdowns: "select",
    modal: "dialog",
    modals: "dialog",
    pie: "donut",
  };
  const terms = query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((term) => synonyms[term] || term);
  return widgets.filter((widget) =>
    terms.every((term) =>
      `${widget.id} ${widget.name} ${widget.category} ${widget.description} ${widget.exports.join(" ")} ${widget.props.map((prop) => prop.name + " " + prop.description).join(" ")} ${widget.id === "data-table" ? "lazy loading filter selection grid pagination" : widget.id === "donut-chart" ? "pie breakdown" : ""}`
        .toLowerCase()
        .includes(term),
    ),
  );
}
export const getWidget = (id) =>
  widgets.find((widget) => widget.id === id || widget.exports.includes(id));
export const getWidgetRecipe = (id) =>
  widgetRecipes.find((recipe) => recipe.id === id);
