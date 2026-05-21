/**
 * seedServices.ts
 * Usa IDs EXACTOS del proveedor SMM Engineer para crear/actualizar
 * servicios en la DB. Sin keyword matching — sin ambigüedades.
 *
 * Uso: DATABASE_URL="postgresql://...@127.0.0.1:5432/boostins?sslmode=disable" npm run seed:services
 *
 * Para cambiar tipo de cambio o margen:
 *   EXCHANGE_RATE=1500 PRICE_MARGIN=2.5 DATABASE_URL="..." npm run seed:services
 */

import axios from 'axios';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PROVIDER_URL  = process.env.DEFAULT_PROVIDER_URL ?? 'https://smmengineer.com/api/v2';
const PROVIDER_KEY  = process.env.DEFAULT_PROVIDER_KEY ?? '';
const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE ?? '1500');
const MARGIN        = parseFloat(process.env.PRICE_MARGIN ?? '2.5');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

interface ProviderService {
  service: number;
  name: string;
  rate: string;
  min: number;
  max: number;
  category: string;
  type: string;
  refill: boolean;
  cancel: boolean;
}

// ── Definición con IDs EXACTOS del proveedor ──────────────────────────────
// Cada servicio apunta a un provider_service_id único y específico.
// Para ver todos los servicios disponibles: https://smmengineer.com/api/v2?key=KEY&action=services
interface ServiceDef {
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  category: 'followers' | 'likes' | 'views' | 'comments';
  description: string;
  deliverySpeed: string;
  providerServiceId: number;  // ID exacto del proveedor — sin ambigüedades
}

