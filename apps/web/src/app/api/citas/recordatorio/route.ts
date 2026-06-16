import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0'

type NotifConfig = {
  recordatorio_24h?: boolean
  recordatorio_1h?: boolean
}

async function enviarRecordatorio(
  supabase: ReturnType<typeof createClient>,
  config: { phone_number_id: string; access_token: string; clinica_id: string },
  cita: any,
  mensaje: string,
  campoMarcado: 'recordatorio_24h' | 'recordatorio_1h'
) {
  const paciente = cita.paciente
  const familiar = paciente?.familiares?.find((f: { telefono?: string }) => f.telefono)
  if (!familiar?.telefono) return { enviado: false }

  const waResp = await fetch(`${WHATSAPP_API_URL}/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.access_token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: familiar.telefono.replace(/\D/g, ''),
      type: 'text',
      text: { body: mensaje },
    }),
  })

  if (!waResp.ok) return { enviado: false }

  const waData = await waResp.json()
  await supabase.from('citas').update({ [campoMarcado]: true }).eq('id', cita.id)
  await supabase.from('mensajes_whatsapp').insert({
    clinica_id: config.clinica_id,
    paciente_id: paciente.id,
    telefono_destino: familiar.telefono,
    tipo_mensaje: 'recordatorio',
    contenido: mensaje,
    wa_message_id: waData.messages?.[0]?.id,
    estado: 'enviado',
  })
  return { enviado: true }
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resultados = { procesados: 0, enviados: 0, errores: 0, clinicas: [] as string[] }

  try {
    const { data: configs } = await supabase
      .from('config_whatsapp')
      .select('*, clinica:clinicas(id, nombre, configuracion)')
      .eq('activo', true)

    for (const config of configs || []) {
      const clinicaId = config.clinica_id
      const notifCfg: NotifConfig =
        (config as { clinica?: { configuracion?: { notificaciones?: NotifConfig } } }).clinica
          ?.configuracion?.notificaciones || { recordatorio_24h: true, recordatorio_1h: false }

      const ahora = new Date()

      if (notifCfg.recordatorio_24h !== false) {
        const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)
        const en25h = new Date(ahora.getTime() + 25 * 60 * 60 * 1000)
        const { data: citas24h } = await supabase
          .from('citas')
          .select(`id, fecha_inicio, paciente:pacientes(id, nombre, familiares(nombre, telefono)), terapeuta:usuarios(nombre)`)
          .eq('clinica_id', clinicaId)
          .in('estado', ['programada', 'confirmada'])
          .eq('recordatorio_24h', false)
          .gte('fecha_inicio', en24h.toISOString())
          .lte('fecha_inicio', en25h.toISOString())

        for (const cita of citas24h || []) {
          const paciente = (cita as { paciente?: { nombre?: string } }).paciente
          const terapeuta = (cita as { terapeuta?: { nombre?: string } }).terapeuta
          const fechaHora = new Date(cita.fecha_inicio).toLocaleString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })
          const mensaje = `👋 Les recordamos la cita de *${paciente?.nombre}* mañana ${fechaHora} con ${terapeuta?.nombre}. Responde *SÍ* para confirmar.`
          try {
            const r = await enviarRecordatorio(supabase, config, cita, mensaje, 'recordatorio_24h')
            if (r.enviado) resultados.enviados++
            else resultados.errores++
          } catch { resultados.errores++ }
          resultados.procesados++
        }
      }

      if (notifCfg.recordatorio_1h) {
        const en1h = new Date(ahora.getTime() + 60 * 60 * 1000)
        const en65m = new Date(ahora.getTime() + 65 * 60 * 1000)
        const { data: citas1h } = await supabase
          .from('citas')
          .select(`id, fecha_inicio, paciente:pacientes(id, nombre, familiares(nombre, telefono)), terapeuta:usuarios(nombre)`)
          .eq('clinica_id', clinicaId)
          .in('estado', ['programada', 'confirmada'])
          .eq('recordatorio_1h', false)
          .gte('fecha_inicio', en1h.toISOString())
          .lte('fecha_inicio', en65m.toISOString())

        for (const cita of citas1h || []) {
          const paciente = (cita as { paciente?: { nombre?: string } }).paciente
          const fechaHora = new Date(cita.fecha_inicio).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })
          const mensaje = `⏰ Recordatorio: la cita de *${paciente?.nombre}* es en 1 hora (${fechaHora}).`
          try {
            const r = await enviarRecordatorio(supabase, config, cita, mensaje, 'recordatorio_1h')
            if (r.enviado) resultados.enviados++
            else resultados.errores++
          } catch { resultados.errores++ }
          resultados.procesados++
        }
      }

      resultados.clinicas.push((config as { clinica?: { nombre?: string } }).clinica?.nombre || clinicaId)
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...resultados })
  } catch (error: unknown) {
    console.error('Error en cron de recordatorios:', error)
    return NextResponse.json({ error: 'Error procesando recordatorios' }, { status: 500 })
  }
}
