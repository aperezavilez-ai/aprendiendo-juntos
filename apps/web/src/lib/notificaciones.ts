import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function notificarUsuarios(
  clinicaId: string,
  opts: {
    roles?: string[]
    tipo: string
    titulo: string
    mensaje: string
    url_accion?: string
    excluirId?: string
  }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const roles = opts.roles || ['admin_general', 'director_clinico', 'terapeuta', 'recepcion']
  let query = admin()
    .from('usuarios')
    .select('id')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .in('rol', roles)

  const { data: usuarios } = await query
  const destinatarios = (usuarios || []).filter(u => u.id !== opts.excluirId)
  if (!destinatarios.length) return

  await admin().from('notificaciones').insert(
    destinatarios.map(u => ({
      usuario_id: u.id,
      clinica_id: clinicaId,
      tipo: opts.tipo,
      titulo: opts.titulo,
      mensaje: opts.mensaje,
      url_accion: opts.url_accion || null,
    }))
  )
}
