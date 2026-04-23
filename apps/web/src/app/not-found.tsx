import { PageShell } from '@/components/layout/page-shell'
import { EmptyState } from '@/components/ui/empty-state'

export default function NotFound() {
  return (
    <PageShell>
      <EmptyState
        eyebrow="404"
        title="Pagina nao encontrada"
        description="O link que procuraste nao existe nesta fase do MVP ou foi movido."
        ctaHref="/"
        ctaLabel="Voltar a home"
      />
    </PageShell>
  )
}
