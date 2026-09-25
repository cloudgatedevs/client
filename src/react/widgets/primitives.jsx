import { forwardRef, useId, useRef, useState, useLayoutEffect } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useAnimatedNumber } from './motion.js';
import { useFieldValidation } from './Form.jsx';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Info,
  LoaderCircle,
  SearchX,
  X,
} from "lucide-react";

const cx = (...values) => values.filter(Boolean).join(" ");
export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    icon: Icon,
    children,
    className,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "cgw-button",
        `cgw-button--${variant}`,
        `cgw-button--${size}`,
        className,
      )}
    >
      {loading ? (
        <LoaderCircle className="cgw-spin" size={16} aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} aria-hidden="true" />
      )}
      {children}
    </button>
  );
});
export const IconButton = forwardRef(function IconButton(
  { label, icon, className, ...props },
  ref,
) {
  return (
    <Button
      variant="ghost"
      {...props}
      ref={ref}
      icon={icon}
      aria-label={label}
      title={label}
      className={cx("cgw-icon-button", className)}
    />
  );
});
export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
  ...props
}) {
  return (
    <span
      {...props}
      className={cx("cgw-badge", `cgw-tone--${tone}`, className)}
    >
      {dot && <span className="cgw-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
export function Card({
  title,
  description,
  action,
  footer,
  children,
  className,
  loading = false,
  ...props
}) {
  return (
    <section {...props} className={cx("cgw-card", className)} aria-busy={loading || undefined}>
      {(title || description || action) && (
        <header className="cgw-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="cgw-card-body">{loading ? <WidgetSkeleton variant="card" /> : children}</div>
      {!loading && footer && <footer className="cgw-card-foot">{footer}</footer>}
    </section>
  );
}
export function CountUp({ value, formatValue, animate = true, duration = 700, loading = false, className }) {
  const number = Number.isFinite(value) ? value : 0;
  const displayed = useAnimatedNumber(number, { animate: animate && !loading, duration });
  const format = formatValue || (n => n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(number) ? 0 : 2 }));
  const final = format(number);
  return <span className={cx('cgw-count-up', className)} aria-busy={loading || undefined}>
    <span className="cgw-sr-only">{loading ? 'Loading value' : final}</span>
    {loading ? <Skeleton width="5ch" height="1em" /> : <span aria-hidden="true">{format(displayed)}</span>}
  </span>;
}
export function MetricCard({
  label,
  value,
  description,
  trend,
  tone = "neutral",
  icon: Icon,
  loading = false,
  formatValue,
  animate = true,
  duration = 700,
  children,
  className,
}) {
  return (
    <section
      className={cx("cgw-card cgw-metric", className)}
      aria-busy={loading || undefined}
    >
      <div className="cgw-metric-top">
        <span>{label}</span>
        {Icon && (
          <span className="cgw-metric-icon">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <WidgetSkeleton variant="metric" label={`Loading ${typeof label === 'string' ? label : 'metric'}`} />
      ) : (
        <strong className="cgw-metric-value">{typeof value === 'number' ? <CountUp {...{ value, formatValue, animate, duration }} /> : value}</strong>
      )}
      {!loading && <div className="cgw-metric-description">
        {trend != null && (
          <Badge tone={tone}>
            {String(trend).startsWith("-") ? (
              <ArrowDownRight size={13} />
            ) : (
              <ArrowUpRight size={13} />
            )}
            {trend}
          </Badge>
        )}
        {description && <span>{description}</span>}
      </div>}
      {!loading && children}
    </section>
  );
}
function FieldShell({ id, label, hint, error, required, children, className }) {
  return (
    <div className={cx("cgw-field", error && "cgw-field--error", className)}>
      {label && <label htmlFor={id}>{label}{required && <span className="cgw-required" aria-hidden="true"> *</span>}</label>}
      {children}
      {(error || hint) && (
        <p
          id={`${id}-help`}
          className="cgw-field-help"
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
const fieldProps = (id, hint, error, props) => ({
  ...props,
  id,
  "aria-invalid": error ? true : props["aria-invalid"],
  "aria-describedby":
    [props["aria-describedby"], (hint || error) && `${id}-help`]
      .filter(Boolean)
      .join(" ") || undefined,
});
export const Input = forwardRef(function Input(
  { label, hint, error, validate, validationMessages, id: suppliedId, className, icon: Icon, endAdornment, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <div className="cgw-input-wrap">
        {Icon && <Icon size={16} aria-hidden="true" />}
        <input
          {...fieldProps(id, hint, error, props)}
          {...validation.bindings}
          className="cgw-input"
        />
        {endAdornment && <span className="cgw-input-end">{endAdornment}</span>}
      </div>
    </FieldShell>
  );
});
export const Textarea = forwardRef(function Textarea(
  { label, hint, error, validate, validationMessages, id: suppliedId, className, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <textarea
        rows={4}
        {...fieldProps(id, hint, error, props)}
        {...validation.bindings}
        className="cgw-input"
      />
    </FieldShell>
  );
});
export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    validate,
    validationMessages,
    id: suppliedId,
    className,
    options = [],
    placeholder,
    ...props
  },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  const validation = useFieldValidation({ id, error, validate, validationMessages, props }, ref);
  error = validation.error;
  return (
    <FieldShell {...{ id, label, hint, error, className }} required={props.required}>
      <div className="cgw-select-wrap">
        <select
          {...fieldProps(id, hint, error, props)}
          {...validation.bindings}
          className="cgw-input"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </FieldShell>
  );
});
export const Checkbox = forwardRef(function Checkbox(
  { label, hint, indeterminate = false, className, ...props },
  ref,
) {
  const local = useRef(null);
  useLayoutEffect(() => {
    if (local.current) local.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className={cx("cgw-check", className)}>
      <input
        {...props}
        type="checkbox"
        ref={(node) => {
          local.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        aria-checked={indeterminate ? "mixed" : props.checked}
      />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
});
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
  id: suppliedId,
  ...props
}) {
  const uid = useId(),
    id = suppliedId || uid;
  return (
    <div className="cgw-switch-field">
      <div>
        <label htmlFor={id}>{label}</label>
        {hint && <p id={`${id}-help`}>{hint}</p>}
      </div>
      <button
        {...props}
        id={id}
        type="button"
        className="cgw-switch"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-help` : undefined}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = String,
  hint,
  id: suppliedId,
  ...props
}) {
  const uid = useId(),
    id = suppliedId || uid;
  const percent =
    max > min
      ? Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100))
      : 0;
  return (
    <div className="cgw-field cgw-slider">
      <div className="cgw-row cgw-between">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{formatValue(value)}</output>
      </div>
      <input
        {...props}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        aria-valuetext={formatValue(value)}
        aria-describedby={hint ? `${id}-help` : undefined}
        style={{ "--cgw-range": `${percent}%` }}
      />
      {hint && (
        <p id={`${id}-help`} className="cgw-field-help">
          {hint}
        </p>
      )}
    </div>
  );
}
export function Tabs({
  label = "Sections",
  items,
  value,
  onChange,
  className,
}) {
  const hasPanels = items.some((item) => item.content !== undefined);
  const id = useId(),
    refs = useRef([]);
  function onKeyDown(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const available = items
      .map((item, i) => (!item.disabled ? i : -1))
      .filter((i) => i >= 0);
    if (!available.length) return;
    const position = available.indexOf(index);
    const next =
      event.key === "Home"
        ? available[0]
        : event.key === "End"
          ? available.at(-1)
          : available[
              (position +
                (event.key === "ArrowRight" ? 1 : -1) +
                available.length) %
                available.length
            ];
    refs.current[next]?.focus();
    onChange(items[next].value);
  }
  return (
    <div className={cx("cgw-tabs", className)}>
      <div
        className="cgw-tablist"
        role={hasPanels ? "tablist" : "group"}
        aria-label={label}
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role={hasPanels ? "tab" : undefined}
            id={`${id}-tab-${index}`}
            aria-selected={hasPanels ? value === item.value : undefined}
            aria-pressed={!hasPanels ? value === item.value : undefined}
            aria-controls={
              item.content !== undefined ? `${id}-panel-${index}` : undefined
            }
            tabIndex={value === item.value ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {item.icon && <item.icon size={15} aria-hidden="true" />}
            {item.label}
            {item.count != null && <span>{item.count}</span>}
          </button>
        ))}
      </div>
      {items.map(
        (item, index) =>
          item.content !== undefined && (
            <div
              key={item.value}
              role="tabpanel"
              id={`${id}-panel-${index}`}
              aria-labelledby={`${id}-tab-${index}`}
              hidden={value !== item.value}
              tabIndex={0}
              className="cgw-tabpanel"
            >
              {item.content}
            </div>
          ),
      )}
    </div>
  );
}
export function Alert({ title, children, tone = "info", action, onDismiss }) {
  return (
    <div
      className={`cgw-alert cgw-tone--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Info size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        {children && <p>{children}</p>}
        {action}
      </div>
      {onDismiss && (
        <IconButton label="Dismiss message" icon={X} onClick={onDismiss} />
      )}
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description,
  icon: Icon = SearchX,
  action,
}) {
  return (
    <div className="cgw-empty">
      <span className="cgw-empty-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Skeleton({
  width = "100%",
  height = "1rem",
  className,
  style,
}) {
  return (
    <span
      className={cx("cgw-skeleton", className)}
      aria-hidden="true"
      style={{ width, height, ...style }}
    />
  );
}
/** Ready-made placeholders follow the geometry of the widget they replace. */
export function WidgetSkeleton({ variant = 'card', label = 'Loading content', height, className }) {
  return <div className={cx('cgw-widget-skeleton', `cgw-widget-skeleton--${variant}`, className)} role="status" aria-label={label} aria-busy="true" style={{ height }}>
    {variant === 'metric' ? <><Skeleton width="65%" height="2.25rem" /><Skeleton width="80%" height="1rem" /></> :
      variant === 'chart' ? <><div className="cgw-skeleton-legend"><Skeleton width="5rem" /><Skeleton width="4rem" /></div>
        <div className="cgw-skeleton-plot">{[36, 58, 47, 75, 64, 90, 78, 100].map((size, index) => <Skeleton key={index} width="100%" height={`${size}%`} />)}</div>
        <div className="cgw-skeleton-legend"><Skeleton width="25%" /><Skeleton width="25%" /></div></> :
      variant === 'donut' ? <div className="cgw-skeleton-donut-layout"><span className="cgw-skeleton cgw-skeleton-ring" /><div>{[1, 2, 3].map(n => <Skeleton key={n} width="100%" />)}</div></div> :
      <><Skeleton width="45%" height="1.25rem" /><Skeleton height="6rem" /><Skeleton width="85%" /><Skeleton width="60%" /></>}
  </div>;
}
export function Progress({
  value = 0,
  max = 100,
  label,
  showValue = true,
  tone = "accent",
  animate = true,
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(value, safeMax))
    : 0;
  return (
    <div className={`cgw-progress cgw-tone--${tone}`}>
      <div className="cgw-row cgw-between">
        <span>{label}</span>
        {showValue && <CountUp value={(safeValue / safeMax) * 100} formatValue={n => `${Math.round(n)}%`} animate={animate} duration={300} />}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span style={{ width: `${(safeValue / safeMax) * 100}%`, transition: animate ? undefined : 'none' }} />
      </div>
    </div>
  );
}
/** Uses the same Radix presence and animation classes as the SDK's other modals. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) {
  const [last, setLast] = useState(null),
    returnFocus = useRef(null);
  useLayoutEffect(() => {
    if (open) setLast({ title, description, children, footer });
  }, [open, title, description, children, footer]);
  const content = open ? { title, description, children, footer } : last;
  return (
    <RadixDialog.Root
      open={!!open}
      onOpenChange={(value) => {
        if (!value) onClose?.();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-backdrop cgw-dialog-backdrop" />
        <RadixDialog.Content
          className={`modal-panel cgw-dialog cgw-dialog--${size}`}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            setLast(null);
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
          onEscapeKeyDown={(e) => {
            if (!onClose) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!onClose) e.preventDefault();
          }}
        >
          <header className="cgw-dialog-head">
            <div>
              <RadixDialog.Title>{content?.title}</RadixDialog.Title>
              <RadixDialog.Description
                className={content?.description ? "" : "cgw-sr-only"}
              >
                {content?.description || content?.title}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close dialog" icon={X} disabled={!onClose} />
            </RadixDialog.Close>
          </header>
          <div className="cgw-dialog-body">{content?.children}</div>
          {content?.footer && (
            <footer className="cgw-dialog-foot">{content.footer}</footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
