import Link from 'next/link'
import { Heart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toggleProductFavoriteAction } from '@/features/marketplace/actions'
import { cn } from '@/lib/utils'

type FavoriteProductButtonProps = {
  productId: string
  isFavorite: boolean
  isAuthenticated: boolean
  path: string
}

export function FavoriteProductButton({
  productId,
  isFavorite,
  isAuthenticated,
  path
}: FavoriteProductButtonProps) {
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
      >
        Entrar para guardar
      </Link>
    )
  }

  return (
    <form action={toggleProductFavoriteAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="path" value={path} />
      <Button
        type="submit"
        variant={isFavorite ? 'secondary' : 'ghost'}
        className={cn('gap-2', isFavorite && 'border-rose-400/22 text-rose-100')}
      >
        <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        {isFavorite ? 'Guardado' : 'Guardar'}
      </Button>
    </form>
  )
}
