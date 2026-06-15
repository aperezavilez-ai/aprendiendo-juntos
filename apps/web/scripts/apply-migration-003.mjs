/**
 * Aplica migración 003 (storage + archivos) en Supabase remoto.
 * node --env-file=apps/web/.env.local apps/web/scripts/apply-migration-003.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '../../../supabase/migrations/003_storage_archivos.sql')

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Faltan variables Supabase')
    process.exit(1)
  }

  const sql = readFileSync(sqlPath, 'utf8')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    console.log('RPC exec_sql no disponible — ejecuta manualmente en Supabase SQL Editor:')
    console.log(`  supabase/migrations/003_storage_archivos.sql`)
    console.log('\nO pega el SQL en Dashboard → SQL Editor.')
    process.exit(0)
  }

  console.log('✅ Migración 003 aplicada')
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
