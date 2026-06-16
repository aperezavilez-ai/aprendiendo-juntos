import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.warn('WHATSAPP_APP_SECRET no configurado — webhook sin verificación de firma')
    return true
  }
  if (!signature?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = signature.slice(7)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 403 })
  }

  const supabase = getSupabase()
  try {
    const body = JSON.parse(rawBody)

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' })
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value

        if (value.messages) {
          for (const message of value.messages) {
            const from = message.from
            const text = message.text?.body || ''

            const { data: familiares } = await supabase
              .from('familiares')
              .select('id, paciente_id, pacientes(clinica_id, nombre)')
              .or(`telefono.eq.${from},telefono.eq.+${from},telefono.ilike.%${from.slice(-10)}%`)
              .limit(1)

            const familiar = familiares?.[0]
            if (!familiar) continue

            await supabase
              .from('mensajes_whatsapp')
              .update({ respuesta: text, leido_at: new Date().toISOString() })
              .ilike('telefono_destino', `%${from.slice(-10)}%`)
              .is('leido_at', null)

            if (/^(si|sí|yes|s|1)$/i.test(text.trim())) {
              await supabase
                .from('citas')
                .update({ confirmada_por_padre: true, estado: 'confirmada' })
                .eq('paciente_id', familiar.paciente_id)
                .in('estado', ['programada', 'confirmada'])
                .eq('confirmada_por_padre', false)
                .gte('fecha_inicio', new Date().toISOString())
            }

            const clinicaId = (familiar as { pacientes?: { clinica_id?: string; nombre?: string } }).pacientes?.clinica_id
            const pacienteNombre = (familiar as { pacientes?: { nombre?: string } }).pacientes?.nombre
            if (clinicaId) {
              const { data: staff } = await supabase
                .from('usuarios')
                .select('id')
                .eq('clinica_id', clinicaId)
                .in('rol', ['terapeuta', 'recepcion', 'admin_general', 'director_clinico'])
                .eq('activo', true)

              if (staff?.length) {
                await supabase.from('notificaciones').insert(
                  staff.map(s => ({
                    usuario_id: s.id,
                    clinica_id: clinicaId,
                    tipo: 'mensaje',
                    titulo: 'Respuesta de WhatsApp',
                    mensaje: `${pacienteNombre || 'Paciente'}: "${text.substring(0, 100)}"`,
                    url_accion: '/mensajes',
                  }))
                )
              }
            }
          }
        }

        if (value.statuses) {
          for (const status of value.statuses) {
            const estadoMap: Record<string, string> = {
              sent: 'enviado', delivered: 'entregado', read: 'leido', failed: 'fallido',
            }
            await supabase
              .from('mensajes_whatsapp')
              .update({ estado: estadoMap[status.status] || status.status })
              .eq('wa_message_id', status.id)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
