/**
 * Siembra 5 pacientes con flujo completo (citas, evaluaciones, planes, sesiones,
 * reportes, facturación, mensajes) en la clínica del admin.
 *
 * node --env-file=apps/web/.env.local apps/web/scripts/seed-clinica-completa.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const ADMIN_EMAIL = 'admin@aprendamosjuntos.mx'

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      ...headers,
      Prefer: options.prefer || 'return=representation',
      ...options.headers,
    },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`REST ${path} → ${res.status}: ${text}`)
  return data
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} → ${res.status}: ${text}`)
  return data
}

function daysAgo(n, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function daysFromNow(n, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, 0, 0, 0)
  return d
}

function fotoUrl(seed) {
  return `https://api.dicebear.com/7.x/big-ears/png?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4&size=256`
}

function evalItems(pct) {
  const max = 12
  const total = Math.round((pct / 100) * max)
  return [
    {
      id: '1',
      area: 'Motricidad fina',
      nombre: 'Pinza trípode',
      puntuacion: Math.min(4, Math.max(1, Math.round(total / 3))),
      puntuacion_max: 4,
      observacion: 'Avance observable en sesiones recientes',
    },
    {
      id: '2',
      area: 'Coordinación',
      nombre: 'Transferencia de objetos',
      puntuacion: Math.min(4, Math.max(1, Math.round(total / 4))),
      puntuacion_max: 4,
      observacion: 'Requiere apoyo verbal ocasional',
    },
    {
      id: '3',
      area: 'Autonomía',
      nombre: 'Participación en actividades',
      puntuacion: Math.min(4, Math.max(1, total - 4)),
      puntuacion_max: 4,
      observacion: 'Buena disposición general',
    },
  ]
}

function calcNivel(pct) {
  if (pct < 40) return 'bajo'
  if (pct < 65) return 'medio'
  if (pct < 85) return 'alto'
  return 'muy_alto'
}

const PATIENTS = [
  {
    nombre: 'Santiago',
    apellidos: 'García López',
    fecha_nacimiento: '2019-03-15',
    genero: 'masculino',
    escuela: 'Jardín de Niños Sol',
    grado_escolar: 'Kinder 2',
    motivo_consulta: 'Evaluación inicial - TEA y motricidad fina',
    diagnosticos: [{ codigo: 'F84.0', descripcion: 'Trastorno del Espectro Autista (TEA)' }],
    seed: 'SantiagoGarciaLopez',
    evalTipo: 'motricidad_fina',
    evalPct: 58,
    planTitulo: 'Plan de integración sensorial y motricidad fina',
    planAreas: ['motricidad_fina', 'integracion_sensorial'],
    reporteCompartido: true,
    portal: {
      email: 'padre.demo@aprendamosjuntos.mx',
      password: 'Padre2026!',
      nombre: 'María',
      apellidos: 'García López',
      tipo_relacion: 'madre',
      telefono: '+52 33 1234 5678',
    },
  },
  {
    nombre: 'Valentina',
    apellidos: 'Hernández Ruiz',
    fecha_nacimiento: '2018-07-22',
    genero: 'femenino',
    escuela: 'Primaria Benito Juárez',
    grado_escolar: '2° primaria',
    motivo_consulta: 'Dificultades de atención y autorregulación (TDAH)',
    diagnosticos: [{ codigo: 'F90.0', descripcion: 'TDAH predominio inatento' }],
    seed: 'ValentinaHernandezRuiz',
    evalTipo: 'atencion',
    evalPct: 45,
    planTitulo: 'Plan de autorregulación y atención sostenida',
    planAreas: ['atencion', 'conducta'],
    reporteCompartido: true,
    familiar: {
      nombre: 'Laura',
      apellidos: 'Hernández',
      tipo_relacion: 'madre',
      telefono: '+52 33 2345 6789',
      email: 'laura.hernandez.demo@example.com',
    },
  },
  {
    nombre: 'Mateo',
    apellidos: 'Torres Díaz',
    fecha_nacimiento: '2016-11-08',
    genero: 'masculino',
    escuela: 'Centro Educativo Esperanza',
    grado_escolar: '4° primaria',
    motivo_consulta: 'Rehabilitación motora - parálisis cerebral',
    diagnosticos: [{ codigo: 'G80.0', descripcion: 'Parálisis cerebral espástica' }],
    seed: 'MateoTorresDiaz',
    evalTipo: 'motricidad_gruesa',
    evalPct: 52,
    planTitulo: 'Plan de motricidad gruesa y marcha funcional',
    planAreas: ['motricidad_gruesa', 'autonomia'],
    reporteCompartido: false,
    familiar: {
      nombre: 'Roberto',
      apellidos: 'Torres',
      tipo_relacion: 'padre',
      telefono: '+52 33 3456 7890',
      email: 'roberto.torres.demo@example.com',
    },
  },
  {
    nombre: 'Sofía',
    apellidos: 'Mendoza Vargas',
    fecha_nacimiento: '2020-01-30',
    genero: 'femenino',
    escuela: 'Preescolar Arcoíris',
    grado_escolar: 'Kinder 1',
    motivo_consulta: 'Retraso global del desarrollo',
    diagnosticos: [{ codigo: 'F88', descripcion: 'Retraso global del desarrollo' }],
    seed: 'SofiaMendozaVargas',
    evalTipo: 'cognitivo',
    evalPct: 38,
    planTitulo: 'Plan de estimulación temprana multidisciplinaria',
    planAreas: ['cognitivo', 'lenguaje', 'motricidad_fina'],
    reporteCompartido: false,
    familiar: {
      nombre: 'Ana',
      apellidos: 'Mendoza',
      tipo_relacion: 'madre',
      telefono: '+52 33 4567 8901',
      email: 'ana.mendoza.demo@example.com',
    },
  },
  {
    nombre: 'Diego',
    apellidos: 'Ramírez Castro',
    fecha_nacimiento: '2017-09-14',
    genero: 'masculino',
    escuela: 'Primaria Miguel Hidalgo',
    grado_escolar: '1° primaria',
    motivo_consulta: 'Hipersensibilidad sensorial y dificultades de integración',
    diagnosticos: [{ codigo: 'F84.9', descripcion: 'Trastorno generalizado del desarrollo' }],
    seed: 'DiegoRamirezCastro',
    evalTipo: 'integracion_sensorial',
    evalPct: 62,
    planTitulo: 'Plan de integración sensorial y autorregulación',
    planAreas: ['integracion_sensorial', 'socioafectivo'],
    reporteCompartido: false,
    familiar: {
      nombre: 'Carlos',
      apellidos: 'Ramírez',
      tipo_relacion: 'padre',
      telefono: '+52 33 5678 9012',
      email: 'carlos.ramirez.demo@example.com',
    },
  },
]

async function getContext() {
  console.log('1. Resolviendo clínica del admin...')
  const admins = await rest(
    `/usuarios?select=id,clinica_id,nombre,apellidos,email&email=eq.${encodeURIComponent(ADMIN_EMAIL)}&limit=1`
  )
  let admin = admins[0]
  if (!admin) {
    const clinicas = await rest('/clinicas?select=id,nombre&limit=1')
    const clinicaId = clinicas[0]?.id
    if (!clinicaId) throw new Error('No hay clínica ni admin')
    const staff = await rest(
      `/usuarios?select=id,clinica_id,nombre,apellidos,email&clinica_id=eq.${clinicaId}&rol=neq.padre&limit=1`
    )
    admin = staff[0]
  }
  if (!admin?.clinica_id) throw new Error('No se pudo obtener clinica_id')

  const clinicas = await rest(`/clinicas?select=id,nombre&id=eq.${admin.clinica_id}&limit=1`)
  console.log(`   Clínica: ${clinicas[0]?.nombre || admin.clinica_id}`)

  let sucursales = await rest(
    `/sucursales?select=id,nombre&clinica_id=eq.${admin.clinica_id}&activa=eq.true&limit=1`
  )
  let sucursalId = sucursales[0]?.id
  if (!sucursalId) {
    sucursales = await rest('/sucursales', {
      method: 'POST',
      body: JSON.stringify({
        clinica_id: admin.clinica_id,
        nombre: 'Sucursal Principal',
        ciudad: 'Guadalajara',
        activa: true,
      }),
    })
    sucursalId = sucursales[0].id
  }

  return {
    clinicaId: admin.clinica_id,
    sucursalId,
    terapeutaId: admin.id,
    adminId: admin.id,
  }
}

async function upsertPaciente(def, ctx) {
  const existing = await rest(
    `/pacientes?select=id&clinica_id=eq.${ctx.clinicaId}&nombre=eq.${encodeURIComponent(def.nombre)}&apellidos=eq.${encodeURIComponent(def.apellidos)}&limit=1`
  )
  const body = {
    clinica_id: ctx.clinicaId,
    sucursal_id: ctx.sucursalId,
    terapeuta_asignado_id: ctx.terapeutaId,
    nombre: def.nombre,
    apellidos: def.apellidos,
    fecha_nacimiento: def.fecha_nacimiento,
    genero: def.genero,
    escuela: def.escuela,
    grado_escolar: def.grado_escolar,
    motivo_consulta: def.motivo_consulta,
    diagnosticos: def.diagnosticos,
    foto_url: fotoUrl(def.seed),
    activo: true,
  }

  if (existing[0]?.id) {
    await rest(`/pacientes?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(body),
    })
    return existing[0].id
  }

  const created = await rest('/pacientes', { method: 'POST', body: JSON.stringify(body) })
  return created[0].id
}

async function ensurePortalAccount(def, pacienteId) {
  if (!def.portal) return null

  const { email, password, nombre, apellidos, tipo_relacion, telefono } = def.portal

  const existingUsers = await adminFetch('/auth/v1/admin/users?page=1&per_page=1000')
  let authUserId = null
  for (const u of existingUsers.users || []) {
    if (u.email === email) authUserId = u.id
  }

  if (!authUserId) {
    const authUser = await adminFetch('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, apellidos },
      }),
    })
    authUserId = authUser.id
  }

  const perfil = await rest(`/usuarios?select=id&id=eq.${authUserId}&limit=1`)
  if (!perfil[0]) {
    await rest('/usuarios', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        id: authUserId,
        clinica_id: (await rest(`/pacientes?select=clinica_id&id=eq.${pacienteId}&limit=1`))[0].clinica_id,
        nombre,
        apellidos,
        email,
        rol: 'padre',
        activo: true,
      }),
    })
  }

  const fam = await rest(
    `/familiares?select=id&paciente_id=eq.${pacienteId}&email=eq.${encodeURIComponent(email)}&limit=1`
  )
  const famBody = {
    paciente_id: pacienteId,
    tipo_relacion,
    nombre,
    apellidos,
    telefono,
    email,
    tiene_acceso_portal: true,
    auth_user_id: authUserId,
    es_contacto_principal: true,
  }
  if (fam[0]?.id) {
    await rest(`/familiares?id=eq.${fam[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(famBody),
    })
    return { familiarId: fam[0].id, authUserId }
  }

  const created = await rest('/familiares', { method: 'POST', body: JSON.stringify(famBody) })
  return { familiarId: created[0].id, authUserId }
}

async function ensureFamiliar(def, pacienteId) {
  if (def.portal) return ensurePortalAccount(def, pacienteId)

  const f = def.familiar
  const existing = await rest(
    `/familiares?select=id&paciente_id=eq.${pacienteId}&nombre=eq.${encodeURIComponent(f.nombre)}&limit=1`
  )
  const body = {
    paciente_id: pacienteId,
    tipo_relacion: f.tipo_relacion,
    nombre: f.nombre,
    apellidos: f.apellidos,
    telefono: f.telefono,
    email: f.email,
    es_contacto_principal: true,
    tiene_acceso_portal: false,
  }
  if (existing[0]?.id) {
    await rest(`/familiares?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(body),
    })
    return { familiarId: existing[0].id, authUserId: null }
  }
  const created = await rest('/familiares', { method: 'POST', body: JSON.stringify(body) })
  return { familiarId: created[0].id, authUserId: null }
}

async function seedCitas(pacienteId, ctx, offsetDays) {
  const existing = await rest(`/citas?select=id,estado&paciente_id=eq.${pacienteId}`)
  if (existing.length >= 2) {
    const pasada = existing.find(c => c.estado === 'completada')
    const futura = existing.find(c => c.estado === 'programada' || c.estado === 'confirmada')
    return { citaPasadaId: pasada?.id || existing[0].id, citaFuturaId: futura?.id || existing[1]?.id }
  }

  const inicioPasada = daysAgo(10 + offsetDays, 9)
  const finPasada = new Date(inicioPasada)
  finPasada.setHours(10, 0, 0, 0)

  const inicioFutura = daysFromNow(2 + offsetDays, 11)
  const finFutura = new Date(inicioFutura)
  finFutura.setHours(12, 0, 0, 0)

  const pasada = await rest('/citas', {
    method: 'POST',
    body: JSON.stringify({
      clinica_id: ctx.clinicaId,
      sucursal_id: ctx.sucursalId,
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      fecha_inicio: inicioPasada.toISOString(),
      fecha_fin: finPasada.toISOString(),
      duracion_minutos: 60,
      estado: 'completada',
      tipo: 'terapia',
      sala: `Sala ${(offsetDays % 3) + 1}`,
      costo: 850,
    }),
  })

  const futura = await rest('/citas', {
    method: 'POST',
    body: JSON.stringify({
      clinica_id: ctx.clinicaId,
      sucursal_id: ctx.sucursalId,
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      fecha_inicio: inicioFutura.toISOString(),
      fecha_fin: finFutura.toISOString(),
      duracion_minutos: 60,
      estado: offsetDays % 2 === 0 ? 'confirmada' : 'programada',
      tipo: 'terapia',
      sala: `Sala ${(offsetDays % 3) + 1}`,
      costo: 850,
    }),
  })

  return { citaPasadaId: pasada[0].id, citaFuturaId: futura[0].id }
}

async function seedEvaluacion(pacienteId, ctx, def) {
  const existing = await rest(`/evaluaciones?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) return existing[0].id

  const items = evalItems(def.evalPct)
  const puntuacionTotal = items.reduce((s, i) => s + i.puntuacion, 0)
  const puntuacionMax = items.reduce((s, i) => s + i.puntuacion_max, 0)

  const ev = await rest('/evaluaciones', {
    method: 'POST',
    body: JSON.stringify({
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      clinica_id: ctx.clinicaId,
      tipo: def.evalTipo,
      nombre: `Evaluación ${def.evalTipo.replace(/_/g, ' ')}`,
      fecha: daysAgo(14).toISOString(),
      puntuacion_total: puntuacionTotal,
      puntuacion_max: puntuacionMax,
      porcentaje: def.evalPct,
      nivel: calcNivel(def.evalPct),
      items,
      observaciones: `${def.nombre} presenta perfil acorde a ${def.motivo_consulta}.`,
      recomendaciones: 'Continuar con plan terapéutico individualizado y tareas en casa.',
    }),
  })
  return ev[0].id
}

async function seedPlan(pacienteId, ctx, def) {
  const existing = await rest(`/planes_terapeuticos?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) return existing[0].id

  const plan = await rest('/planes_terapeuticos', {
    method: 'POST',
    body: JSON.stringify({
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      clinica_id: ctx.clinicaId,
      titulo: def.planTitulo,
      objetivo_general: `Mejorar habilidades funcionales de ${def.nombre} en las áreas prioritarias identificadas.`,
      justificacion: def.motivo_consulta,
      fecha_inicio: daysAgo(30).toISOString().slice(0, 10),
      fecha_fin_estimada: daysFromNow(90).toISOString().slice(0, 10),
      estado: 'activo',
      porcentaje_avance: def.evalPct,
      areas_intervencion: def.planAreas,
    }),
  })
  const planId = plan[0].id

  const objetivos = [
    {
      plan_id: planId,
      area: def.planAreas[0],
      descripcion: `Fortalecer ${def.planAreas[0].replace(/_/g, ' ')} en actividades cotidianas`,
      criterio_logro: 'Logro en 3 de 5 intentos con mínima ayuda',
      estado: 'en_progreso',
      porcentaje: Math.min(80, def.evalPct + 10),
      orden: 1,
    },
    {
      plan_id: planId,
      area: def.planAreas[1] || def.planAreas[0],
      descripcion: 'Generalizar aprendizajes al entorno escolar',
      criterio_logro: 'Reporte positivo de docentes por 2 semanas',
      estado: 'pendiente',
      porcentaje: Math.max(10, def.evalPct - 15),
      orden: 2,
    },
    {
      plan_id: planId,
      area: 'autonomia',
      descripcion: 'Incrementar participación activa en rutinas diarias',
      criterio_logro: 'Completa rutina con apoyo gestual únicamente',
      estado: def.evalPct > 55 ? 'logrado' : 'en_progreso',
      porcentaje: def.evalPct,
      orden: 3,
    },
  ]

  await rest('/objetivos', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(objetivos) })
  return planId
}

async function seedSesiones(pacienteId, ctx, planId, citaPasadaId, def) {
  const existing = await rest(`/sesiones?select=id&paciente_id=eq.${pacienteId}`)
  if (existing.length >= 2) return

  const sesiones = [
    {
      cita_id: citaPasadaId,
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      plan_id: planId,
      clinica_id: ctx.clinicaId,
      fecha: daysAgo(10).toISOString(),
      duracion_minutos: 60,
      actividades: 'Calentamiento, actividad principal y cierre con retroalimentación',
      observaciones: `${def.nombre} participó con buen ánimo y cooperación.`,
      avances: 'Mejor tolerancia a la actividad estructurada',
      dificultades: 'Fatiga leve al final de la sesión',
      estado_animo: 'positivo',
      nivel_cooperacion: 4,
      tareas_casa: 'Practicar 10 min diarios con material indicado',
    },
    {
      cita_id: null,
      paciente_id: pacienteId,
      terapeuta_id: ctx.terapeutaId,
      plan_id: planId,
      clinica_id: ctx.clinicaId,
      fecha: daysAgo(3).toISOString(),
      duracion_minutos: 45,
      actividades: 'Seguimiento de objetivos del plan',
      observaciones: 'Sesión de refuerzo con avances moderados',
      avances: 'Consolida habilidades trabajadas la semana anterior',
      dificultades: null,
      estado_animo: 'neutral',
      nivel_cooperacion: 3,
      tareas_casa: 'Registrar avances en cuaderno de casa',
    },
  ]
  await rest('/sesiones', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(sesiones),
  })
}

async function seedReporte(pacienteId, ctx, def) {
  const existing = await rest(`/reportes_ia?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) {
    if (def.reporteCompartido) {
      await rest(`/reportes_ia?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ enviado_a_padres: true }),
      })
    }
    return
  }

  const contenido = `## Reporte de progreso — ${def.nombre} ${def.apellidos}

### Resumen
${def.nombre} ha trabajado de forma constante en ${def.planAreas.join(', ').replace(/_/g, ' ')}.

### Avances
- Mayor participación en actividades estructuradas
- Mejora en indicadores de la evaluación (${def.evalPct}%)
- Familia reporta generalización parcial en casa

### Recomendaciones
- Mantener rutina de tareas en casa
- Coordinación con escuela para apoyos en aula`

  const body = {
    paciente_id: pacienteId,
    clinica_id: ctx.clinicaId,
    generado_por: ctx.terapeutaId,
    tipo: 'mensual',
    titulo: `Reporte mensual — ${def.nombre}`,
    contenido,
    enviado_a_padres: def.reporteCompartido,
  }

  try {
    await rest('/reportes_ia', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(body) })
  } catch {
    delete body.enviado_a_padres
    await rest('/reportes_ia', { method: 'POST', prefer: 'return=minimal', body: JSON.stringify(body) })
  }
}

async function seedFacturacion(pacienteId, ctx, familiarId, citaPasadaId, def, idx) {
  const existing = await rest(`/facturacion?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) return

  const folioBase = `AJ-2026-${String(idx + 1).padStart(3, '0')}`
  const subtotal = 850
  const iva = 136
  const total = subtotal + iva

  await rest('/facturacion', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify([
      {
        clinica_id: ctx.clinicaId,
        sucursal_id: ctx.sucursalId,
        paciente_id: pacienteId,
        familiar_id: familiarId,
        cita_id: citaPasadaId,
        folio: `${folioBase}-A`,
        concepto: `Sesión de terapia — ${def.nombre} ${def.apellidos}`,
        subtotal,
        descuento: 0,
        iva,
        total,
        estado: idx % 2 === 0 ? 'pagado' : 'pendiente',
        metodo_pago: idx % 2 === 0 ? 'transferencia' : null,
        fecha_pago: idx % 2 === 0 ? daysAgo(8).toISOString() : null,
        fecha_vencimiento: daysFromNow(7).toISOString().slice(0, 10),
      },
      {
        clinica_id: ctx.clinicaId,
        sucursal_id: ctx.sucursalId,
        paciente_id: pacienteId,
        familiar_id: familiarId,
        cita_id: null,
        folio: `${folioBase}-B`,
        concepto: `Paquete mensual 4 sesiones — ${def.nombre}`,
        subtotal: 3200,
        descuento: 200,
        iva: 480,
        total: 3480,
        estado: 'pendiente',
        metodo_pago: null,
        fecha_pago: null,
        fecha_vencimiento: daysFromNow(15).toISOString().slice(0, 10),
      },
    ]),
  })
}

async function seedWhatsApp(pacienteId, ctx, familiarId, def, telefono) {
  const existing = await rest(`/mensajes_whatsapp?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) return

  await rest('/mensajes_whatsapp', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify([
      {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        familiar_id: familiarId,
        enviado_por: ctx.terapeutaId,
        telefono_destino: telefono,
        tipo_mensaje: 'recordatorio',
        contenido: `Hola, le recordamos la cita de ${def.nombre} en Aprendamos Juntos. Confirme su asistencia.`,
        estado: 'entregado',
        respuesta: null,
        leido_at: null,
        created_at: daysAgo(1).toISOString(),
      },
      {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        familiar_id: familiarId,
        enviado_por: ctx.terapeutaId,
        telefono_destino: telefono,
        tipo_mensaje: 'libre',
        contenido: `Compartimos avances de ${def.nombre} en la última sesión. Quedamos atentos a sus dudas.`,
        estado: 'leido',
        respuesta: 'Gracias, lo revisamos en casa.',
        leido_at: daysAgo(0).toISOString(),
        created_at: daysAgo(0).toISOString(),
      },
    ]),
  })
}

async function seedChat(pacienteId, ctx, authUserId, def) {
  if (!authUserId) return
  const existing = await rest(`/chat_mensajes?select=id&paciente_id=eq.${pacienteId}&limit=1`)
  if (existing[0]) return

  await rest('/chat_mensajes', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify([
      {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        remitente_id: ctx.terapeutaId,
        tipo_remitente: 'terapeuta',
        contenido: `¡Hola! ${def.nombre} tuvo una excelente sesión. Avances en ${def.planAreas[0].replace(/_/g, ' ')}.`,
        leido: true,
        created_at: daysAgo(2).toISOString(),
      },
      {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        remitente_id: authUserId,
        tipo_remitente: 'padre',
        contenido: 'Gracias por el reporte. ¿Qué podemos practicar en casa esta semana?',
        leido: true,
        created_at: daysAgo(1).toISOString(),
      },
      {
        clinica_id: ctx.clinicaId,
        paciente_id: pacienteId,
        remitente_id: ctx.terapeutaId,
        tipo_remitente: 'terapeuta',
        contenido: 'Les compartí el reporte mensual en el portal con actividades sugeridas.',
        leido: false,
      },
    ]),
  })
}

async function seedNotificaciones(ctx) {
  const existing = await rest(`/notificaciones?select=id&usuario_id=eq.${ctx.adminId}&limit=1`)
  if (existing[0]) return

  await rest('/notificaciones', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify([
      {
        usuario_id: ctx.adminId,
        clinica_id: ctx.clinicaId,
        tipo: 'cita',
        titulo: 'Citas de hoy',
        mensaje: 'Tienes 3 citas programadas para hoy en la agenda.',
        url_accion: '/agenda',
      },
      {
        usuario_id: ctx.adminId,
        clinica_id: ctx.clinicaId,
        tipo: 'pago',
        titulo: 'Pagos pendientes',
        mensaje: 'Hay 5 cobros pendientes de facturación por revisar.',
        url_accion: '/facturacion',
      },
      {
        usuario_id: ctx.adminId,
        clinica_id: ctx.clinicaId,
        tipo: 'reporte',
        titulo: 'Reportes listos',
        mensaje: '2 reportes IA están listos para compartir con padres.',
        url_accion: '/reportes',
      },
    ]),
  })
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const ctx = await getContext()
  console.log(`   Admin/terapeuta: ${ctx.terapeutaId}\n`)

  for (let i = 0; i < PATIENTS.length; i++) {
    const def = PATIENTS[i]
    console.log(`── ${def.nombre} ${def.apellidos} ──`)

    const pacienteId = await upsertPaciente(def, ctx)
    console.log(`   Paciente: ${pacienteId}`)

    const { familiarId, authUserId } = await ensureFamiliar(def, pacienteId)
    console.log(`   Familiar: ${familiarId}${authUserId ? ' (portal activo)' : ''}`)

    const { citaPasadaId, citaFuturaId } = await seedCitas(pacienteId, ctx, i)
    console.log(`   Citas: pasada ${citaPasadaId}, próxima ${citaFuturaId}`)

    await seedEvaluacion(pacienteId, ctx, def)
    console.log(`   Evaluación: ${def.evalTipo} (${def.evalPct}%)`)

    const planId = await seedPlan(pacienteId, ctx, def)
    console.log(`   Plan: ${planId}`)

    await seedSesiones(pacienteId, ctx, planId, citaPasadaId, def)
    console.log('   Sesiones: 2 registradas')

    await seedReporte(pacienteId, ctx, def)
    console.log(`   Reporte IA${def.reporteCompartido ? ' (compartido)' : ''}`)

    const telefono = def.portal?.telefono || def.familiar?.telefono
    await seedFacturacion(pacienteId, ctx, familiarId, citaPasadaId, def, i)
    console.log('   Facturación: 2 registros')

    await seedWhatsApp(pacienteId, ctx, familiarId, def, telefono)
    console.log('   WhatsApp: 2 mensajes')

    await seedChat(pacienteId, ctx, authUserId, def)
    if (authUserId) console.log('   Chat portal: conversación demo')
    console.log('')
  }

  await seedNotificaciones(ctx)
  console.log('Notificaciones admin: 3 alertas demo')

  const total = await rest(`/pacientes?select=id&clinica_id=eq.${ctx.clinicaId}&activo=eq.true`)
  console.log('\n✅ Siembra completa')
  console.log(`   ${total.length} pacientes activos en la clínica`)
  console.log('   Recarga /pacientes, /agenda, /evaluaciones, /planes, /sesiones, /facturacion, /mensajes')
  console.log('\n   Portal padres (Santiago):')
  console.log('   Email:    padre.demo@aprendamosjuntos.mx')
  console.log('   Password: Padre2026!')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
