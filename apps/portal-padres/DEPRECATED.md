# ⚠️ DEPRECATED — No usar en producción

Esta app (`apps/portal-padres`) quedó **obsoleta**.

El portal de padres vive integrado en la app principal:

| Antes (obsoleto)     | Ahora (producción)              |
|----------------------|---------------------------------|
| `localhost:3001`     | `https://www.aprendamosjuntos.mx/portal/*` |
| `apps/portal-padres` | `apps/web/src/app/portal/`      |

## Rutas actuales

- `/portal/citas` — Citas y confirmación
- `/portal/mensajes` — Chat con terapeuta
- `/portal/reportes` — Reportes IA y documentos
- `/portal/perfil` — Perfil del paciente

## Credenciales demo

- Email: `padre.demo@aprendamosjuntos.mx`
- Password: `Padre2026!`

## Motivo de deprecación

- Auth y datos en **Server Components** (más seguro)
- Un solo deploy en Vercel
- Middleware redirige rol `padre` → `/portal/*`

No agregues features aquí. Si necesitas cambios en el portal, edita `apps/web/src/app/portal/`.
