import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClientFromRequest } from '@/lib/supabase/server'
import { generateIaReportPdf } from '@/lib/generate-report-pdf'
import { STORAGE_BUCKET, buildStoragePath } from '@/lib/storage'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: staff } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!staff || staff.rol === 'padre') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { reporteId, guardar } = await request.json()
    if (!reporteId) {
      return NextResponse.json({ error: 'reporteId requerido' }, { status: 400 })
    }

    const admin = adminClient()
    const { data: reporte } = await admin
      .from('reportes_ia')
      .select('*, paciente:pacientes(nombre, apellidos)')
      .eq('id', reporteId)
      .eq('clinica_id', staff.clinica_id)
      .single()

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const { data: clinica } = await admin
      .from('clinicas')
      .select('nombre, ciudad, estado')
      .eq('id', staff.clinica_id)
      .single()

    const paciente = reporte.paciente as { nombre?: string; apellidos?: string } | null
    const pacienteNombre = paciente
      ? `${paciente.nombre || ''} ${paciente.apellidos || ''}`.trim()
      : undefined

    const pdfBuffer = generateIaReportPdf(clinica, reporte, pacienteNombre)
    const filename = `reporte-ia-${reporteId.slice(0, 8)}.pdf`

    if (guardar) {
      const storagePath = buildStoragePath(
        staff.clinica_id,
        reporte.paciente_id,
        filename
      )
      await admin.storage.from(STORAGE_BUCKET).upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
      const { data: signed } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      if (signed?.signedUrl) {
        await admin
          .from('reportes_ia')
          .update({ pdf_url: signed.signedUrl })
          .eq('id', reporteId)
      }
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error: unknown) {
    console.error('Error PDF reporte IA:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}
