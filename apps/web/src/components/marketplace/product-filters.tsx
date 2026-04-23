import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { productCategories } from '@/features/marketplace/constants'
import type { MarketplaceFilterValues, SportOption } from '@/features/marketplace/types'

type ProductFiltersProps = {
  sports: SportOption[]
  values: MarketplaceFilterValues
}

export function ProductFilters({ sports, values }: ProductFiltersProps) {
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Filtros do marketplace
        </p>
        <h2 className="text-2xl font-semibold text-white">Encontrar material certo sem ruido.</h2>
      </div>

      <form className="grid gap-4 lg:grid-cols-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/68">Modalidade</span>
          <Select name="sport" defaultValue={values.sport}>
            <option value="">Todas</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.slug}>
                {sport.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/68">Categoria</span>
          <Select name="category" defaultValue={values.category}>
            <option value="">Todas</option>
            {productCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/68">Localizacao</span>
          <Input name="location" defaultValue={values.location} placeholder="Ex: Ericeira" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/68">Preco minimo</span>
          <Input
            name="minPrice"
            defaultValue={values.minPrice}
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/68">Preco maximo</span>
          <Input
            name="maxPrice"
            defaultValue={values.maxPrice}
            type="number"
            min="0"
            step="0.01"
            placeholder="500"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3 lg:col-span-5">
          <Button type="submit">Aplicar filtros</Button>
          <Link
            href="/produtos"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
          >
            Limpar
          </Link>
        </div>
      </form>
    </Card>
  )
}
