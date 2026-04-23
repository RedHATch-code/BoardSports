import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'

const highlights = [
  {
    title: 'Marketplace leve',
    description: 'Anuncios simples, filtros claros e contacto por mensagem interna sem complicar o MVP com pagamentos.'
  },
  {
    title: 'Mapa de spots',
    description: 'Exploracao focada em Portugal com niveis de visibilidade para spots publicos, sensiveis e privados.'
  },
  {
    title: 'Base para crescer',
    description: 'Arquitetura por dominio, Supabase com RLS e Next.js App Router preparados para evolucao.'
  }
]

export default function HomePage() {
  return (
    <PageShell className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Badge>Portugal · skate · surf · skimboard · snowboard</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Marketplace, spots e comunidade numa unica base pronta para produto.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/70">
              Este MVP junta descoberta de material, favoritos, perfil e exploracao de spots para a comunidade de desportos de prancha com foco inicial em Portugal.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/produtos"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Explorar produtos
            </Link>
            <Link
              href="/spots"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-semibold text-white/80 transition hover:bg-white/8"
            >
              Explorar spots
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/76">
                Roadmap atual
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/56">
                MVP base
              </span>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/8 bg-slate-950/40 p-5">
                <p className="text-sm text-white/60">Prioridade de produto</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Comunidade + mapa de spots + marketplace leve
                </p>
              </div>
              <div className="grid gap-3">
                {['Autenticacao e perfis', 'CRUD de anuncios', 'CRUD de spots com mapa', 'Favoritos, inbox e reports'].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-sm text-white/72">{item}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-cyan-100/60">planeado</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/68">Core</p>
            <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
            <p className="text-sm leading-7 text-white/66">{item.description}</p>
          </Card>
        ))}
      </section>
    </PageShell>
  )
}
