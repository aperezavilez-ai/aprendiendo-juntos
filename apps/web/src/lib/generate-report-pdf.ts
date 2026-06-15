import { jsPDF } from 'jspdf'

interface ClinicaInfo {
  nombre?: string
  ciudad?: string
  estado?: string
}

interface ExecutiveData {
  statsResumen?: {
    pacientesActivos?: number
    totalPacientes?: number
    citasMes?: number
    asistenciaMes?: number
    ingresosMes?: number
    sesionesTotal?: number
  }
  dataMensual?: Array<{
    mes: string
    citas: number
    completadas: number
    nuevos_pacientes: number
    ingresos: number
  }>
  dataTerapeutas?: Array<{
    nombre: string
    citas: number
    completadas: number
    asistencia: number
    pacientes: number
  }>
}

function addPageIfNeeded(doc: jsPDF, y: number, margin = 20) {
  if (y > 270) {
    doc.addPage()
    return margin
  }
  return y
}

export function generateExecutiveReportPdf(
  clinica: ClinicaInfo | null,
  periodo: number,
  data: ExecutiveData
) {
  const doc = new jsPDF()
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text(clinica?.nombre || 'Aprendamos Juntos', 14, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text('Reporte ejecutivo de operaciones', 14, y)

  y += 6
  doc.setFontSize(9)
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(
    `Generado el ${fecha} · Período: últimos ${periodo} meses` +
      (clinica?.ciudad ? ` · ${clinica.ciudad}, ${clinica.estado || ''}` : ''),
    14,
    y
  )

  y += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('INDICADORES CLAVE', 14, y)
  y += 8

  const stats = data.statsResumen || {}
  const kpis = [
    ['Pacientes activos', `${stats.pacientesActivos || 0} de ${stats.totalPacientes || 0}`],
    ['Citas este mes', `${stats.citasMes || 0} (${stats.asistenciaMes || 0}% asistencia)`],
    ['Ingresos del mes', `$${Number(stats.ingresosMes || 0).toLocaleString('es-MX')}`],
    ['Total sesiones', `${stats.sesionesTotal || 0}`],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  for (const [label, value] of kpis) {
    doc.text(`${label}:`, 14, y)
    doc.text(value, 70, y)
    y += 7
  }

  if (data.dataMensual?.length) {
    y += 6
    y = addPageIfNeeded(doc, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('TENDENCIA MENSUAL', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    for (const row of data.dataMensual) {
      y = addPageIfNeeded(doc, y)
      doc.text(
        `${row.mes}: ${row.citas} citas, ${row.completadas} completadas, ${row.nuevos_pacientes} nuevos, $${Number(row.ingresos).toLocaleString('es-MX')}`,
        14,
        y
      )
      y += 6
    }
  }

  if (data.dataTerapeutas?.length) {
    y += 6
    y = addPageIfNeeded(doc, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('PRODUCTIVIDAD POR TERAPEUTA', 14, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const t of data.dataTerapeutas) {
      y = addPageIfNeeded(doc, y)
      doc.text(
        `${t.nombre}: ${t.citas} citas, ${t.completadas} completadas (${t.asistencia}%), ${t.pacientes} pacientes`,
        14,
        y
      )
      y += 6
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'Documento confidencial · Aprendamos Juntos',
    14,
    285
  )

  return Buffer.from(doc.output('arraybuffer'))
}

export function generateIaReportPdf(
  clinica: ClinicaInfo | null,
  reporte: { titulo?: string; tipo?: string; contenido: string; created_at?: string },
  pacienteNombre?: string
) {
  const doc = new jsPDF()
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59)
  doc.text(clinica?.nombre || 'Aprendamos Juntos', 14, y)

  y += 8
  doc.setFontSize(12)
  doc.text(reporte.titulo || `Reporte ${reporte.tipo || 'IA'}`, 14, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const meta = [
    pacienteNombre ? `Paciente: ${pacienteNombre}` : null,
    reporte.created_at
      ? `Generado: ${new Date(reporte.created_at).toLocaleString('es-MX')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  if (meta) doc.text(meta, 14, y)

  y += 12
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  const lines = doc.splitTextToSize(reporte.contenido.replace(/\*\*/g, ''), 180)
  for (const line of lines) {
    y = addPageIfNeeded(doc, y)
    doc.text(line, 14, y)
    y += 5
  }

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Generado con IA · Aprendamos Juntos', 14, 285)

  return Buffer.from(doc.output('arraybuffer'))
}
