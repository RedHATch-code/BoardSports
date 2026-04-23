'use client'

import { useRef, useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { SportOption } from '@/features/marketplace/types'
import type { SpotActionState } from '@/features/spots/actions'
import {
  spotDifficultyOptions,
  spotVisibilityOptions
} from '@/features/spots/constants'
import { SpotLocationPicker } from '@/components/spots/spot-location-picker'
import type { SpotFormValues } from '@/features/spots/types'
import { uploadFiles } from '@/features/shared/upload'

type SpotFormProps = {
  sports: SportOption[]
  defaultValues: SpotFormValues
  action: (prevState: SpotActionState, formData: FormData) => Promise<SpotActionState>
  submitLabel: string
  mode: 'create' | 'edit'
}

const initialState: SpotActionState = {}

export function SpotForm({
  sports,
  defaultValues,
  action,
  submitLabel,
  mode
}: SpotFormProps) {
  const router = useRouter()
  const [state, setState] = useState<SpotActionState>(initialState)
  const [pending, startTransition] = useTransition()
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreview, setGalleryPreview] = useState(
    defaultValues.images.map((image) => image.publicUrl)
  )
  const [coordinates, setCoordinates] = useState({
    latitude: defaultValues.latitude || '39.600000',
    longitude: defaultValues.longitude || '-8.200000'
  })
  const objectUrlsRef = useRef<string[]>([])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        if (galleryFiles.length) {
          const uploads = await uploadFiles('spot-images', galleryFiles)
          formData.set(
            'uploadedImages',
            JSON.stringify(
              uploads.map((upload) => ({
                path: upload.path,
                publicUrl: upload.publicUrl
              }))
            )
          )
        } else {
          formData.set('uploadedImages', '[]')
        }

        const result = await action(initialState, formData)
        setState(result)

        if (result.redirectTo) {
          router.push(result.redirectTo as Route)
          router.refresh()
        }
      } catch (error) {
        setState({
          error: error instanceof Error ? error.message : 'Nao foi possivel guardar o spot.'
        })
      }
    })
  }

  function handleFileChange(files: FileList | null) {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []

    const nextFiles = Array.from(files || [])
    setGalleryFiles(nextFiles)

    if (!nextFiles.length) {
      setGalleryPreview(defaultValues.images.map((image) => image.publicUrl))
      return
    }

    const previews = nextFiles.map((file) => URL.createObjectURL(file))
    objectUrlsRef.current = previews
    setGalleryPreview(previews)
  }

  const numericLatitude = Number(coordinates.latitude || '39.6')
  const numericLongitude = Number(coordinates.longitude || '-8.2')

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {defaultValues.spotId ? <input type="hidden" name="spotId" value={defaultValues.spotId} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Titulo</span>
          <Input name="title" defaultValue={defaultValues.title} placeholder="Ex: Bowl escondido junto ao rio" required />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Modalidade</span>
          <Select name="sportId" defaultValue={defaultValues.sportId} required>
            <option value="">Escolhe uma modalidade</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Visibilidade</span>
          <Select name="visibility" defaultValue={defaultValues.visibility} required>
            {spotVisibilityOptions.map((visibility) => (
              <option key={visibility.value} value={visibility.value}>
                {visibility.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Dificuldade</span>
          <Select name="difficulty" defaultValue={defaultValues.difficulty} required>
            {spotDifficultyOptions.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Localizacao</span>
        <Input
          name="locationLabel"
          defaultValue={defaultValues.locationLabel}
          placeholder="Ex: Costa da Caparica, Portugal"
          required
        />
      </label>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white/72">Posicao no mapa</span>
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">
              Clica no mapa para ajustar
            </span>
          </div>
          <SpotLocationPicker
            latitude={Number.isFinite(numericLatitude) ? numericLatitude : 39.6}
            longitude={Number.isFinite(numericLongitude) ? numericLongitude : -8.2}
            onChange={(nextCoordinates) =>
              setCoordinates({
                latitude: nextCoordinates.latitude.toFixed(6),
                longitude: nextCoordinates.longitude.toFixed(6)
              })
            }
          />
        </div>

        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/72">Latitude</span>
            <Input
              name="latitude"
              value={coordinates.latitude}
              onChange={(event) =>
                setCoordinates((current) => ({
                  ...current,
                  latitude: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/72">Longitude</span>
            <Input
              name="longitude"
              value={coordinates.longitude}
              onChange={(event) =>
                setCoordinates((current) => ({
                  ...current,
                  longitude: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-white/72">Melhor horario</span>
            <Input
              name="bestTime"
              defaultValue={defaultValues.bestTime}
              placeholder="Ex: fim da tarde com vento norte"
            />
          </label>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Descricao</span>
        <Textarea
          name="description"
          defaultValue={defaultValues.description}
          placeholder="Descreve o tipo de spot, o que funciona melhor no local e como a comunidade o usa."
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Notas de seguranca</span>
        <Textarea
          name="safetyNotes"
          defaultValue={defaultValues.safetyNotes}
          placeholder="Rochas, correntes, acesso dificil, convivio com locals, piso escorregadio, etc."
        />
      </label>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/72">Galeria do spot</span>
          <span className="text-xs uppercase tracking-[0.18em] text-white/42">
            {mode === 'edit'
              ? 'Novas imagens substituem a galeria atual'
              : 'Opcional mas recomendado'}
          </span>
        </div>

        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => handleFileChange(event.target.files)}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {galleryPreview.length ? (
            galleryPreview.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Preview ${index + 1}`}
                  className="aspect-square h-full w-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/46">
              Ainda nao existem imagens neste spot.
            </div>
          )}
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

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'A guardar...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
