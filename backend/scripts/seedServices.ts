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

  // ════════════════════════════════════════════════════════════════
  // INSTAGRAM
  // ════════════════════════════════════════════════════════════════

  // ── Followers ─────────────────────────────────────────────────
  // Cuentas reales con posts, bajo drop, sin reposición. El más barato.
  {
    name: 'Instagram Followers – Real',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con publicaciones activas. Bajo drop. Entrega instantánea.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23955,  // $0.33/1000 | No Refill | Max 100K
  },
  // Cuentas reales con posts, bajo drop, reposición 30 días.
  {
    name: 'Instagram Followers – Premium',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con reposición automática 30 días. Si caen, se reponen gratis.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23958,  // $0.42/1000 | 30 Days Refill ♻️ | Max 100K
  },
  // Cuentas reales con posts, bajo drop, reposición de por vida.
  {
    name: 'Instagram Followers – Lifetime',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con garantía de reposición de por vida. La mejor calidad disponible.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23962,  // $0.53/1000 | Lifetime Refill ♻️ | Max 100K
  },

  // ── Likes ──────────────────────────────────────────────────────
  // HQ, bajo drop, reposición lifetime. Mejor calidad/precio del proveedor.
  {
    name: 'Instagram Likes – Fast',
    platform: 'instagram', category: 'likes',
    description: 'Likes de cuentas reales HQ. Entrega instantánea con reposición de por vida.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23936,  // $0.07/1000 | Lifetime Refill ♻️ | Max 100K
  },

  // ── Views ──────────────────────────────────────────────────────
  // Video views para reels y posts. Hasta 1M/día. El más barato del mercado.
  {
    name: 'Instagram Views – Reels & Posts',
    platform: 'instagram', category: 'views',
    description: 'Vistas para reels y posts. Ultra rápido, hasta 1 millón por día.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23935,  // $0.0007/1000 | No Refill | Max Unlimited
  },
  // Story views. Hasta 1M/día.
  {
    name: 'Instagram Story Views',
    platform: 'instagram', category: 'views',
    description: 'Vistas para tus historias de Instagram. Hasta 1M/día.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 12917,  // $0.005/1000 | No Refill | Max 1M
  },

  // ════════════════════════════════════════════════════════════════
  // TIKTOK
  // ════════════════════════════════════════════════════════════════

  // ── Followers ─────────────────────────────────────────────────
  // LQ pero funcional, reposición 7 días. El más barato disponible.
  {
    name: 'TikTok Followers – Fast',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok de entrega instantánea con reposición 7 días. Hasta 5M.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23949,  // $1.68/1000 | 7 Days Refill ♻️ | Max 5M
  },
  // LQ, reposición 30 días. Mejor garantía.
  {
    name: 'TikTok Followers – Premium',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok con reposición automática 30 días. Hasta 5M.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23951,  // $1.84/1000 | 30 Days Refill ♻️ | Max 5M
  },

  // ── Likes ──────────────────────────────────────────────────────
  // Bot accounts, reposición 30 días. Mejor precio con refill.
  {
    name: 'TikTok Likes – Fast',
    platform: 'tiktok', category: 'likes',
    description: 'Likes instantáneos para videos de TikTok con reposición 30 días.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 22429,  // $0.03/1000 | 30 Days Refill ♻️ | Max 1M
  },
  // Bot accounts, reposición 365 días. Mejor garantía.
  {
    name: 'TikTok Likes – Premium',
    platform: 'tiktok', category: 'likes',
    description: 'Likes TikTok con reposición automática 365 días.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 22430,  // $0.03/1000 | 365 Days Refill ♻️ | Max 1M
  },

  // ── Views ──────────────────────────────────────────────────────
  // HQ, sin refill, más barato. Hasta 100M/día.
  {
    name: 'TikTok Views – Fast',
    platform: 'tiktok', category: 'views',
    description: 'Vistas para videos TikTok. HQ, ultra rápido, hasta 100M/día.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23157,  // $0.0052/1000 | No Refill | Max Unlimited
  },
  // HQ, reposición 30 días. Más garantía.
  {
    name: 'TikTok Views – Premium',
    platform: 'tiktok', category: 'views',
    description: 'Vistas TikTok HQ con reposición automática 30 días.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 23947,  // $0.007/1000 | 30 Days Refill ♻️ | Max Unlimited
  },

  // ════════════════════════════════════════════════════════════════
  // YOUTUBE
  // ════════════════════════════════════════════════════════════════

  // ── Views ──────────────────────────────────────────────────────
  // Real engagement, retención real, reposición 30 días. Mejor calidad.
  {
    name: 'YouTube Views – Real',
    platform: 'youtube', category: 'views',
    description: 'Vistas con engagement real y alta retención. Reposición 30 días. Hasta 1M.',
    deliverySpeed: '0-1 hora',
    providerServiceId: 22676,  // $0.32/1000 | 30 Days Refill ♻️ | Max Unlimited
  },
  // Real engagement, retención real, reposición 365 días. Mejor garantía.
  {
    name: 'YouTube Views – Premium',
    platform: 'youtube', category: 'views',
    description: 'Vistas reales con reposición automática 365 días. La mejor garantía.',
    deliverySpeed: '0-1 hora',
    providerServiceId: 22677,  // $0.52/1000 | 365 Days Refill ♻️ | Max Unlimited
  },

  // ── Likes ──────────────────────────────────────────────────────
  // Reposición 365 días. Único disponible de buena calidad.
  {
    name: 'YouTube Likes',
    platform: 'youtube', category: 'likes',
    description: 'Likes para videos de YouTube con reposición 365 días. Hasta 50K.',
    deliverySpeed: '0-15 min',
    providerServiceId: 23944,  // $1.25/1000 | 365 Days Refill | Max 50K
  },

  // ── Subscribers ────────────────────────────────────────────────
  // HQ, Lifetime refill. Mejor relación calidad/precio para subs.
  {
    name: 'YouTube Subscribers – Real',
    platform: 'youtube', category: 'followers',
    description: 'Suscriptores HQ para tu canal de YouTube. Reposición de por vida.',
    deliverySpeed: '0-6 horas',
    providerServiceId: 8560,   // $5.69/1000 | Lifetime Refill | Max 50K
  },
  // Alta calidad, reposición 7 días, máximo 100K.
  {
    name: 'YouTube Subscribers – Premium',
    platform: 'youtube', category: 'followers',
    description: 'Suscriptores de alta calidad con reposición 7 días. Hasta 100K.',
    deliverySpeed: '0-6 horas',
    providerServiceId: 20738,  // $6.40/1000 | 7 Days Refill ♻️ | Max 100K
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
