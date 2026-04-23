'use client'

import { useRef, useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProductActionState } from '@/features/marketplace/actions'
import {
  productCategories,
  productConditions,
  productStatusOptions
} from '@/features/marketplace/constants'
import type { ProductFormValues, SportOption } from '@/features/marketplace/types'
import { uploadFiles } from '@/features/shared/upload'

type ProductFormProps = {
  sports: SportOption[]
  defaultValues: ProductFormValues
  action: (
    prevState: ProductActionState,
    formData: FormData
  ) => Promise<ProductActionState>
  submitLabel: string
  mode: 'create' | 'edit'
}

const initialState: ProductActionState = {}

export function ProductForm({
  sports,
  defaultValues,
  action,
  submitLabel,
  mode
}: ProductFormProps) {
  const router = useRouter()
  const [state, setState] = useState<ProductActionState>(initialState)
  const [pending, startTransition] = useTransition()
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreview, setGalleryPreview] = useState(
    defaultValues.images.map((image) => image.publicUrl)
  )
  const objectUrlsRef = useRef<string[]>([])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        if (galleryFiles.length) {
          const uploads = await uploadFiles('product-images', galleryFiles)
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
          error: error instanceof Error ? error.message : 'Nao foi possivel guardar o anuncio.'
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

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {defaultValues.productId ? (
        <input type="hidden" name="productId" value={defaultValues.productId} />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Titulo</span>
          <Input name="title" defaultValue={defaultValues.title} placeholder="Ex: Prancha twin fin 5'8" required />
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
          <span className="text-sm font-medium text-white/72">Categoria</span>
          <Select name="category" defaultValue={defaultValues.category} required>
            <option value="">Escolhe uma categoria</option>
            {productCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Estado</span>
          <Select name="condition" defaultValue={defaultValues.condition} required>
            <option value="">Escolhe o estado do material</option>
            {productConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Preco em EUR</span>
          <Input
            name="priceEuros"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues.priceEuros}
            placeholder="120.00"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/72">Estado do anuncio</span>
          <Select name="status" defaultValue={defaultValues.status} required>
            {productStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
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
          placeholder="Ex: Ericeira, Portugal"
          required
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-white/72">Descricao</span>
        <Textarea
          name="description"
          defaultValue={defaultValues.description}
          placeholder="Descreve o material, medidas, historico de uso e o que esta incluido na venda."
          required
        />
      </label>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/72">Galeria de imagens</span>
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
              Ainda nao existem imagens neste anuncio.
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
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
