import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  folder: string
  value: string
  onChange: (url: string) => void
  dimensions: string
}

export function ImageUpload({ folder, value, onChange, dimensions }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${folder}${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch {
      // silencioso — el usuario puede reintentar
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-[var(--color-parchment)]">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-parchment)] bg-[var(--color-cream)] hover:border-[var(--color-wine)]/40 transition-colors disabled:opacity-60"
        >
          <Upload size={20} className="text-[var(--color-muted)]" />
          <span className="text-sm text-[var(--color-muted)]">
            {uploading ? 'Subiendo...' : 'Subir imagen'}
          </span>
        </button>
      )}
      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--color-parchment)] bg-white px-3 text-xs font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors disabled:opacity-60"
        >
          <Upload size={12} /> {uploading ? 'Subiendo...' : 'Cambiar imagen'}
        </button>
      )}
      <p className="text-xs text-[var(--color-muted)]">{dimensions}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
