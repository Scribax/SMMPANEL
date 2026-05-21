/**
 * syncProviderServices.ts
 * Consulta la API del proveedor, elige el mejor servicio por categoría
 * y actualiza los servicios en la DB con el mejor precio y proveedor.
 *
 * Uso: npx ts-node scripts/syncProviderServices.ts
 */

import axios from 'axios';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Config ─────────────────────────────────────────────────────────────────
const PROVIDER_URL  = process.env.DEFAULT_PROVIDER_URL  ?? 'https://smmengineer.com/api/v2';
const PROVIDER_KEY  = process.env.DEFAULT_PROVIDER_KEY  ?? '';
const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE ?? '1200'); // ARS por USD
const MARGIN        = parseFloat(process.env.PRICE_MARGIN ?? '2.5');  // multiplicador (2.5x = 150% margen)
const MIN_MARKUP    = 1.8; // mínimo aceptable

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ProviderService {
  service: number;
  name: string;
  rate: string;   // USD por 1000 unidades
  min: number;
  max: number;
  category: string;
  type: string;
  refill: boolean;
  cancel: boolean;
}

interface ServiceRule {
  /** Nombre del servicio en nuestra DB (debe coincidir exactamente) */
  dbName: string;
  /** Palabras clave que deben estar en el nombre del servicio del proveedor */
  keywords: string[];
  /** Palabras que NO deben estar */
  exclude?: string[];
  /** Preferir servicios con refill */
  preferRefill?: boolean;
  /** Plataforma para log */
  platform: string;
  /** Categoría para log */
  category: string;
}

