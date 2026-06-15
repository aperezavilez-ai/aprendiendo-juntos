import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { generateExecutiveReportPdf } from '@/lib/generate-report-pdf'

export async function POST(request: NextRequest) {
  try {
    const { periodo, data } = await request.json()

    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, rol')
      .eq('id', user.id)
      .single()

    if (!usuario || usuario.rol === 'padre') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: clinica } = await supabase
      .from('clinicas')
      .select('nombre, logo_url, ciudad, estado')
      .eq('id', usuario.clinica_id)
      .single()

    const pdfBuffer = generateExecutiveReportPdf(
      clinica,
      parseInt(String(periodo || 3), 10),
      data || {}
    )

    const filename = `reporte-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error: unknown) {
    console.error('Error generando reporte PDF:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}
