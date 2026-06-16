export const ROLES_ADMIN = ['admin_general', 'director_clinico'] as const
export const ROLES_FACTURACION = ['admin_general', 'director_clinico', 'recepcion'] as const

export function puedeAccederConfig(rol?: string) {
  return !!rol && ROLES_ADMIN.includes(rol as typeof ROLES_ADMIN[number])
}

export function puedeAccederFacturacion(rol?: string) {
  return !!rol && ROLES_FACTURACION.includes(rol as typeof ROLES_FACTURACION[number])
}
