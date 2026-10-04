import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "info" | "warn" | "danger" | "success";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "from-sky-500/12 to-cyan-500/6 text-sky-700",
    info: "from-cyan-500/14 to-sky-500/6 text-cyan-700",
    warn: "from-amber-500/14 to-orange-500/6 text-amber-700",
    danger: "from-rose-500/14 to-red-500/6 text-rose-700",
    success: "from-emerald-500/14 to-teal-500/6 text-emerald-700",
  };
  return (
    <div
      className={`glass glass-edge lift relative overflow-hidden rounded-2xl p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {value}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {icon && (
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-soft flex flex-col items-center rounded-2xl px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-white/70 text-sky-700 shadow-sm">
        {icon}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Glass section header used across dashboards. */
export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="grid size-8 place-items-center rounded-lg bg-white/70 text-sky-700 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold tracking-tight sm:text-base">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
