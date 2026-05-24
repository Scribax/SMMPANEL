/**
 * seedSMMKings.ts
 * Crea/actualiza servicios en la DB usando IDs exactos de SMMKings.
 *
 * Uso en VPS:
 *   docker exec boostins_backend node dist/scripts/seedSMMKings.js
 *
 * Uso local:
 *   DATABASE_URL="postgresql://..." npm run seed:smmkings
 */

import axios from 'axios';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PROVIDER_URL   = 'https://smmkings.com/api/v2';
const PROVIDER_KEY   = '7e16ca9f7f61e1dbadcbcf1c751ee2ac';
const PROVIDER_NAME  = 'SMMKings';
const EXCHANGE_RATE  = parseFloat(process.env.EXCHANGE_RATE ?? '1500');
const MARGIN         = parseFloat(process.env.PRICE_MARGIN  ?? '2.5');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

interface ProviderService {
  service: number;
  name: string;
  rate: string;
  min: string;
  max: string;
  category: string;
  type: string;
  refill: boolean;
  cancel: boolean;
}

interface ServiceDef {
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  category: 'followers' | 'likes' | 'views' | 'comments';
  description: string;
  deliverySpeed: string;
  providerServiceId: number;
  sortOrder: number;
}

// ── Catálogo SMMKings — IDs verificados ────────────────────────────────────
const SERVICES: ServiceDef[] = [

  // ════════════════════════════════════════════════════════════════
  // INSTAGRAM
  // ════════════════════════════════════════════════════════════════

  // Followers
  {
    name: 'Instagram Followers – Básico',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores mixtos de entrega instantánea. Ideal para comenzar. Sin reposición.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 5063,   // $0.21/1000 | Mixed | Max 50K | No Refill
    sortOrder: 1,
  },
  {
    name: 'Instagram Followers – Real',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales y mixtos de alta calidad. Max 250K. Sin reposición.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 4973,   // $0.24/1000 | Mixed | Max 250K | No Refill
    sortOrder: 2,
  },
  {
    name: 'Instagram Followers – Premium 30d',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores HQ con reposición automática 30 días. Si caen, se reponen gratis.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 3759,   // $0.90/1000 | HQ Mixed | Max 50K | 30d Refill
    sortOrder: 3,
  },
  {
    name: 'Instagram Followers – Elite 365d',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores HQ con reposición automática 365 días. Máxima garantía anual.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 4427,   // $1.08/1000 | HQ | Max 800K | 365d Refill
    sortOrder: 4,
  },
  {
    name: 'Instagram Followers – Max 1M',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores HQ mixtos hasta 1 millón con reposición 30 días.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 7178,   // $1.05/1000 | HQ Mixed | Max 1M | 30d Refill
    sortOrder: 5,
  },

  // Likes
  {
    name: 'Instagram Likes – Fast',
    platform: 'instagram', category: 'likes',
    description: 'Likes instantáneos para FOTOS y REELS. ✅ Usar con: instagram.com/p/ (fotos) o instagram.com/reel/ (videos). ❌ NO usar con enlaces de perfil.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 2985,   // likes rápidos Instagram
    sortOrder: 10,
  },
  {
    name: 'Instagram Likes – Premium',
    platform: 'instagram', category: 'likes',
    description: 'Likes HQ de cuentas reales para FOTOS y REELS. ✅ Usar con: instagram.com/p/ (fotos) o instagram.com/reel/ (videos). Reposición automática.',
    deliverySpeed: '0-2 hours',
    providerServiceId: 6504,   // likes HQ con refill
    sortOrder: 11,
  },

  // Views
  {
    name: 'Instagram Views – Reels',
    platform: 'instagram', category: 'views',
    description: 'Vistas para VIDEOS/REELS. ⚠️ SOLO funciona con: instagram.com/reel/ (videos) o instagram.com/tv/. ❌ NO funciona con fotos instagram.com/p/',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 5266,   // views reels
    sortOrder: 20,
  },
  {
    name: 'Instagram Story Views',
    platform: 'instagram', category: 'views',
    description: 'Vistas para HISTORIAS de Instagram. ⚠️ Solo funciona con historias activas. ❌ NO funciona con posts ni reels.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 12917,  // story views
    sortOrder: 21,
  },

  // ════════════════════════════════════════════════════════════════
  // TIKTOK
  // ════════════════════════════════════════════════════════════════

  // Followers
  {
    name: 'TikTok Followers – Fast',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok de entrega instantánea.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 6816,   // TT followers fast
    sortOrder: 30,
  },
  {
    name: 'TikTok Followers – Premium',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok HQ premium.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 6821,   // TT followers premium
    sortOrder: 31,
  },

  // Likes
  {
    name: 'TikTok Likes – Fast',
    platform: 'tiktok', category: 'likes',
    description: 'Likes instantáneos para videos de TikTok.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 6804,   // TT likes fast
    sortOrder: 40,
  },
  {
    name: 'TikTok Likes – Premium',
    platform: 'tiktok', category: 'likes',
    description: 'Likes premium para videos de TikTok.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 6806,   // TT likes premium
    sortOrder: 41,
  },

  // Views
  {
    name: 'TikTok Views – Fast',
    platform: 'tiktok', category: 'views',
    description: 'Vistas para videos TikTok. Ultra rápido.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 2821,   // TT views fast
    sortOrder: 50,
  },
  {
    name: 'TikTok Views – Premium',
    platform: 'tiktok', category: 'views',
    description: 'Vistas premium para videos TikTok.',
    deliverySpeed: 'Instantáneo',
    providerServiceId: 3826,   // TT views premium
    sortOrder: 51,
  },

  // ════════════════════════════════════════════════════════════════
  // YOUTUBE
  // ════════════════════════════════════════════════════════════════

  // Views
  {
    name: 'YouTube Views – Real',
    platform: 'youtube', category: 'views',
    description: 'Vistas con alta retención y engagement real.',
    deliverySpeed: '0-1 hora',
    providerServiceId: 5807,   // YT views real
    sortOrder: 60,
  },

  // Likes
  {
    name: 'YouTube Likes',
    platform: 'youtube', category: 'likes',
    description: 'Likes para videos de YouTube. Entrega rápida.',
    deliverySpeed: '0-15 min',
    providerServiceId: 1287,   // YT likes
    sortOrder: 70,
  },

  // Subscribers
  {
    name: 'YouTube Subscribers',
    platform: 'youtube', category: 'followers',
    description: 'Suscriptores reales para tu canal.',
    deliverySpeed: '0-6 horas',
    providerServiceId: 7176,   // YT subscribers
    sortOrder: 80,
  },
];

