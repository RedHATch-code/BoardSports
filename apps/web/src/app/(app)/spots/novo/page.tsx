import { PageShell } from '@/components/layout/page-shell'
import { SpotForm } from '@/components/forms/spot-form'
import { Card } from '@/components/ui/card'
import { requireCurrentUser } from '@/features/auth/queries'
import { createSpotAction } from '@/features/spots/actions'
import { getSpotSports } from '@/features/spots/queries'

export default async function NewSpotPage() {
  await requireCurrentUser()
  const sports = await getSpotSports()

  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Novo spot
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          Adicionar um spot ao mapa.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Escolhe a visibilidade certa, posiciona o spot no mapa e deixa contexto util para a
          comunidade.
        </p>
      </div>

      <Card className="max-w-6xl">
        <SpotForm
          sports={sports}
          action={createSpotAction}
          submitLabel="Publicar spot"
          mode="create"
          defaultValues={{
            sportId: '',
            title: '',
            description: '',
            visibility: 'public',
            difficulty: 'intermediate',
            bestTime: '',
            safetyNotes: '',
            locationLabel: '',
            latitude: '39.600000',
            longitude: '-8.200000',
            images: []
          }}
        />
      </Card>
    </PageShell>
  )
}
