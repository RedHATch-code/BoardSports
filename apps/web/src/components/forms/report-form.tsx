'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ReportActionState } from '@/features/reports/actions'

type ReportFormProps = {
  action: (
    prevState: ReportActionState,
    formData: FormData
  ) => Promise<ReportActionState>
  hiddenFields: Array<{ name: string; value: string }>
}

const initialState: ReportActionState = {}

export function ReportForm({ action, hiddenFields }: ReportFormProps) {
  const [state, setState] = useState<ReportActionState>(initialState)
  const [pending, startTransition] = useTransition()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await action(initialState, formData)
      setState(result)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {hiddenFields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Motivo</span>
        <Input name="reason" placeholder="Ex: conteudo enganoso" required />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Detalhes</span>
        <Textarea
          name="details"
          placeholder="Contexto adicional para a moderacao. Opcional."
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-400/24 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-2xl border border-emerald-400/24 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {state.success}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'A enviar...' : 'Enviar denuncia'}
        </Button>
      </div>
    </form>
  )
}
