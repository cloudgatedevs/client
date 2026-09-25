# React widget library

Import from `@cloudgatedevs/cloudgate-client/react/widgets` and import
`@cloudgatedevs/cloudgate-client/react/styles.css` once. The widgets need React and
the SDK's React peer dependencies; they do not need a router, Cloudgate client,
authentication or back-office providers. The existing `/react` Table remains
compatible; new modules should use the new `DataTable`.

The interactive library lives at `/backoffice/widgets` (or `<basePath>/widgets`).
Its menu appears above Administration and requires `backoffice.widgets.view`
plus back-office access. Admin and Contributor receive the new grant by default;
User and custom roles do not. Role owners can change this in the permission tree.
The gallery uses fictional data and its appearance controls do not save settings.

## One catalogue for people and agents

`src/widgets/catalog.js` is the source of truth for props, examples, recipes and
implementation guidance. The gallery, CLI and read-only MCP tools consume it.
TypeScript declarations are in `widgets.d.ts`. Examples are compiled by the tests
so broken imports and JSX fail the package checks.

Run from a project that has the SDK installed (these commands need no network):

```sh
node node_modules/@cloudgatedevs/cloudgate-client/src/widgets/cli.mjs version
node node_modules/@cloudgatedevs/cloudgate-client/src/widgets/cli.mjs guide
node node_modules/@cloudgatedevs/cloudgate-client/src/widgets/cli.mjs search table
node node_modules/@cloudgatedevs/cloudgate-client/src/widgets/cli.mjs widget data-table
node node_modules/@cloudgatedevs/cloudgate-client/src/widgets/cli.mjs recipe remote-table-edit
```

The package also supplies the `cloudgate-widgets` and `cloudgate-widgets-mcp` bins.
MCP clients can launch the latter with `node` and the installed package's absolute
`src/widgets/mcp.mjs` path as its argument. Tools: `search_widgets`, `get_widget`,
`get_widget_recipe`, `get_widget_guidelines`. Responses include the installed SDK
version. It only returns shipped documentation: no credentials, application data,
filesystem mutation or network access. Protocol: newline-delimited MCP stdio.
This is separate from the older Cloudweb page-builder cookbook.

## Code display and editing

Use `CodeEditor` for snippets, source previews and code fields. It uses the same
CodeMirror integration as Cloudgate React, loaded on demand. Pass `value`,
`language` and a descriptive `label`. Read-only is the default; for editing set
`readOnly={false}` and provide `onChange` with controlled state. The widget never
executes code. It supports JSX/TSX, JavaScript/TypeScript, JSON, HTML, CSS, Python,
SQL and plain text. Line numbers, folding, search, copying and line wrapping are
included. Tab moves focus out of the editor. Source grows to `maxHeight` and then
scrolls; wheel events can continue to the page at its boundaries. Colours inherit
the current palette, including nested gallery appearance previews.

## Form validation

`Input`, `Textarea` and `Select` validate native constraints (`required`, field
`type`, length, pattern, range and step). Untouched fields stay quiet; blur or an
invalid submit reveals an inline error, and corrections update it while typing.
Errors are linked through `aria-describedby` and `aria-invalid`. Required fields
include a visible indicator. Disabled and read-only controls skip validation.

Wrap named fields in `Form`. Its `onSubmit(data, event)` receives `FormData` only
when valid; native navigation is prevented and the first invalid field is focused.
SDK fields show inline feedback; ordinary native controls still use their browser
validation. Always give fields `name` attributes to include them in `FormData`.
Use `data.get(name)` or `data.getAll(name)` for repeated names. Regular HTML forms
also work with SDK fields and browser constraint validation.

For a custom rule, pass `validate(value, formData)`, returning an error string or
`undefined`. Rules are synchronous; dependent fields revalidate when other fields
change inside `Form`. Run asynchronous/server checks in your submission handler
and pass server messages via `error`; clear those messages in your own change/reset
handlers. Backend validation remains required. Customize built-in wording with
`validationMessages` keys `required`, `email`, `url`, `invalid`, `minLength`,
`maxLength`, `pattern`, `min`, `max` and `step`.