function calcPrice(costUsdPer1000: number): number {
  const costArs = (costUsdPer1000 / 1000) * EXCHANGE_RATE;
  return parseFloat((costArs * MARGIN).toFixed(4));
}

async function main() {
  console.log(`\n🚀 Seeding SMMKings | Cambio: $${EXCHANGE_RATE} ARS/USD | Margen: ${MARGIN}x\n`);

  // Fetch real prices from SMMKings
  const params = new URLSearchParams({ key: PROVIDER_KEY, action: 'services' });
  const { data: provSvcs } = await axios.post<ProviderService[]>(
    PROVIDER_URL, params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );
  const priceMap = new Map<number, ProviderService>();
  provSvcs.forEach((s) => priceMap.set(s.service, s));
  console.log(`✅ ${provSvcs.length} servicios recibidos de SMMKings.\n`);

  const provRow = await db.query(`SELECT id FROM providers WHERE name = $1 AND is_active = true`, [PROVIDER_NAME]);
  if (!provRow.rows.length) { console.error('❌ Proveedor SMMKings no encontrado en DB.'); process.exit(1); }
  const PROVIDER_ID = provRow.rows[0].id;

  let created = 0, updated = 0, skipped = 0;

  for (const def of SERVICES) {
    const prov = priceMap.get(def.providerServiceId);
    if (!prov) {
      console.warn(`⚠️  ID ${def.providerServiceId} no encontrado en SMMKings: ${def.name}`);
      skipped++;
      continue;
    }

    const costUSD = parseFloat(prov.rate);
    const pricePerUnit = calcPrice(costUSD);
    const minQty = parseInt(prov.min);
    const maxQty = parseInt(prov.max);

    const existing = await db.query(`SELECT id FROM services WHERE name = $1`, [def.name]);

    if (existing.rows.length) {
      await db.query(
        `UPDATE services SET
           provider_service_id = $1, provider_id = $2,
           price_per_unit = $3, min_quantity = $4, max_quantity = $5,
           description = $6, delivery_speed = $7, sort_order = $8,
           is_active = true, updated_at = NOW()
         WHERE name = $9`,
        [def.providerServiceId, PROVIDER_ID, pricePerUnit, minQty, maxQty,
         def.description, def.deliverySpeed, def.sortOrder, def.name]
      );
      console.log(`🔄 ${def.name} → $${costUSD}/1000 USD → $${pricePerUnit} ARS/u | min:${minQty} max:${maxQty}`);
      updated++;
    } else {
      await db.query(
        `INSERT INTO services
           (name, platform, category, description, delivery_speed,
            price_per_unit, min_quantity, max_quantity,
            provider_id, provider_service_id, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)`,
        [def.name, def.platform, def.category, def.description, def.deliverySpeed,
         pricePerUnit, minQty, maxQty, PROVIDER_ID, def.providerServiceId, def.sortOrder]
      );
      console.log(`✨ ${def.name} → $${costUSD}/1000 USD → $${pricePerUnit} ARS/u | min:${minQty} max:${maxQty}`);
      created++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 RESUMEN: ${created} creados | ${updated} actualizados | ${skipped} saltados`);
  if (skipped > 0) {
    console.log(`\n⚠️  ${skipped} IDs no encontrados. Verificá los IDs en https://smmkings.com/?page=api`);
  }
  console.log('─'.repeat(60) + '\n');

  await db.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
