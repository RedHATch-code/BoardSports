import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

const ALLOWED_BUCKETS = new Set(['avatars', 'product-images', 'spot-images'])

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
  }

  const formData = await request.formData()
  const bucket = String(formData.get('bucket') || '')
  const entries = formData.getAll('files').filter((entry): entry is File => entry instanceof File)

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: 'Bucket invalido.' }, { status: 400 })
  }

  if (!entries.length) {
    return NextResponse.json({ error: 'Nenhum ficheiro recebido.' }, { status: 400 })
  }

  const uploaded = []

  for (const file of entries) {
    const bytes = await file.arrayBuffer()
    const safeName = sanitizeFileName(file.name || `upload-${Date.now()}`)
    const path = `${user.id}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    uploaded.push({
      path,
      publicUrl: data.publicUrl
    })
  }

  return NextResponse.json({ files: uploaded })
}
