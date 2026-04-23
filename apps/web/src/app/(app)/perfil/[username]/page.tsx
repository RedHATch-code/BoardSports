import { notFound } from 'next/navigation'

import { PageShell } from '@/components/layout/page-shell'
import { Card } from '@/components/ui/card'
import { getProfileByUsername } from '@/features/profiles/queries'

type ProfilePageProps = {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    notFound()
  }

  return (
    <PageShell>
      <Card className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Perfil publico</p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          {profile.full_name ?? profile.username}
        </h1>
        <div className="space-y-2 text-sm leading-7 text-white/66">
          <p>@{profile.username}</p>
          <p>{profile.bio ?? 'Sem bio publicada.'}</p>
          <p>{profile.location_label ?? 'Localizacao nao indicada.'}</p>
        </div>
      </Card>
    </PageShell>
  )
}
