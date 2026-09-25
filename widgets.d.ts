import type * as React from "react";
export type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type Icon = React.ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: Icon;
}
export const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
export const IconButton: React.ForwardRefExoticComponent<
  Omit<ButtonProps, "children"> & {
    label: string;
    icon: Icon;
  } & React.RefAttributes<HTMLButtonElement>
>;
export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean },
): React.JSX.Element;
export function Card(
  props: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    footer?: React.ReactNode;
  },
): React.JSX.Element;
export function MetricCard(props: {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: Tone;
  icon?: Icon;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}): React.JSX.Element;
export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
}
export const Input: React.ForwardRefExoticComponent<
  React.InputHTMLAttributes<HTMLInputElement> &
    FieldProps & { icon?: Icon } & React.RefAttributes<HTMLInputElement>
>;
export const Textarea: React.ForwardRefExoticComponent<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    FieldProps &
    React.RefAttributes<HTMLTextAreaElement>
>;
export const Select: React.ForwardRefExoticComponent<
  React.SelectHTMLAttributes<HTMLSelectElement> &
    FieldProps & {
      options: { value: string | number; label: string; disabled?: boolean }[];
      placeholder?: string;
    } & React.RefAttributes<HTMLSelectElement>
>;
export const Checkbox: React.ForwardRefExoticComponent<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: React.ReactNode;
    hint?: React.ReactNode;
    indeterminate?: boolean;
  } & React.RefAttributes<HTMLInputElement>
>;
export function Switch(
  props: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    label: React.ReactNode;
    hint?: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  },
): React.JSX.Element;
export function Slider(
  props: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "min" | "max" | "step"
  > & {
    label: string;
    hint?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    formatValue?: (value: number) => string;
  },
): React.JSX.Element;
export interface TabItem {
  value: string;
  label: React.ReactNode;
  content?: React.ReactNode;
  icon?: Icon;
  count?: number;
  disabled?: boolean;
}
export function Tabs(props: {
  label?: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}): React.JSX.Element;
export function Alert(props: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  onDismiss?: () => void;
}): React.JSX.Element;
export function EmptyState(props: {
  title?: string;
  description?: string;
  icon?: Icon;
  action?: React.ReactNode;
}): React.JSX.Element;
export function Skeleton(props: {
  width?: React.CSSProperties["width"];
  height?: React.CSSProperties["height"];
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element;
export function Progress(props: {
  label: string;
  value?: number;
  max?: number;
  showValue?: boolean;
  tone?: Tone;
}): React.JSX.Element;
export function Dialog(props: {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}): React.JSX.Element;
export type RowId = string | number;
export interface TableSort {
  key: string;
  direction: "asc" | "desc";
}
export interface TableQuery {
  page: number;
  pageSize: number;
  search: string;
  sort: TableSort | null;
  filters: Record<string, unknown>;
  signal: AbortSignal;
}
export interface TableColumn<T> {
  key: string;
  label: string;
  accessor?: (row: T) => unknown;
  render?: (value: any, row: T) => React.ReactNode;
  compare?: (left: any, right: any, a: T, b: T) => number;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "center" | "right";
  width?: React.CSSProperties["width"];
}
export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows?: T[];
  loadRows?: (query: TableQuery) => Promise<{ rows: T[]; total: number }>;
  getRowId?: (row: T) => RowId;
  label?: string;
  pageSize?: number;
  pageSizes?: number[];
  initialSort?: TableSort | null;
  searchPlaceholder?: string;
  searchable?: boolean;
  debounceMs?: number;
  filters?: Record<string, unknown>;
  reloadKey?: string | number;
  pagination?: "pages" | "load-more" | "infinite";
  selectable?: boolean;
  selectedIds?: RowId[];
  onSelectionChange?: (ids: RowId[]) => void;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  onQueryChange?: (query: TableQuery) => void;
  className?: string;
}
export function DataTable<T>(props: DataTableProps<T>): React.JSX.Element;
export interface ChartSeries {
  key: string;
  label: string;
}
export interface ChartProps {
  data?: Record<string, unknown>[];
  series: ChartSeries[];
  xKey?: string;
  label?: string;
  formatValue?: (value: number) => string;
  height?: number;
  loading?: boolean;
  showDataTable?: boolean;
}
export function LineChart(props: ChartProps): React.JSX.Element;
export function BarChart(props: ChartProps): React.JSX.Element;
export function DonutChart(
  props: Omit<ChartProps, "series" | "xKey" | "height"> & {
    labelKey?: string;
    valueKey?: string;
  },
): React.JSX.Element;
