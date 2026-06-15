import { createClient as createAdminClient } from '@supabase/supabase-js'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function fetchPortalCitas(pacienteId: string) {
  const { data, error } = await admin()
    .from('citas')
    .select('*, terapeuta:usuarios(nombre, apellidos)')
    .eq('paciente_id', pacienteId)
    .order('fecha_inicio', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return data || []
}

export async function confirmarPortalCita(citaId: string, pacienteId: string) {
  const { error } = await admin()
    .from('citas')
    .update({ confirmada_por_padre: true, estado: 'confirmada' })
    .eq('id', citaId)
    .eq('paciente_id', pacienteId)

  if (error) throw new Error(error.message)
}

export async function fetchPortalReportes(pacienteId: string) {
  const adminClient = admin()
  let { data: reportes, error } = await adminClient
    .from('reportes_ia')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('enviado_a_padres', true)
    .order('created_at', { ascending: false })

  if (error) {
    const fallback = await adminClient
      .from('reportes_ia')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
    reportes = fallback.data
  }

  const { data: archivos } = await adminClient
    .from('archivos_paciente')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('visible_a_padres', true)
    .order('created_at', { ascending: false })

  return { reportes: reportes || [], archivos: archivos || [] }
}

export async function fetchPortalMensajes(pacienteId: string) {
  const adminClient = admin()

  const { data: mensajes, error } = await adminClient
    .from('chat_mensajes')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at')
    .limit(100)

  if (error) throw new Error(error.message)

  await adminClient
    .from('chat_mensajes')
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq('paciente_id', pacienteId)
    .eq('tipo_remitente', 'terapeuta')
    .eq('leido', false)

  return mensajes || []
}

export async function enviarPortalMensaje(
  pacienteId: string,
  clinicaId: string,
  remitenteId: string,
  contenido: string
) {
  const { data, error } = await admin()
    .from('chat_mensajes')
    .insert({
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      remitente_id: remitenteId,
      tipo_remitente: 'padre',
      contenido: contenido.trim(),
      leido: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
