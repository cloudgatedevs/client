import { forwardRef, useId, useRef, useState, useLayoutEffect } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
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
  ...props
}) {
  return (
    <section {...props} className={cx("cgw-card", className)}>
      {(title || description || action) && (
        <header className="cgw-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="cgw-card-body">{children}</div>
      {footer && <footer className="cgw-card-foot">{footer}</footer>}
    </section>
  );
}
export function MetricCard({
  label,
  value,
  description,
  trend,
  tone = "neutral",
  icon: Icon,
  loading = false,
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
        <Skeleton width="65%" height="2.25rem" />
      ) : (
        <strong className="cgw-metric-value">{value}</strong>
      )}
      <div className="cgw-metric-description">
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
      </div>
      {children}
    </section>
  );
}
function FieldShell({ id, label, hint, error, children, className }) {
  return (
    <div className={cx("cgw-field", error && "cgw-field--error", className)}>
      {label && <label htmlFor={id}>{label}</label>}
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
  { label, hint, error, id: suppliedId, className, icon: Icon, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  return (
    <FieldShell {...{ id, label, hint, error, className }}>
      <div className="cgw-input-wrap">
        {Icon && <Icon size={16} aria-hidden="true" />}
        <input
          {...fieldProps(id, hint, error, props)}
          ref={ref}
          className="cgw-input"
        />
      </div>
    </FieldShell>
  );
});
export const Textarea = forwardRef(function Textarea(
  { label, hint, error, id: suppliedId, className, ...props },
  ref,
) {
  const uid = useId(),
    id = suppliedId || uid;
  return (
    <FieldShell {...{ id, label, hint, error, className }}>
      <textarea
        rows={4}
        {...fieldProps(id, hint, error, props)}
        ref={ref}
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
  return (
    <FieldShell {...{ id, label, hint, error, className }}>
      <div className="cgw-select-wrap">
        <select
          {...fieldProps(id, hint, error, props)}
          ref={ref}
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
export function Progress({
  value = 0,
  max = 100,
  label,
  showValue = true,
  tone = "accent",
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(value, safeMax))
    : 0;
  return (
    <div className={`cgw-progress cgw-tone--${tone}`}>
      <div className="cgw-row cgw-between">
        <span>{label}</span>
        {showValue && <span>{Math.round((safeValue / safeMax) * 100)}%</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span style={{ width: `${(safeValue / safeMax) * 100}%` }} />
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
