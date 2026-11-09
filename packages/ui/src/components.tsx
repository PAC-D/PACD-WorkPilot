import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--navy-700)] text-white hover:bg-[var(--navy-800)] focus-visible:ring-[var(--navy-500)]",
  secondary:
    "border border-[var(--border)] bg-white text-[var(--navy-900)] hover:bg-[var(--navy-100)] focus-visible:ring-[var(--navy-500)]",
  ghost:
    "bg-transparent text-[var(--navy-900)] hover:bg-[var(--navy-100)] focus-visible:ring-[var(--navy-500)]",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90 focus-visible:ring-[var(--danger)]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className = "", type = "button", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`interactive-control type-body inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={`ui-card rounded-xl border border-[var(--border)] bg-white ${className}`}>{children}</section>
  );
}

export function CardHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
      <div>
        <h2 className="type-section-title text-[var(--navy-900)]">{title}</h2>
        {description ? <p className="type-body mt-1 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const statusStyles: Record<StatusTone, string> = {
  danger: "bg-red-50 text-[var(--danger)] ring-red-100",
  info: "bg-[var(--navy-100)] text-[var(--navy-800)] ring-blue-100",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-[var(--success)] ring-emerald-100",
  warning: "bg-amber-50 text-[var(--warning)] ring-amber-100",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`type-caption inline-flex rounded-full px-2.5 py-1 font-medium ring-1 ring-inset ${statusStyles[tone]}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

export interface Column<T> {
  header: string;
  key: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  caption,
  columns,
  getRowKey,
  rows,
}: {
  caption: string;
  columns: ReadonlyArray<Column<T>>;
  getRowKey: (row: T) => string;
  rows: ReadonlyArray<T>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="type-body w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="type-overline border-b border-[var(--border)] bg-[var(--canvas)] text-[var(--muted)]">
            {columns.map((column) => (
              <th className="px-4 py-3" key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--canvas)]" key={getRowKey(row)}>
              {columns.map((column) => (
                <td className="px-4 py-3 align-middle text-[var(--ink)]" key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="type-section-title text-[var(--navy-900)]">{title}</p>
      <p className="type-body mx-auto mt-1 max-w-md text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function Pagination({
  canNext,
  canPrevious,
  onNext,
  onPrevious,
}: {
  canNext: boolean;
  canPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <nav aria-label="Table pagination" className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
      <p className="type-caption text-[var(--muted)]">Cursor-based results</p>
      <div className="flex gap-2">
        <Button disabled={!canPrevious} onClick={onPrevious} variant="secondary">Previous</Button>
        <Button disabled={!canNext} onClick={onNext} variant="secondary">Next</Button>
      </div>
    </nav>
  );
}

export function IconButton({ label, children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>) {
  return (
    <button
      aria-label={label}
      className="interactive-control inline-flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--navy-900)] hover:bg-[var(--navy-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-500)]"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

interface CalendarInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

function CalendarInput({ className = "", id, label, ...props }: CalendarInputProps & { type: "date" | "month" }) {
  const inputId = id ?? props.name;
  if (!inputId) throw new Error("DatePicker and MonthPicker require an id or name");

  return (
    <label className="block" htmlFor={inputId}>
      <span className="type-label block text-[var(--navy-900)]">{label}</span>
      <input
        className={`interactive-control type-body mt-2 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--navy-500)] ${className}`}
        id={inputId}
        {...props}
      />
    </label>
  );
}

export function DatePicker(props: CalendarInputProps) {
  return <CalendarInput {...props} type="date" />;
}

export function MonthPicker(props: CalendarInputProps) {
  return <CalendarInput {...props} type="month" />;
}

