"use client";

// Small shared building blocks of the "wood and stone" design system.

import Link from "next/link";
import type { ReactNode } from "react";
import type { LoadState } from "@/lib/api";
import type { Color } from "@/lib/go";

export function Chevron({ direction = "left", size = 18 }: { direction?: "left" | "right"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d={direction === "left" ? "M11 3L5 9l6 6" : "M7 3l6 6-6 6"} fill="none" stroke="currentColor" strokeWidth={2.2} />
    </svg>
  );
}

export function Check({ size = 18, color = "#2F6B4F" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M3 8l3 3 7-7" fill="none" stroke={color} strokeWidth={2.2} />
    </svg>
  );
}

export function Stone({ color, size = 16 }: { color: Color; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: "none" }}>
      {color === "B" ? <circle cx={8} cy={8} r={7} fill="#1B1A17" /> : <circle cx={8} cy={8} r={6.5} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />}
    </svg>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <Chevron />
      {children}
    </Link>
  );
}

/** Yellow banner shown on screens that are still being tested. */
export function DevBanner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="shell">
      <p className="rounded-[24px] bg-honey px-5 py-3 text-[15px]">
        <strong>Version de développement.</strong> {children}
      </p>
    </div>
  );
}

const NOTICES = {
  success: { background: "bg-jade-light", badge: "bg-jade", sign: "✓" },
  warning: { background: "bg-honey", badge: "bg-clay-dark", sign: "!" },
  error: { background: "bg-danger-light", badge: "bg-danger", sign: "×" },
} as const;

export function Notice({
  type,
  title,
  children,
  action,
}: {
  type: keyof typeof NOTICES;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const n = NOTICES[type];
  return (
    <div role={type === "error" ? "alert" : "status"} className={`notice flex-wrap ${n.background}`}>
      <span aria-hidden="true" className={`notice-icon ${n.badge}`}>
        {n.sign}
      </span>
      <p className="min-w-0 flex-[1_1_240px]">
        <strong>{title}</strong> {children}
      </p>
      {action}
    </div>
  );
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Étapes" className="grid list-none gap-3" style={{ gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))` }}>
      {steps.map((name, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={name} aria-current={active ? "step" : undefined} className="flex flex-col gap-2">
            <span aria-hidden="true" className={`h-1.5 rounded-[3px] ${done ? "bg-jade" : active ? "bg-ink" : "bg-[#D5D8DE]"}`} />
            <span className={`text-[15px] ${done ? "font-bold text-jade" : active ? "font-extrabold" : "text-pebble"}`}>
              {done && <span aria-hidden="true">✓ </span>}
              {i + 1}. {name}
              {done && <span className="sr-only"> (terminée)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M12 3a9 9 0 019 9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** Renders the waiting or error state of a load, otherwise its content. */
export function Loaded<T>({
  state,
  children,
  label = "Chargement…",
}: {
  state: LoadState<T>;
  children: (data: T) => ReactNode;
  label?: string;
}) {
  if (state.data !== null) return <>{children(state.data)}</>;
  if (state.error) {
    return (
      <Notice
        type="error"
        title={state.error.status === 404 ? "Introuvable." : "Chargement impossible."}
        action={
          <button type="button" className="btn btn-thin font-bold" onClick={state.reload}>
            Réessayer
          </button>
        }
      >
        {state.error.message}
      </Notice>
    );
  }
  return (
    <p role="status" className="flex items-center gap-3 py-6 text-pebble">
      <Spinner /> {label}
    </p>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel items-start">
      <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
        <rect width={64} height={64} rx={14} fill="#EBCB8B" />
        <path d="M12 22H52M12 42H52M22 12V52M42 12V52" stroke="#9A6B2A" strokeWidth={1.4} />
        <circle cx={22} cy={22} r={7} fill="#1B1A17" />
        <circle cx={42} cy={42} r={7} fill="#FFFFFF" stroke="#1B1A17" strokeWidth={1.5} />
      </svg>
      <h2 className="heading text-[22px]">{title}</h2>
      {children && <p className="text-pebble">{children}</p>}
      {action}
    </div>
  );
}

/** Page title block: optional back link, title, lead paragraph, actions on the right. */
export function PageTitle({
  back,
  title,
  lead,
  actions,
  size = 38,
}: {
  back?: { href: string; label: string };
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  size?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && <BackLink href={back.href}>{back.label}</BackLink>}
        <h1 className="heading" style={{ fontSize: `clamp(28px, 5vw, ${size}px)` }}>
          {title}
        </h1>
        {lead && <p className="mt-2 text-[18px] text-pebble">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