const SERVICES_TO_SEED: ServiceDef[] = [
  // ── INSTAGRAM FOLLOWERS ───────────────────────────────────────────────
  // 23955: Real Accounts With Posts | No Refill | Instant | $0.33/1000
  {
    name: 'Instagram Followers – Real',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con publicaciones activas. Entrega instantánea.',
    deliverySpeed: 'Instant',
    providerServiceId: 23955,
  },
  // 23958: Real Accounts With Posts | 30 Days Refill ♻️ | Instant | $0.42/1000
  {
    name: 'Instagram Followers – Premium',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con reposición automática 30 días. Si caen, se reponen.',
    deliverySpeed: 'Instant',
    providerServiceId: 23958,
  },
  // 23962: Real Accounts With Posts | Lifetime Refill ♻️ | Instant | $0.53/1000
  {
    name: 'Instagram Followers – Lifetime',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores con garantía de reposición de por vida. La mejor calidad.',
    deliverySpeed: 'Instant',
    providerServiceId: 23962,
  },

  // ── INSTAGRAM LIKES ───────────────────────────────────────────────────
  // 23936: HQ Accounts | Lifetime Refill ♻️ | Instant | $0.07/1000
  {
    name: 'Instagram Likes – Fast',
    platform: 'instagram', category: 'likes',
    description: 'Likes de cuentas reales. Entrega instantánea con reposición de por vida.',
    deliverySpeed: 'Instant',
    providerServiceId: 23936,
  },

  // ── INSTAGRAM VIEWS ───────────────────────────────────────────────────
  // 23935: Video Views | All Link | Cancel Enable | Day 1M | $0.0007/1000
  {
    name: 'Instagram Views – Reels & Posts',
    platform: 'instagram', category: 'views',
    description: 'Vistas para reels y posts. Ultra rápido, hasta 1 millón por día.',
    deliverySpeed: 'Instant',
    providerServiceId: 23935,
  },

  // ── TIKTOK FOLLOWERS ──────────────────────────────────────────────────
  // 23949: LQ Accounts | 7 Days Refill ♻️ | Instant | Day 200K | $1.68/1000
  {
    name: 'TikTok Followers – Fast',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok de entrega instantánea. Velocidad hasta 200K/día.',
    deliverySpeed: 'Instant',
    providerServiceId: 23949,
  },
  // 23951: LQ Accounts | 30 Days Refill ♻️ | Instant | Day 200K | $1.84/1000
  {
    name: 'TikTok Followers – Premium',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok con reposición automática 30 días.',
    deliverySpeed: 'Instant',
    providerServiceId: 23951,
  },

  // ── TIKTOK LIKES ──────────────────────────────────────────────────────
  // 23937: LQ Accounts | 30 Days Refill ♻️ | Instant | Day 250K | $0.05/1000
  {
    name: 'TikTok Likes – Fast',
    platform: 'tiktok', category: 'likes',
    description: 'Likes instantáneos para videos de TikTok. Hasta 250K/día.',
    deliverySpeed: 'Instant',
    providerServiceId: 23937,
  },
  // 23938: LQ Accounts | 365 Days Refill ♻️ | Instant | Day 250K | $0.06/1000
  {
    name: 'TikTok Likes – Premium',
    platform: 'tiktok', category: 'likes',
    description: 'Likes TikTok con reposición automática 365 días.',
    deliverySpeed: 'Instant',
    providerServiceId: 23938,
  },

  // ── TIKTOK VIEWS ──────────────────────────────────────────────────────
  // 23946: HQ | No Refill | Instant | Day 100M | $0.006/1000
  {
    name: 'TikTok Views – Fast',
    platform: 'tiktok', category: 'views',
    description: 'Vistas para videos TikTok. Ultra rápido, hasta 100M/día.',
    deliverySpeed: 'Instant',
    providerServiceId: 23946,
  },
  // 23947: HQ | 30 Days Refill ♻️ | Instant | Day 100M | $0.007/1000
  {
    name: 'TikTok Views – Premium',
    platform: 'tiktok', category: 'views',
    description: 'Vistas TikTok con reposición automática 30 días.',
    deliverySpeed: 'Instant',
    providerServiceId: 23947,
  },

  // ── YOUTUBE VIEWS ─────────────────────────────────────────────────────
  // 23911: Original Looking Views | 30 Days Refill | Instant | 100K/Day | $2.00/1000
  {
    name: 'YouTube Views – Real',
    platform: 'youtube', category: 'views',
    description: 'Vistas reales de aspecto orgánico. Retención alta, hasta 100K/día.',
    deliverySpeed: '0-3 hours',
    providerServiceId: 23911,
  },
  // 23913: External Ads Views | Instant | 175K/Day | $2.15/1000
  {
    name: 'YouTube Views – Fast',
    platform: 'youtube', category: 'views',
    description: 'Vistas YouTube de alta velocidad vía ads externos. Hasta 175K/día.',
    deliverySpeed: '0-3 hours',
    providerServiceId: 23913,
  },

  // ── YOUTUBE LIKES ─────────────────────────────────────────────────────
  // 23944: 365 Day Refill | Max 20K | Instant | $1.25/1000
  {
    name: 'YouTube Likes – Fast',
    platform: 'youtube', category: 'likes',
    description: 'Likes para videos de YouTube con reposición 365 días.',
    deliverySpeed: '0-15 min',
    providerServiceId: 23944,
  },
  // 23972: HQ Quality | Instant Superfast | 30 Days Refill | $3.20/1000
  {
    name: 'YouTube Likes – Premium',
    platform: 'youtube', category: 'likes',
    description: 'Likes YouTube de alta calidad con reposición 30 días.',
    deliverySpeed: '0-15 min',
    providerServiceId: 23972,
  },

  // ── YOUTUBE SUBSCRIBERS ───────────────────────────────────────────────
  // 23945: YouTube Subscribers + Watch Time | 30 Days Refill | $20.80/1000
  {
    name: 'YouTube Subscribers',
    platform: 'youtube', category: 'followers',
    description: 'Suscriptores reales para tu canal de YouTube con reposición 30 días.',
    deliverySpeed: '0-6 hours',
    providerServiceId: 23945,
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────
function calcPrice(costUsdPer1000: number): number {
  const costArs = (costUsdPer1000 / 1000) * EXCHANGE_RATE;
  return parseFloat((costArs * MARGIN).toFixed(4));
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seeding servicios | Cambio: $${EXCHANGE_RATE} ARS/USD | Margen: ${MARGIN}x\n`);

  // Obtener lista de precios del proveedor (indexada por service ID)
  const params = new URLSearchParams({ key: PROVIDER_KEY, action: 'services' });
  const { data: provSvcs } = await axios.post<ProviderService[]>(
    PROVIDER_URL, params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );
  const priceMap = new Map<number, ProviderService>();
  provSvcs.forEach((s) => priceMap.set(s.service, s));
  console.log(`✅ ${provSvcs.length} servicios recibidos del proveedor.\n`);

  const provResult = await db.query(`SELECT id FROM providers WHERE is_active = true LIMIT 1`);
  if (!provResult.rows.length) { console.error('❌ No hay proveedores activos en DB.'); process.exit(1); }
  const providerId = provResult.rows[0].id;

  let created = 0, updated = 0, skipped = 0;

  for (const def of SERVICES_TO_SEED) {
    const prov = priceMap.get(def.providerServiceId);
    if (!prov) {
      console.warn(`⚠️  ID ${def.providerServiceId} no encontrado en proveedor: ${def.name}`);
      skipped++;
      continue;
    }

    const costUSD = parseFloat(prov.rate);
    const sellARS = calcPrice(costUSD);

    const existing = await db.query(`SELECT id FROM services WHERE name = $1`, [def.name]);

    if (existing.rows.length) {
      await db.query(
        `UPDATE services SET
           provider_service_id = $1, provider_id = $2,
           price_per_unit = $3, min_quantity = $4, max_quantity = $5,
           description = $6, delivery_speed = $7,
           updated_at = NOW()
         WHERE name = $8`,
        [def.providerServiceId, providerId, sellARS, prov.min, prov.max,
         def.description, def.deliverySpeed, def.name]
      );
      console.log(`🔄 ${def.name}\n   ID proveedor: ${def.providerServiceId} | Costo: $${costUSD}/1000 USD | Venta: $${sellARS} ARS/u | Refill: ${prov.refill ? '♻️' : '—'}`);
      updated++;
    } else {
      await db.query(
        `INSERT INTO services
           (name, platform, category, description, delivery_speed,
            price_per_unit, min_quantity, max_quantity,
            provider_id, provider_service_id, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
        [def.name, def.platform, def.category, def.description, def.deliverySpeed,
         sellARS, prov.min, prov.max, providerId, def.providerServiceId]
      );
      console.log(`✨ ${def.name}\n   ID proveedor: ${def.providerServiceId} | Costo: $${costUSD}/1000 USD | Venta: $${sellARS} ARS/u | Refill: ${prov.refill ? '♻️' : '—'}`);
      created++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 RESUMEN: ${created} creados | ${updated} actualizados | ${skipped} saltados`);
  console.log('─'.repeat(60) + '\n');

  await db.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
