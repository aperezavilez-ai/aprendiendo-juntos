import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClientFromRequest } from '@/lib/supabase/server'
import { buildStoragePath, STORAGE_BUCKET } from '@/lib/storage'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
]

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertPacienteAccess(pacienteId: string, userId: string) {
  const supabase = adminClient()
  const { data: staff } = await supabase
    .from('usuarios')
    .select('clinica_id, rol')
    .eq('id', userId)
    .single()

  if (!staff || staff.rol === 'padre') {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
  }

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, clinica_id')
    .eq('id', pacienteId)
    .eq('clinica_id', staff.clinica_id)
    .single()

  if (!paciente) {
    return { error: NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 }) }
  }

  return { staff, paciente }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const access = await assertPacienteAccess(params.id, user.id)
    if (access.error) return access.error

    const formData = await request.formData()
    const file = formData.get('file')
    const tipo = String(formData.get('tipo') || 'otro')
    const descripcion = String(formData.get('descripcion') || '')
    const visible_a_padres = formData.get('visible_a_padres') === 'true'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'El archivo supera 10 MB' }, { status: 400 })
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    const admin = adminClient()
    const storagePath = buildStoragePath(
      access.paciente!.clinica_id,
      params.id,
      file.name
    )

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    const { data: signed, error: signError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Error al generar URL del archivo' }, { status: 500 })
    }

    const insertBody: Record<string, unknown> = {
      paciente_id: params.id,
      subido_por: user.id,
      nombre: file.name,
      tipo,
      url: signed.signedUrl,
      tamanio_bytes: file.size,
      mime_type: file.type || null,
      descripcion: descripcion || null,
    }

    let { data: archivo, error: dbError } = await admin
      .from('archivos_paciente')
      .insert({ ...insertBody, storage_path: storagePath, visible_a_padres })
      .select('*')
      .single()

    if (dbError?.message?.includes('visible_a_padres') || dbError?.message?.includes('storage_path')) {
      ;({ data: archivo, error: dbError } = await admin
        .from('archivos_paciente')
        .insert(insertBody)
        .select('*')
        .single())
    }

    if (dbError) {
      await admin.storage.from(STORAGE_BUCKET).remove([storagePath])
      return NextResponse.json({ error: 'Error al registrar archivo' }, { status: 500 })
    }

    return NextResponse.json({ archivo })
  } catch (error: unknown) {
    console.error('Upload archivo:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 })
    }

    const supabase = createClientFromRequest(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const access = await assertPacienteAccess(params.id, user.id)
    if (access.error) return access.error

    const { searchParams } = new URL(request.url)
    const archivoId = searchParams.get('archivoId')
    if (!archivoId) {
      return NextResponse.json({ error: 'archivoId requerido' }, { status: 400 })
    }

    const admin = adminClient()
    const { data: archivo } = await admin
      .from('archivos_paciente')
      .select('id, storage_path, paciente_id')
      .eq('id', archivoId)
      .eq('paciente_id', params.id)
      .single()

    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    if (archivo.storage_path) {
      await admin.storage.from(STORAGE_BUCKET).remove([archivo.storage_path])
    }

    await admin.from('archivos_paciente').delete().eq('id', archivoId)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Delete archivo:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
