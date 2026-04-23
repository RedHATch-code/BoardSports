'use client'

import { useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { MessageActionState } from '@/features/messages/actions'

type MessageFormProps = {
  action: (
    prevState: MessageActionState,
    formData: FormData
  ) => Promise<MessageActionState>
  hiddenFields: Array<{ name: string; value: string }>
  placeholder: string
  submitLabel: string
}

const initialState: MessageActionState = {}

export function MessageForm({
  action,
  hiddenFields,
  placeholder,
  submitLabel
}: MessageFormProps) {
  const router = useRouter()
  const [state, setState] = useState<MessageActionState>(initialState)
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await action(initialState, formData)
      setState(result)

      if (!result.error) {
        setBody('')
      }

      if (result.redirectTo) {
        router.push(result.redirectTo as Route)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {hiddenFields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <Textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        required
      />

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
        <Button type="submit" disabled={pending}>
          {pending ? 'A enviar...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
