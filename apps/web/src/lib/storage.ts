export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'terapia-os-files'

export function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
}

export function buildStoragePath(clinicaId: string, pacienteId: string, fileName: string) {
  const safe = sanitizeFileName(fileName)
  return `${clinicaId}/${pacienteId}/${crypto.randomUUID()}-${safe}`
}
