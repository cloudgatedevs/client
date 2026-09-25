import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  Input,
  Select,
  Skeleton,
} from "./primitives.jsx";
import {
  clampPage,
  mergeRows,
  pageNumbers,
  queryRows,
  tableValue,
  validatePage,
} from "./table-model.js";

const EMPTY_ROWS = [],
  EMPTY_FILTERS = {};
const defaultRowId = (row) => row.id;
/** Remote loading stays page-sized; the loader owns authorization and server-side filtering. */
export function DataTable({
  columns,
  rows = EMPTY_ROWS,
  loadRows,
  getRowId = defaultRowId,
  label = "Records",
  pageSize: initialPageSize = 10,
  pageSizes = [10, 25, 50],
  initialSort = null,
  searchPlaceholder = "Search records…",
  searchable = true,
  debounceMs = 300,
  filters = EMPTY_FILTERS,
  reloadKey,
  pagination = "pages",
  selectable = false,
  selectedIds,
  onSelectionChange,
  toolbar,
  rowActions,
  emptyTitle = "No records found",
  emptyDescription = "Try a different search or adjust your filters.",
  loading: externalLoading = false,
  error: externalError,
  onRetry,
  onQueryChange,
  className = "",
}) {
  const [query, setQuery] = useState({
    page: 1,
    pageSize: Math.max(1, initialPageSize),
    search: "",
    sort: initialSort,
  });
  const [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0),
    [hidden, setHidden] = useState([]),
    [selection, setSelection] = useState([]);
  const [remote, setRemote] = useState({
    rows: [],
    total: 0,
    loading: !!loadRows,
    error: null,
  });
  const loaderRef = useRef(loadRows),
    rowIdRef = useRef(getRowId),
    queryChangeRef = useRef(onQueryChange),
    sequence = useRef(0),
    sentinel = useRef(null),
    scrollRoot = useRef(null);
  loaderRef.current = loadRows;
  rowIdRef.current = getRowId;
  queryChangeRef.current = onQueryChange;
  const isRemote = !!loadRows,
    cumulative = pagination !== "pages",
    filtersKey = JSON.stringify(filters),
    previousFilters = useRef(filtersKey),
    previousReload = useRef(reloadKey),
    previousMode = useRef(pagination);
  const activeIds = selectedIds ?? selection;
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((previous) =>
          previous.search === search
            ? previous
            : { ...previous, page: 1, search },
        ),
      debounceMs,
    );
    return () => clearTimeout(timer);
  }, [search, debounceMs]);
  // Filter changes reset before fetching, so page N is never appended to a new query.
  useEffect(() => {
    if (
      previousFilters.current !== filtersKey ||
      previousReload.current !== reloadKey ||
      previousMode.current !== pagination
    ) {
      previousFilters.current = filtersKey;
      previousReload.current = reloadKey;
      previousMode.current = pagination;
      if (query.page !== 1) {
        setQuery((previous) => ({ ...previous, page: 1 }));
        return;
      }
    }
    const controller = new AbortController(),
      request = ++sequence.current;
    const args = {
      ...query,
      filters: JSON.parse(filtersKey),
      signal: controller.signal,
    };
    queryChangeRef.current?.(args);
    if (!isRemote) return () => controller.abort();
    setRemote((previous) => ({
      ...previous,
      rows: cumulative && query.page > 1 ? previous.rows : [],
      loading: true,
      error: null,
    }));
    Promise.resolve()
      .then(() => loaderRef.current(args))
      .then(validatePage)
      .then((result) => {
        if (controller.signal.aborted || request !== sequence.current) return;
        const page = clampPage(query.page, result.total, query.pageSize);
        if (page !== query.page) {
          setQuery((previous) => ({
            ...previous,
            page: cumulative ? 1 : page,
          }));
          return;
        }
        setRemote((previous) => ({
          rows:
            cumulative && query.page > 1
              ? mergeRows(previous.rows, result.rows, rowIdRef.current)
              : result.rows,
          total: result.total,
          loading: false,
          error: null,
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted || request !== sequence.current) return;
        setRemote((previous) => ({ ...previous, loading: false, error }));
      });
    return () => controller.abort();
  }, [
    query,
    filtersKey,
    reloadKey,
    revision,
    isRemote,
    cumulative,
    pagination,
  ]);
  const local = useMemo(
    () =>
      queryRows(rows, columns, {
        ...query,
        filters,
        ...(cumulative
          ? { page: 1, pageSize: query.page * query.pageSize }
          : {}),
      }),
    [rows, columns, query, filtersKey, cumulative],
  );
  useEffect(() => {
    if (!isRemote && !cumulative && local.page !== query.page)
      setQuery((previous) => ({ ...previous, page: local.page }));
  }, [isRemote, cumulative, local.page, query.page]);
  const result = isRemote ? remote : local,
    loading = externalLoading || (isRemote && remote.loading),
    error = externalError || (isRemote && remote.error);
  const pages = Math.max(1, Math.ceil(result.total / query.pageSize)),
    canLoadMore = query.page < pages;
  useEffect(() => {
    if (
      pagination !== "infinite" ||
      loading ||
      error ||
      !canLoadMore ||
      !sentinel.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          setQuery((previous) => ({ ...previous, page: previous.page + 1 }));
        }
      },
      { root: scrollRoot.current, rootMargin: "80px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [pagination, loading, error, canLoadMore, query.page]);
  const visibleColumns = columns.filter(
    (column) => !hidden.includes(column.key),
  );
  const ids = result.rows.map(getRowId),
    allSelected = ids.length > 0 && ids.every((id) => activeIds.includes(id)),
    someSelected = ids.some((id) => activeIds.includes(id));
  function select(next) {
    setSelection(next);
    onSelectionChange?.(next);
  }
  function refresh() {
    if (cumulative && query.page > 1)
      setQuery((previous) => ({ ...previous, page: 1 }));
    else setRevision((value) => value + 1);
    onRetry?.();
  }
  function sortBy(column) {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      sort:
        previous.sort?.key !== column.key
          ? { key: column.key, direction: "asc" }
          : previous.sort.direction === "asc"
            ? { key: column.key, direction: "desc" }
            : null,
    }));
  }
  const columnCount =
    visibleColumns.length + Number(selectable) + Number(!!rowActions);
  return (
    <section
      className={`cgw-table ${className}`}
      aria-label={label}
      aria-busy={loading}
    >
      <div className="cgw-table-toolbar">
        <div className="cgw-table-tools">
          {searchable && (
            <Input
              type="search"
              aria-label={`Search ${label}`}
              icon={Search}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          {toolbar}
        </div>
        <div className="cgw-row">
          <details className="cgw-columns">
            <summary title="Choose columns">
              <Columns3 size={16} />
              <span>Columns</span>
            </summary>
            <div>
              {columns.map((column) => (
                <Checkbox
                  key={column.key}
                  label={column.label}
                  checked={!hidden.includes(column.key)}
                  disabled={
                    !hidden.includes(column.key) && visibleColumns.length === 1
                  }
                  onChange={() =>
                    setHidden((previous) =>
                      previous.includes(column.key)
                        ? previous.filter((key) => key !== column.key)
                        : [...previous, column.key],
                    )
                  }
                />
              ))}
            </div>
          </details>
          {isRemote && (
            <IconButton
              label="Refresh records"
              icon={RefreshCw}
              onClick={refresh}
              loading={loading}
            />
          )}
        </div>
      </div>
      <div className="cgw-table-loading-track" data-loading={loading || undefined} aria-hidden="true"><span /></div>
      {selectable && activeIds.length > 0 && (
        <div className="cgw-selection-bar">
          <span>{activeIds.length} selected</span>
          <Button size="sm" variant="ghost" icon={X} onClick={() => select([])}>
            Clear selection
          </Button>
        </div>
      )}
      {error && (
        <div className="cgw-table-feedback">
          <Alert
            tone="danger"
            title="Could not load records"
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                Try again
              </Button>
            }
          >
            {error.message || String(error)}
          </Alert>
        </div>
      )}
      <div
        className="cgw-table-scroll"
        ref={scrollRoot}
        tabIndex={0}
        role="region"
        aria-label={`${label} table`}
      >
        <table>
          <caption className="cgw-sr-only">{label}</caption>
          <thead>
            <tr>
              {selectable && (
                <th className="cgw-table-check">
                  <Checkbox
                    label={
                      <span className="cgw-sr-only">Select visible rows</span>
                    }
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    disabled={!ids.length || loading}
                    onChange={() =>
                      select(
                        allSelected
                          ? activeIds.filter((id) => !ids.includes(id))
                          : [...new Set([...activeIds, ...ids])],
                      )
                    }
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width, textAlign: column.align }}
                  aria-sort={
                    query.sort?.key === column.key
                      ? query.sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable !== false
                        ? "none"
                        : undefined
                  }
                >
                  {column.sortable !== false ? (
                    <button
                      type="button"
                      className="cgw-sort"
                      onClick={() => sortBy(column)}
                    >
                      {column.label}
                      {query.sort?.key === column.key ? (
                        query.sort.direction === "asc" ? (
                          <ArrowUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )
                      ) : (
                        <ArrowUpDown size={13} />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {rowActions && (
                <th scope="col">
                  <span className="cgw-sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr
                key={getRowId(row)}
                data-selected={activeIds.includes(getRowId(row)) || undefined}
              >
                {selectable && (
                  <td>
                    <Checkbox
                      label={
                        <span className="cgw-sr-only">
                          Select row {getRowId(row)}
                        </span>
                      }
                      checked={activeIds.includes(getRowId(row))}
                      onChange={() =>
                        select(
                          activeIds.includes(getRowId(row))
                            ? activeIds.filter((id) => id !== getRowId(row))
                            : [...activeIds, getRowId(row)],
                        )
                      }
                    />
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }}>
                    {column.render
                      ? column.render(tableValue(row, column), row)
                      : String(tableValue(row, column) ?? "—")}
                  </td>
                ))}
                {rowActions && (
                  <td className="cgw-table-actions">{rowActions(row)}</td>
                )}
              </tr>
            ))}
            {loading &&
              (!result.rows.length || cumulative) &&
              Array.from(
                {
                  length: result.rows.length ? 2 : Math.min(query.pageSize, 5),
                },
                (_, index) => (
                  <tr key={`loading-${index}`} aria-hidden="true">
                    {Array.from({ length: columnCount }, (_, col) => (
                      <td key={col}>
                        <div className="cgw-table-skeleton-cell" style={{ minHeight: rowActions ? 'var(--cgw-control-height)' : '1.25rem' }}>
                          <Skeleton width={col === 0 ? "70%" : "85%"} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ),
              )}
            {!loading && !error && !result.rows.length && (
              <tr>
                <td colSpan={columnCount}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={
                      search && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSearch("");
                            setQuery((previous) => ({
                              ...previous,
                              search: "",
                              page: 1,
                            }));
                          }}
                        >
                          Clear search
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {pagination === "infinite" && (
          <div ref={sentinel} className="cgw-table-sentinel" />
        )}
      </div>
      <footer className="cgw-table-footer">
        <div className="cgw-row">
          <Select
            aria-label="Rows per page"
            value={query.pageSize}
            options={[...new Set([query.pageSize, ...pageSizes])]
              .sort((a, b) => a - b)
              .map((value) => ({ value, label: `${value} / page` }))}
            onChange={(e) =>
              setQuery((previous) => ({
                ...previous,
                page: 1,
                pageSize: Number(e.target.value),
              }))
            }
          />
          <span className="cgw-table-status" role="status" aria-live="polite">
            {loading && <LoaderCircle size={14} className="cgw-spin" aria-hidden="true" />}
            {error
              ? "Unable to load records"
              : loading
                ? "Loading…"
                : result.total
                  ? `${cumulative ? 1 : (query.page - 1) * query.pageSize + 1}–${cumulative ? result.rows.length : Math.min(query.page * query.pageSize, result.total)} of ${result.total.toLocaleString()}`
                  : "0 records"}
          </span>
        </div>
        {cumulative ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setQuery((previous) => ({ ...previous, page: previous.page + 1 }))
            }
            disabled={!canLoadMore || loading || !!error}
            loading={loading}
          >
            {loading
              ? "Loading…"
              : canLoadMore
                ? "Load more"
                : "All records loaded"}
          </Button>
        ) : (
          <nav className="cgw-row" aria-label={`${label} pagination`}>
            <IconButton
              label="Previous page"
              icon={ChevronLeft}
              disabled={query.page <= 1 || loading}
              onClick={() =>
                setQuery((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
            />
            {pageNumbers(query.page, pages).map((page, index, values) => (
              <span key={page} className="cgw-row">
                {index > 0 && page - values[index - 1] > 1 && (
                  <span className="cgw-ellipsis">…</span>
                )}
                <button
                  type="button"
                  className="cgw-page"
                  aria-label={`Page ${page}`}
                  aria-current={page === query.page ? "page" : undefined}
                  disabled={loading}
                  onClick={() =>
                    setQuery((previous) => ({ ...previous, page }))
                  }
                >
                  {page}
                </button>
              </span>
            ))}
            <IconButton
              label="Next page"
              icon={ChevronRight}
              disabled={query.page >= pages || loading}
              onClick={() =>
                setQuery((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            />
          </nav>
        )}
      </footer>
    </section>
  );
}
