import { AuthForm } from '@/components/forms/auth-form'
import { Card } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { signUpAction } from '@/features/auth/actions'

export default function RegisterPage() {
  return (
    <PageShell className="grid min-h-[70vh] place-items-center">
      <Card className="w-full max-w-xl space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Registo</p>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">Criar conta</h1>
          <p className="text-sm leading-7 text-white/64">
            Cria a tua identidade na plataforma antes de publicares anuncios, spots ou favoritares conteudo.
          </p>
        </div>
        <AuthForm mode="register" action={signUpAction} />
      </Card>
    </PageShell>
  )
}
