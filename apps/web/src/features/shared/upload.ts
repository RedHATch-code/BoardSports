'use client'

type UploadBucket = 'avatars' | 'product-images' | 'spot-images'

type UploadedAsset = {
  path: string
  publicUrl: string
}

export async function uploadFiles(bucket: UploadBucket, files: File[]) {
  const formData = new FormData()
  formData.append('bucket', bucket)

  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })

  const payload = (await response.json()) as {
    error?: string
    files?: UploadedAsset[]
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Falha no upload.')
  }

  return payload.files || []
}
