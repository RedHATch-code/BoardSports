'use client'

import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ProfileActionState } from '@/features/profiles/actions'
import { uploadFiles } from '@/features/shared/upload'

type ProfileFormProps = {
  defaultValues: {
    username: string
    fullName: string
    bio: string
    locationLabel: string
    email: string
    avatarUrl: string
    selectedSportIds: string[]
  }
  sports: { id: string; name: string; slug: string }[]
  action: (
    prevState: ProfileActionState,
    formData: FormData
  ) => Promise<ProfileActionState>
}

const initialState: ProfileActionState = {}

export function ProfileForm({ defaultValues, sports, action }: ProfileFormProps) {
  const [state, setState] = useState<ProfileActionState>(initialState)
  const [pending, startTransition] = useTransition()
  const [avatarPreview, setAvatarPreview] = useState(defaultValues.avatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const selectedSports = useMemo(() => new Set(defaultValues.selectedSportIds), [defaultValues.selectedSportIds])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        let avatarUrl = avatarPreview

        if (avatarFile) {
          const [upload] = await uploadFiles('avatars', [avatarFile])
          avatarUrl = upload?.publicUrl || ''
        }

        formData.set('avatarUrl', avatarUrl)
        const result = await action(initialState, formData)
        setState(result)

        if (!result.error && avatarUrl) {
          setAvatarPreview(avatarUrl)
        }
      } catch (error) {
        setState({
          error: error instanceof Error ? error.message : 'Nao foi possivel guardar o perfil.'
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-3">
        <span className="text-sm font-medium text-white/72">Avatar</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/6">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs uppercase tracking-[0.24em] text-white/44">Sem avatar</span>
            )}
          </div>
          <label className="grid gap-2">
            <span className="text-sm text-white/58">Selecionar imagem</span>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setAvatarFile(file)
                if (file) {
                  setAvatarPreview(URL.createObjectURL(file))
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Email</span>
          <Input value={defaultValues.email} disabled />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Username</span>
          <Input name="username" defaultValue={defaultValues.username} required />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Nome</span>
          <Input name="fullName" defaultValue={defaultValues.fullName} required />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Localizacao</span>
          <Input name="locationLabel" defaultValue={defaultValues.locationLabel} placeholder="Ex: Porto, Portugal" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Bio curta</span>
        <Textarea
          name="bio"
          defaultValue={defaultValues.bio}
          placeholder="Quem es na comunidade, o que praticas e que material costumas procurar."
        />
      </label>

      <div className="grid gap-3">
        <span className="text-sm font-medium text-white/72">Modalidades praticadas</span>
        <div className="grid gap-3 md:grid-cols-2">
          {sports.map((sport) => (
            <label
              key={sport.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78"
            >
              <input
                type="checkbox"
                name="sports"
                value={sport.id}
                defaultChecked={selectedSports.has(sport.id)}
                className="h-4 w-4 rounded border-white/20 bg-slate-950/60 accent-cyan-300"
              />
              <span>{sport.name}</span>
            </label>
          ))}
        </div>
      </div>

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
          {pending ? 'A guardar...' : 'Guardar perfil'}
        </Button>
      </div>
    </form>
  )
}
