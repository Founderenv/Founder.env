import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function SectionHead({
  label,
  href,
  hrefLabel,
}: {
  label: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="label">{label}</h2>
      {href ? (
        <Link to={href} className="text-[12px] text-subtle hover:text-foreground">
          {hrefLabel ?? "View all"} →
        </Link>
      ) : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const active = status.toUpperCase() === "ACTIVE" || status.toUpperCase() === "AVAILABLE";
  return (
    <span
      className="meta shrink-0 border px-2.5 py-1 text-[10px] tracking-[0.16em]"
      style={
        active
          ? {
              color: "var(--accent-2)",
              borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)",
              background: "var(--accent-glow)",
            }
          : { color: "var(--muted-text)", borderColor: "var(--border)" }
      }
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export function IndexNum({ n }: { n: number }) {
  return <span className="meta w-6 shrink-0 text-muted-foreground">{String(n).padStart(2, "0")}</span>;
}

export function PageHeader({
  title,
  description,
  crumbs,
  children,
}: {
  title: string;
  description?: string | null;
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="shell pb-10 pt-14">
      {crumbs?.length ? (
        <div className="label mb-5 flex flex-wrap items-center gap-2">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-2">
              {i > 0 ? <span className="opacity-40">/</span> : null}
              {c.href ? (
                <Link to={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-subtle">{c.label}</span>
              )}
            </span>
          ))}
        </div>
      ) : null}
      <h1 className="text-[34px] leading-[1.1] md:text-[42px]">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-xl text-[13px] text-subtle">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
