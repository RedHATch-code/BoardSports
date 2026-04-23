'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { reportSchema } from '@/lib/validations/report'

export type ReportActionState = {
  error?: string
  success?: string
}

async function createReport(
  formData: FormData,
  targetType: 'product' | 'spot'
): Promise<ReportActionState> {
  const parsed = reportSchema.safeParse({
    reason: formData.get('reason'),
    details: formData.get('details')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nao foi possivel validar a denuncia.' }
  }

  const targetId = String(formData.get(`${targetType}Id`) || '')
  if (!targetId) {
    return { error: 'Conteudo invalido.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessao invalida. Faz login novamente.' }
  }

  const payload =
    targetType === 'product'
      ? {
          reporter_id: user.id,
          target_type: 'product' as const,
          product_id: targetId,
          reason: parsed.data.reason,
          details: parsed.data.details || null
        }
      : {
          reporter_id: user.id,
          target_type: 'spot' as const,
          spot_id: targetId,
          reason: parsed.data.reason,
          details: parsed.data.details || null
        }

  const { error } = await supabase.from('reports').insert(payload)

  if (error) {
    return { error: error.message }
  }

  return { success: 'Denuncia enviada para revisao.' }
}

export async function createProductReportAction(
  _prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  return createReport(formData, 'product')
}

export async function createSpotReportAction(
  _prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  return createReport(formData, 'spot')
}