`Button type="reset"` clears touched feedback and restores uncontrolled defaults.
For controlled fields, also restore your values in `Form`'s `onReset`. The gallery
includes a working **Form validation** example and matching agent cookbook entry.

## Searchable dropdowns

Use `SearchSelect` for a search input with a dropdown. Pass `options` for local
filtering by label and description, or `loadOptions({search, limit, signal})`
for remote search. The loader returns an array of `{value, label, description?,
disabled?}`; values must be unique, nonempty strings or finite numbers. Zero is
valid. Server results keep their order and are not filtered again in the browser.

Remote search is debounced (300 ms by default), cancels superseded requests and
ignores late responses. Forward `signal` to your API client. Apply search,
permissions and tenant scoping on the server before limiting the results; do not
download the entire dataset. `limit` defaults to 50; this is a bounded result list,
not a paginated dropdown. Use `minSearchLength` to require typing before fetching.
Loading, no matches and retry feedback are built in. Change `reloadKey` after an
edit or when the lookup's tenant/filter context changes.

`onChange(value, option)` receives the selected ID and option, or `('', null)` on
clear. Use controlled `value` or uncontrolled `defaultValue`. A preselected remote
ID needs `selectedOption` with its label. Typing only changes the search; Escape
or blur restores the committed selection. Arrow keys move through enabled options
and Enter selects. The popup flips to fit the viewport and works inside dialogs.

Set `name` to submit the ID in `FormData`. `required` checks a committed selection,
so free text cannot satisfy it. Custom `validate` receives the ID as a string and
uses the shared form validation behavior. The **Searchable select** gallery page
has local, simulated-server and dialog examples, plus an API integration snippet.

## Table data contract

Use `rows` for local data or `loadRows` for server data. The loader receives
`{page, pageSize, search, sort, filters, signal}` and must return `{rows, total}`.
Pages start at 1; total is the count after filtering, before pagination. Search is
debounced and changing search/sort/filters resets pagination. Requests are aborted
when superseded and late results are ignored even if a loader ignores the signal.
Pass the signal to fetch. Use `pagination="load-more"` or `"infinite"` for lazy
incremental loading; both keep a manual Load more fallback. Infinite mode observes
the bottom of the scrollable table. Stable unique row IDs are required.

The server must authorize, scope, filter and sort the query, allowlist sort keys,
and limit page size. Do not fetch everything to implement remote paging. A change
to `reloadKey` reloads page 1 after edits. Selection can be controlled across pages;
the caller owns bulk actions and removing stale selected IDs after deletions.

## Appearance and accessibility

Widgets inherit the app's neutral, foreground, primary and secondary tokens;
primary button text uses `--accent-fg` and accent text uses `--accent-text`.
Density, light/dark/system mode and typography follow app appearance settings.
Semantic tones adapt for dark mode. Focus indicators, form labels, native inputs,
keyboard tabs, dialog focus management and reduced-motion behaviour are included.
Charts expose labelled, focusable points and a readable data table. Null line
values are gaps, negative bars have a zero baseline, and zero-total donuts show an
empty state. Aggregate large chart datasets before rendering.

### Motion and loading

`MetricCard` animates numeric `value` props. Supply `formatValue` for currency,
percentages or units; existing strings/React nodes stay static. Use the standalone
`CountUp` for other numeric displays. Updates continue from the displayed value,
including decreases, and screen readers receive the final value without frame-by-frame
announcements. The default duration is 700 ms; pass `animate={false}` to opt out.

Line charts reveal from left to right, bars grow from zero (including negative
values), and donut charts sweep around the ring while the total counts up. They
animate on load and changed data, not hover or equivalent data objects. All chart
components accept `animate` and `duration` (650 ms for line/bar, 750 ms for donut).
Reduced motion skips JavaScript animation and shimmer; pending frames cancel on
unmount or preference changes. The library's Replay animation button demonstrates
the entrance behaviour without reloading the page.