// ── Reglas de matching ─────────────────────────────────────────────────────
const RULES: ServiceRule[] = [
  {
    dbName: 'Instagram Followers – Real',
    platform: 'instagram',
    category: 'followers',
    keywords: ['instagram', 'followers', 'real'],
    exclude: ['premium', 'drip', 'arab', 'brazil', 'turkey', 'india'],
    preferRefill: false,
  },
  {
    dbName: 'Instagram Followers – Premium',
    platform: 'instagram',
    category: 'followers',
    keywords: ['instagram', 'followers', 'real'],
    exclude: ['arab', 'brazil', 'turkey', 'india'],
    preferRefill: true,
  },
  {
    dbName: 'Instagram Likes – Fast',
    platform: 'instagram',
    category: 'likes',
    keywords: ['instagram', 'likes'],
    exclude: ['comment', 'view', 'story', 'reel', 'arab', 'brazil'],
    preferRefill: false,
  },
  {
    dbName: 'Instagram Views – Reels & Posts',
    platform: 'instagram',
    category: 'views',
    keywords: ['instagram', 'video', 'views'],
    exclude: ['story', 'comment', 'like', 'follower'],
    preferRefill: false,
  },
  {
    dbName: 'TikTok Followers',
    platform: 'tiktok',
    category: 'followers',
    keywords: ['tiktok', 'followers'],
    exclude: ['arab', 'brazil', 'turkey', 'india'],
    preferRefill: true,
  },
  {
    dbName: 'TikTok Likes',
    platform: 'tiktok',
    category: 'likes',
    keywords: ['tiktok', 'likes'],
    exclude: ['comment', 'view', 'follower', 'arab', 'brazil'],
    preferRefill: false,
  },
  {
    dbName: 'TikTok Views',
    platform: 'tiktok',
    category: 'views',
    keywords: ['tiktok', 'video', 'views'],
    exclude: ['follower', 'like', 'comment'],
    preferRefill: false,
  },
  {
    dbName: 'YouTube Views',
    platform: 'youtube',
    category: 'views',
    keywords: ['youtube', 'views'],
    exclude: ['subscriber', 'like', 'comment', 'adwords', 'shorts', 'azerbai'],
    preferRefill: false,
  },
  {
    dbName: 'YouTube Likes',
    platform: 'youtube',
    category: 'likes',
    keywords: ['youtube', 'likes'],
    exclude: ['subscriber', 'view', 'comment', 'azerbai'],
    preferRefill: false,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function matchesRule(svc: ProviderService, rule: ServiceRule): boolean {
  const nameLower = svc.name.toLowerCase();
  const catLower  = svc.category.toLowerCase();
  const combined  = `${nameLower} ${catLower}`;

  const hasAll = rule.keywords.every((k) => combined.includes(k.toLowerCase()));
  if (!hasAll) return false;

  const hasExcluded = (rule.exclude ?? []).some((e) => combined.includes(e.toLowerCase()));
  if (hasExcluded) return false;

  // solo servicios tipo Default
  if (svc.type !== 'Default') return false;

  return true;
}

function bestService(candidates: ProviderService[], rule: ServiceRule): ProviderService {
  // Ordenar: primero por refill si se prefiere, luego por precio menor
  return candidates.sort((a, b) => {
    if (rule.preferRefill) {
      if (a.refill && !b.refill) return -1;
      if (!a.refill && b.refill) return 1;
    }
    return parseFloat(a.rate) - parseFloat(b.rate);
  })[0];
}

function calcSellPrice(costUsdPer1000: number): number {
  const costArsPerUnit = (costUsdPer1000 / 1000) * EXCHANGE_RATE;
  const sell = costArsPerUnit * MARGIN;
  // Redondear a 2 decimales y aplicar markup mínimo
  return Math.max(
    parseFloat((costArsPerUnit * MIN_MARKUP).toFixed(4)),
    parseFloat(sell.toFixed(4))
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Consultando API del proveedor...`);
  console.log(`   URL: ${PROVIDER_URL}`);
  console.log(`   Tipo de cambio: $${EXCHANGE_RATE} ARS/USD`);
  console.log(`   Multiplicador de precio: ${MARGIN}x\n`);

  const params = new URLSearchParams({ key: PROVIDER_KEY, action: 'services' });
  const { data: providerServices } = await axios.post<ProviderService[]>(
    PROVIDER_URL,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );

  console.log(`✅ ${providerServices.length} servicios recibidos del proveedor.\n`);

  // Obtener provider ID de la DB
  const provResult = await db.query(`SELECT id FROM providers WHERE is_active = true LIMIT 1`);
  if (!provResult.rows.length) {
    console.error('❌ No hay proveedores activos en la DB. Configuralo primero desde el admin.');
    process.exit(1);
  }
  const providerId = provResult.rows[0].id;
  console.log(`📦 Proveedor activo en DB: ID ${providerId}\n`);

  let updated = 0;
  let skipped = 0;
  const results: { rule: string; serviceId: number; name: string; costUSD: number; sellARS: number; refill: boolean }[] = [];

  for (const rule of RULES) {
    const candidates = providerServices.filter((s) => matchesRule(s, rule));

    if (!candidates.length) {
      console.warn(`⚠️  Sin candidatos para: ${rule.dbName}`);
      skipped++;
      continue;
    }

    const best = bestService(candidates, rule);
    const costUSD = parseFloat(best.rate);
    const sellARS = calcSellPrice(costUSD);

    results.push({
      rule: rule.dbName,
      serviceId: best.service,
      name: best.name.substring(0, 60),
      costUSD,
      sellARS,
      refill: best.refill,
    });

    // Actualizar en DB
    const dbRes = await db.query(
      `UPDATE services
       SET provider_service_id = $1,
           provider_id         = $2,
           price_per_unit      = $3,
           min_quantity        = $4,
           max_quantity        = $5,
           updated_at          = NOW()
       WHERE name = $6
       RETURNING id`,
      [best.service, providerId, sellARS, best.min, best.max, rule.dbName]
    );

    if (dbRes.rowCount && dbRes.rowCount > 0) {
      console.log(`✅ ${rule.dbName}`);
      console.log(`   Proveedor ID: ${best.service} | Costo: $${costUSD} USD/1000 | Precio venta: $${sellARS} ARS/u | Refill: ${best.refill ? '♻️' : '—'}`);
      console.log(`   Servicio: ${best.name.substring(0, 80)}\n`);
      updated++;
    } else {
      console.warn(`⚠️  No se encontró en DB: "${rule.dbName}" (no se actualizó)\n`);
      skipped++;
    }
  }

  // Resumen
  console.log('─'.repeat(60));
  console.log(`📊 RESUMEN`);
  console.log('─'.repeat(60));
  console.log(`  Servicios actualizados: ${updated}`);
  console.log(`  Saltados / no encontrados: ${skipped}`);
  console.log('\n  Tabla de precios final:');
  console.log('  ' + '─'.repeat(56));
  console.log(`  ${'Servicio'.padEnd(30)} ${'Costo USD'.padStart(10)} ${'Venta ARS'.padStart(12)}`);
  console.log('  ' + '─'.repeat(56));
  for (const r of results) {
    console.log(`  ${r.rule.padEnd(30)} ${('$'+r.costUSD).padStart(10)} ${('$'+r.sellARS).padStart(12)}`);
  }
  console.log('─'.repeat(60) + '\n');

  await db.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
