import {
  Heart,
  House,
  Inbox,
  MapPinned,
  PackageSearch,
  PanelsTopLeft
} from 'lucide-react'

export const primaryNav = [
  { href: '/', label: 'Home', icon: House },
  { href: '/produtos', label: 'Produtos', icon: PackageSearch },
  { href: '/spots', label: 'Spots', icon: MapPinned },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/painel', label: 'Painel', icon: PanelsTopLeft }
] as const
