import Link from 'next/link'
import type { Route } from 'next'

import { Card } from '@/components/ui/card'

type EmptyStateProps = {
  eyebrow: string
  title: string
  description: string
  ctaHref?: Route
  ctaLabel?: string
}

export function EmptyState({
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/72">
        {eyebrow}
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="max-w-2xl text-sm leading-7 text-white/68">{description}</p>
      </div>
      {ctaHref && ctaLabel ? (
        <div>
          <Link
            href={ctaHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,0.22)] transition hover:bg-amber-300"
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </Card>
  )
}