Use `loading` on `Card`, `MetricCard` and charts. `WidgetSkeleton` also exports
`card`, `metric`, `chart` and `donut` variants with an accessible loading label.
Keep `Skeleton` for custom placeholder shapes. Tables show row skeletons, a busy
line and spinners during initial, paginated, refresh and incremental requests.
Vertical scroll chains to the page when a table fits or reaches its boundary;
do not add wheel handlers that cancel this native behaviour.

For standalone apps, the shared stylesheet supplies default tokens. Set the same
`data-theme`/`data-density` attributes and RGB-channel variables on the document
root to integrate your own appearance settings. Dialogs use a body portal and
therefore inherit the document's appearance, not a local preview override.

Theme settings include eight coordinated palettes and an editable, named custom
palette. Brand, workspace tint and success/warning/error/info colours are saved
per app and environment. The custom palette is retained when a preset is selected.
The Widget Library's preview palette selector uses the same definitions without
saving anything. Existing installations retain their primary/secondary colours.

Use `PALETTE_PRESETS` and `paletteVariables(values, dark)` from
`@cloudgatedevs/cloudgate-client/platform` for custom previews. These generate
neutral surfaces, readable text, button foregrounds, semantic colours and chart
series. Prefer inherited `--cgw-success`, `--cgw-warning`, `--cgw-danger`,
`--cgw-info` and `--cgw-chart-1` through `--cgw-chart-6` over hardcoded colours.
`theme_custom_palette` stores a JSON string with `{name, colors}`; the seven
colour keys are listed by `PALETTE_COLOR_KEYS`. This is public appearance data.

Preset inspiration: [Happy Hues](https://www.happyhues.co/palettes/12)
([Citrus & Mint](https://www.happyhues.co/palettes/14),
[Rosewater](https://www.happyhues.co/palettes/17)) and
[Radix's accent and neutral guidance](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette).
The SDK adapts these pairings for workspace surfaces and accessible text in both modes.

## Adding a widget

1. Implement a provider-independent component under `src/react/widgets`.
2. Export it in that folder's `index.jsx`, add `widgets.d.ts` declarations and
   scoped CSS using inherited theme variables.
3. Add its id/name/category to `src/widgets/widget-index.js`, its catalogue
   props/example and an interactive `WidgetLibrary` demo. The sidebar uses this
   lightweight index; examples remain in the lazy-loaded catalogue.
4. Add tests for behaviour, then check narrow screens, keyboard, loading/empty/
   error/disabled states, dark mode, all four layout presets and a light custom accent.
5. Run `npm test`, `npm run build`, and inspect `npm pack --dry-run` before release.

## Layout and spacing

Widget categories live under the expandable Widget library item in the main
back-office sidebar. The normal menu search also finds widgets. Each example
has a URL such as `/backoffice/widgets/data-table`; browser history, refresh,
breadcrumbs and the mobile navigation drawer follow that selection. All widget
and recipe routes require `backoffice.widgets.view`.

The saved `theme_density` setting now selects a complete layout: `wide` (centred,
up to 1,600 px, relaxed), `content` (centred, up to 1,120 px, comfortable),
`compact` (full width, tight spacing), or `flex` (full width, balanced spacing).
Older `comfortable` values read as `content`; no data migration is needed.
The root font size stays unchanged. Touch devices retain at least 44 px controls.

Widgets inherit `--cg-section-gap`, `--cg-card-padding`, `--cg-control-height`
and `--cg-cell-padding`. Use these spacing tokens in custom module layouts so
cards, controls and tables respond consistently. The back-office `app-content`
wrapper owns the maximum width; avoid adding a fixed-width wrapper to each page.
For a scoped preview, use `<div className="cgw-theme" data-density="compact">`.
Omit `data-density` to inherit the app setting. The gallery preview never saves
appearance changes; use Administration → Theme to save the installation layout.
