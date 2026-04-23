import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import type { SpotFilterValues } from '@/features/spots/types'
import type { SportOption } from '@/features/marketplace/types'

type SpotFiltersProps = {
  sports: SportOption[]
  values: SpotFilterValues
}

export function SpotFilters({ sports, values }: SpotFiltersProps) {
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Filtros do mapa
        </p>
        <h2 className="text-2xl font-semibold text-white">Explorar spots por modalidade.</h2>
      </div>

      <form className="flex flex-wrap items-end gap-4">
        <label className="grid min-w-[220px] flex-1 gap-2">
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

        <div className="flex flex-wrap gap-3">
          <Button type="submit">Aplicar filtro</Button>
          <Link
            href="/spots"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
          >
            Limpar
          </Link>
        </div>
      </form>
    </Card>
  )
}
