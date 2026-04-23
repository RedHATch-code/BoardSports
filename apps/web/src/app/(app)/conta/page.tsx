import { ProfileForm } from '@/components/forms/profile-form'
import { PageShell } from '@/components/layout/page-shell'
import { Card } from '@/components/ui/card'
import { updateOwnProfileAction } from '@/features/profiles/actions'
import { requireCurrentUser } from '@/features/auth/queries'
import { getOwnProfile, getOwnSportIds, listSports } from '@/features/profiles/queries'

export default async function AccountPage() {
  const user = await requireCurrentUser()
  const [profile, selectedSportIds, sports] = await Promise.all([
    getOwnProfile(user.id),
    getOwnSportIds(user.id),
    listSports()
  ])

  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Conta</p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">Perfil do utilizador</h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Aqui fechas a base do perfil do MVP: username, bio curta e localizacao.
        </p>
      </div>

      <Card className="max-w-4xl">
        <ProfileForm
          action={updateOwnProfileAction}
          sports={sports}
          defaultValues={{
            email: user.email ?? '',
            username: profile?.username ?? user.profile?.username ?? '',
            fullName: profile?.full_name ?? user.profile?.full_name ?? '',
            bio: profile?.bio ?? '',
            locationLabel: profile?.location_label ?? '',
            avatarUrl: profile?.avatar_url ?? '',
            selectedSportIds
          }}
        />
      </Card>
    </PageShell>
  )
}
