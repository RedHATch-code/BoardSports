import { AuthForm } from '@/components/forms/auth-form'
import { Card } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { signInAction } from '@/features/auth/actions'

export default function LoginPage() {
  return (
    <PageShell className="grid min-h-[70vh] place-items-center">
      <Card className="w-full max-w-lg space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Autenticacao</p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">Entrar</h1>
          <p className="text-sm leading-7 text-white/64">
            Acede ao teu perfil, favoritos, inbox e conteudo publicado.
          </p>
        </div>
        <AuthForm mode="login" action={signInAction} />
      </Card>
    </PageShell>
  )
}
