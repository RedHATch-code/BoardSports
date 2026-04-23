'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { AuthActionState } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AuthFormProps = {
  mode: 'login' | 'register'
  action: (
    prevState: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>
}

const initialState: AuthActionState = {}

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-4">
      {mode === 'register' ? (
        <>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/74">Nome</span>
            <Input name="fullName" placeholder="Nome completo" autoComplete="name" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/74">Username</span>
            <Input name="username" placeholder="teu-handle" autoComplete="username" required />
          </label>
        </>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/74">Email</span>
        <Input name="email" placeholder="nome@email.com" autoComplete="email" required />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/74">Palavra-passe</span>
        <Input
          name="password"
          type="password"
          placeholder="Minimo de 6 caracteres"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-400/24 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </Button>

      <p className="text-sm text-white/54">
        {mode === 'login' ? 'Ainda nao tens conta?' : 'Ja tens conta?'}{' '}
        <Link
          href={mode === 'login' ? '/registo' : '/login'}
          className="font-medium text-cyan-200 transition hover:text-cyan-100"
        >
          {mode === 'login' ? 'Criar conta' : 'Fazer login'}
        </Link>
      </p>
    </form>
  )
}
