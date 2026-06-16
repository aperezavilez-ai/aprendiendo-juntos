'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'logrado', label: 'Logrado' },
  { value: 'pausado', label: 'Pausado' },
]

export default function PlanDetallePage() {
  const params = useParams()
  const id = params?.id as string
  const supabase = createClient()
  const [plan, setPlan] = useState<any>(null)

  const cargar = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('planes_terapeuticos')
      .select(`
        *,
        paciente:pacientes(nombre, apellidos),
        terapeuta:usuarios(nombre, apellidos),
        objetivos(id, descripcion, area, estado, porcentaje, criterio_logro, fecha_meta)
      `)
      .eq('id', id)
      .single()
    setPlan(data)
  }, [id, supabase])

  useEffect(() => { cargar() }, [cargar])

  const actualizarObjetivo = async (objetivoId: string, cambios: { estado?: string; porcentaje?: number }) => {
    try {
      const { error } = await supabase.from('objetivos').update(cambios).eq('id', objetivoId)
      if (error) throw error

      const objetivos = plan?.objetivos || []
      const actualizados = objetivos.map((o: { id: string }) =>
        o.id === objetivoId ? { ...o, ...cambios } : o
      )
      const promedio = actualizados.length
        ? actualizados.reduce((s: number, o: { porcentaje?: number }) => s + (o.porcentaje || 0), 0) / actualizados.length
        : 0

      await supabase.from('planes_terapeuticos').update({
        porcentaje_avance: Math.round(promedio * 10) / 10,
      }).eq('id', id)

      toast.success('Objetivo actualizado')
      cargar()
    } catch {
      toast.error('Error al actualizar objetivo')
    }
  }

  if (!plan) return <div className="skeleton h-64 rounded-2xl" />

  const objetivos = plan.objetivos || []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/planes" className="btn-icon">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">{plan.titulo}</h1>
          <p className="page-subtitle">
            {plan.paciente?.nombre} {plan.paciente?.apellidos}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="badge badge-success capitalize">{plan.estado}</span>
          <p className="text-xl font-bold text-primary-600">{plan.porcentaje_avance?.toFixed(0) || 0}%</p>
        </div>
        <div className="progress-bar">
          <div className="progress-fill bg-primary-500" style={{ width: `${plan.porcentaje_avance || 0}%` }} />
        </div>
        <p className="text-sm text-neutral-700">{plan.objetivo_general}</p>
        <p className="text-xs text-neutral-400">
          {format(new Date(plan.fecha_inicio), "d MMM yyyy", { locale: es })}
          {plan.fecha_fin_estimada && ` → ${format(new Date(plan.fecha_fin_estimada), "d MMM yyyy", { locale: es })}`}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold mb-4">Objetivos ({objetivos.length})</h2>
        <div className="space-y-4">
          {objetivos.map((o: any) => (
            <div key={o.id} className="p-4 bg-neutral-50 rounded-xl space-y-3">
              <p className="text-sm font-medium">{o.descripcion}</p>
              {o.criterio_logro && (
                <p className="text-xs text-neutral-500">Criterio: {o.criterio_logro}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs text-neutral-500">Estado</label>
                  <select
                    className="input py-1.5 text-sm mt-1"
                    value={o.estado}
                    onChange={e => actualizarObjetivo(o.id, { estado: e.target.value })}
                  >
                    {ESTADOS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-neutral-500">Avance ({o.porcentaje || 0}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={o.porcentaje || 0}
                    onChange={e => actualizarObjetivo(o.id, { porcentaje: parseInt(e.target.value, 10) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Link
          href={`/sesiones/nueva?plan=${plan.id}&paciente=${plan.paciente_id}`}
          className="btn-primary btn-sm mt-4 inline-flex"
        >
          Registrar sesión
        </Link>
      </div>
    </div>
  )
}
