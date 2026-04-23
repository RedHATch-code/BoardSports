export type InboxThreadSummary = {
  threadKey: string
  productId: string
  productSlug: string | null
  productTitle: string
  buyerId: string
  sellerId: string
  counterpart: {
    username: string | null
    fullName: string | null
    avatarUrl: string | null
  } | null
  lastBody: string
  lastMessageAt: string
  unreadCount: number
}

export type InboxMessage = {
  id: string
  body: string
  createdAt: string
  isOwn: boolean
  sender: {
    id: string
    username: string | null
    fullName: string | null
    avatarUrl: string | null
  } | null
}

export type InboxThreadDetail = {
  threadKey: string
  productId: string
  productSlug: string | null
  productTitle: string
  buyerId: string
  sellerId: string
  counterpart: {
    username: string | null
    fullName: string | null
    avatarUrl: string | null
  } | null
  messages: InboxMessage[]
}
