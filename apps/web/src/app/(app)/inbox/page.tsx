import Link from 'next/link'

import { PageShell } from '@/components/layout/page-shell'
import { MessageForm } from '@/components/messages/message-form'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { requireCurrentUser } from '@/features/auth/queries'
import { sendThreadReplyAction } from '@/features/messages/actions'
import { getInboxThread, listInboxThreads } from '@/features/messages/queries'
import { formatDate } from '@/lib/utils'

type InboxPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const user = await requireCurrentUser()
  const rawSearchParams = await searchParams
  const selectedThreadKey =
    (Array.isArray(rawSearchParams.thread)
      ? rawSearchParams.thread[0]
      : rawSearchParams.thread) || ''
  const threads = await listInboxThreads(user.id)
  const activeThreadKey = selectedThreadKey || threads[0]?.threadKey || ''
  const activeThread = activeThreadKey ? await getInboxThread(user.id, activeThreadKey) : null

  return (
    <PageShell className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Inbox
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          Conversas ligadas aos anuncios.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Cada conversa fica ancorada a um anuncio e separada por comprador para manter o MVP
          simples.
        </p>
      </section>

      {threads.length ? (
        <section className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
              Conversas
            </p>

            <div className="grid gap-3">
              {threads.map((thread) => {
                const active = thread.threadKey === activeThreadKey

                return (
                  <Link
                    key={thread.threadKey}
                    href={`/inbox?thread=${encodeURIComponent(thread.threadKey)}`}
                    className={`rounded-3xl border px-4 py-4 transition ${
                      active
                        ? 'border-cyan-300/26 bg-cyan-400/10'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">
                          {thread.counterpart?.fullName ??
                            thread.counterpart?.username ??
                            'Utilizador'}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/42">
                          {thread.productTitle}
                        </p>
                      </div>

                      {thread.unreadCount ? (
                        <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-accent)] px-2 text-xs font-semibold text-slate-950">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-white/62">{thread.lastBody}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/38">
                      {formatDate(thread.lastMessageAt)}
                    </p>
                  </Link>
                )
              })}
            </div>
          </Card>

          {activeThread ? (
            <Card className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                    Conversa ativa
                  </p>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                    {activeThread.counterpart?.fullName ??
                      activeThread.counterpart?.username ??
                      'Utilizador'}
                  </h2>
                  <p className="text-sm text-white/60">{activeThread.productTitle}</p>
                </div>

                {activeThread.productSlug ? (
                  <Link
                    href={`/produtos/${activeThread.productSlug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
                  >
                    Abrir anuncio
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-3">
                {activeThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-3xl px-4 py-4 ${
                      message.isOwn
                        ? 'ml-auto bg-cyan-400/16 text-white'
                        : 'bg-white/[0.04] text-white/82'
                    }`}
                  >
                    <p className="text-sm leading-7">{message.body}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/42">
                      {message.sender?.fullName ?? message.sender?.username ?? 'Utilizador'} |{' '}
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                ))}
              </div>

              <MessageForm
                action={sendThreadReplyAction}
                hiddenFields={[
                  { name: 'productId', value: activeThread.productId },
                  { name: 'buyerId', value: activeThread.buyerId },
                  { name: 'sellerId', value: activeThread.sellerId }
                ]}
                placeholder="Responde aqui e mantem a conversa ligada ao anuncio."
                submitLabel="Enviar resposta"
              />
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-white/60">
                Seleciona uma conversa para veres o historico.
              </p>
            </Card>
          )}
        </section>
      ) : (
        <EmptyState
          eyebrow="Inbox"
          title="Ainda nao tens conversas"
          description="Entra num anuncio e envia a primeira mensagem para arrancar a inbox."
          ctaHref="/produtos"
          ctaLabel="Explorar produtos"
        />
      )}
    </PageShell>
  )
}
