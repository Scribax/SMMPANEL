/**
 * seedServices.ts
 * Consulta la API del proveedor y crea/actualiza servicios en la DB
 * para Instagram, TikTok y YouTube.
 *
 * Uso: DATABASE_URL="..." npm run seed:services
 */

import axios from 'axios';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PROVIDER_URL  = process.env.DEFAULT_PROVIDER_URL ?? 'https://smmengineer.com/api/v2';
const PROVIDER_KEY  = process.env.DEFAULT_PROVIDER_KEY ?? '';
const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE ?? '1200');
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

// ── Definición de servicios a crear ────────────────────────────────────────
interface ServiceDef {
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  category: 'followers' | 'likes' | 'views' | 'comments';
  description: string;
  deliverySpeed: string;
  keywords: string[];
  exclude?: string[];
  preferRefill?: boolean;
}

const SERVICES_TO_SEED: ServiceDef[] = [
  // ── INSTAGRAM ─────────────────────────────────────────────────────────
  {
    name: 'Instagram Followers – Real',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores reales con perfil activo. Entrega instantánea.',
    deliverySpeed: '0-1 hour',
    keywords: ['instagram', 'followers', 'real'],
    exclude: ['premium', 'arab', 'brazil', 'turkey', 'india', 'drip', 'targeted'],
    preferRefill: false,
  },
  {
    name: 'Instagram Followers – Premium',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores premium con reposición automática 30 días.',
    deliverySpeed: '0-2 hours',
    keywords: ['instagram', 'followers', 'real'],
    exclude: ['arab', 'brazil', 'turkey', 'india', 'drip', 'targeted'],
    preferRefill: true,
  },
  {
    name: 'Instagram Followers – Argentina',
    platform: 'instagram', category: 'followers',
    description: 'Seguidores argentinos reales. Ideal para cuentas locales.',
    deliverySpeed: '0-3 hours',
    keywords: ['instagram', 'followers'],
    exclude: ['drip', 'targeted', 'india', 'turkey'],
    preferRefill: true,
  },
  {
    name: 'Instagram Likes – Fast',
    platform: 'instagram', category: 'likes',
    description: 'Likes instantáneos de cuentas reales.',
    deliverySpeed: '0-1 hour',
    keywords: ['instagram', 'likes'],
    exclude: ['comment', 'view', 'story', 'reel', 'arab', 'brazil', 'targeted', 'drip'],
    preferRefill: false,
  },
  {
    name: 'Instagram Likes – Premium',
    platform: 'instagram', category: 'likes',
    description: 'Likes premium con reposición automática.',
    deliverySpeed: '0-2 hours',
    keywords: ['instagram', 'likes'],
    exclude: ['comment', 'view', 'story', 'targeted', 'drip'],
    preferRefill: true,
  },
  {
    name: 'Instagram Views – Reels & Posts',
    platform: 'instagram', category: 'views',
    description: 'Vistas para reels y posts. Entrega ultra rápida.',
    deliverySpeed: '0-30 min',
    keywords: ['instagram', 'video', 'views'],
    exclude: ['story', 'comment', 'like', 'follower', 'drip'],
    preferRefill: false,
  },
  {
    name: 'Instagram Story Views',
    platform: 'instagram', category: 'views',
    description: 'Vistas para tus historias de Instagram.',
    deliverySpeed: '0-1 hour',
    keywords: ['instagram', 'story', 'views'],
    exclude: ['poll', 'comment', 'follower', 'drip'],
    preferRefill: false,
  },
  {
    name: 'Instagram Comments – Random',
    platform: 'instagram', category: 'comments',
    description: 'Comentarios aleatorios positivos en español.',
    deliverySpeed: '0-2 hours',
    keywords: ['instagram', 'comments', 'random'],
    exclude: ['custom', 'drip', 'targeted'],
    preferRefill: false,
  },

  // ── TIKTOK ────────────────────────────────────────────────────────────
  {
    name: 'TikTok Followers – Real',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores reales para TikTok. Entrega rápida.',
    deliverySpeed: '0-2 hours',
    keywords: ['tiktok', 'followers'],
    exclude: ['arab', 'brazil', 'turkey', 'india', 'drip', 'targeted', 'lq'],
    preferRefill: true,
  },
  {
    name: 'TikTok Followers – Fast',
    platform: 'tiktok', category: 'followers',
    description: 'Seguidores TikTok de entrega instantánea.',
    deliverySpeed: '0-1 hour',
    keywords: ['tiktok', 'followers'],
    exclude: ['arab', 'brazil', 'turkey', 'india', 'drip', 'targeted'],
    preferRefill: false,
  },
  {
    name: 'TikTok Likes – Fast',
    platform: 'tiktok', category: 'likes',
    description: 'Likes instantáneos para videos de TikTok.',
    deliverySpeed: '0-30 min',
    keywords: ['tiktok', 'likes'],
    exclude: ['comment', 'view', 'follower', 'arab', 'brazil', 'targeted', 'drip'],
    preferRefill: false,
  },
  {
    name: 'TikTok Likes – Premium',
    platform: 'tiktok', category: 'likes',
    description: 'Likes premium con reposición 30 días.',
    deliverySpeed: '0-1 hour',
    keywords: ['tiktok', 'likes'],
    exclude: ['comment', 'view', 'follower', 'targeted', 'drip'],
    preferRefill: true,
  },
  {
    name: 'TikTok Views – Fast',
    platform: 'tiktok', category: 'views',
    description: 'Vistas para videos de TikTok. Ultra rápido.',
    deliverySpeed: '0-30 min',
    keywords: ['tiktok', 'video', 'views'],
    exclude: ['follower', 'like', 'comment', 'live', 'drip'],
    preferRefill: false,
  },
  {
    name: 'TikTok Views – Premium',
    platform: 'tiktok', category: 'views',
    description: 'Vistas premium con reposición automática.',
    deliverySpeed: '0-1 hour',
    keywords: ['tiktok', 'video', 'views'],
    exclude: ['follower', 'like', 'comment', 'live', 'drip'],
    preferRefill: true,
  },
  {
    name: 'TikTok Comments – Random',
    platform: 'tiktok', category: 'comments',
    description: 'Comentarios aleatorios en videos de TikTok.',
    deliverySpeed: '0-2 hours',
    keywords: ['tiktok', 'comments', 'random'],
    exclude: ['custom', 'drip', 'targeted', 'live'],
    preferRefill: false,
  },

  // ── YOUTUBE ───────────────────────────────────────────────────────────
  {
    name: 'YouTube Views – Real',
    platform: 'youtube', category: 'views',
    description: 'Vistas reales para videos de YouTube.',
    deliverySpeed: '0-3 hours',
    keywords: ['youtube', 'views'],
    exclude: ['subscriber', 'like', 'comment', 'adwords', 'shorts', 'azerbai', 'drip', 'live'],
    preferRefill: false,
  },
  {
    name: 'YouTube Views – Fast',
    platform: 'youtube', category: 'views',
    description: 'Vistas rápidas para YouTube. Alta velocidad.',
    deliverySpeed: '0-1 hour',
    keywords: ['youtube', 'views'],
    exclude: ['subscriber', 'like', 'comment', 'azerbai', 'drip', 'live'],
    preferRefill: false,
  },
  {
    name: 'YouTube Likes – Fast',
    platform: 'youtube', category: 'likes',
    description: 'Likes para videos de YouTube. Entrega rápida.',
    deliverySpeed: '0-2 hours',
    keywords: ['youtube', 'likes'],
    exclude: ['subscriber', 'view', 'comment', 'azerbai', 'drip'],
    preferRefill: false,
  },
  {
    name: 'YouTube Likes – Premium',
    platform: 'youtube', category: 'likes',
    description: 'Likes premium con reposición 30 días.',
    deliverySpeed: '0-3 hours',
    keywords: ['youtube', 'likes'],
    exclude: ['subscriber', 'view', 'comment', 'azerbai', 'drip'],
    preferRefill: true,
  },
  {
    name: 'YouTube Subscribers',
    platform: 'youtube', category: 'followers',
    description: 'Suscriptores para tu canal de YouTube.',
    deliverySpeed: '0-6 hours',
    keywords: ['youtube', 'subscribers'],
    exclude: ['comment', 'view', 'like', 'azerbai', 'drip', 'watch time'],
    preferRefill: true,
  },
  {
    name: 'YouTube Comments – Random',
    platform: 'youtube', category: 'comments',
    description: 'Comentarios aleatorios en videos de YouTube.',
    deliverySpeed: '0-3 hours',
    keywords: ['youtube', 'comments', 'random'],
    exclude: ['custom', 'drip', 'azerbai', 'targeted'],
    preferRefill: false,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function matchesService(svc: ProviderService, def: ServiceDef): boolean {
  const combined = `${svc.name.toLowerCase()} ${svc.category.toLowerCase()}`;
  if (svc.type !== 'Default' && svc.type !== 'Custom Comments') return false;
  if (svc.type === 'Custom Comments' && !def.category.includes('comment')) return false;
  const hasAll = def.keywords.every((k) => combined.includes(k.toLowerCase()));
  if (!hasAll) return false;
  const hasExcluded = (def.exclude ?? []).some((e) => combined.includes(e.toLowerCase()));
  if (hasExcluded) return false;
  return true;
}

function pickBest(candidates: ProviderService[], def: ServiceDef): ProviderService {
  return candidates.sort((a, b) => {
    if (def.preferRefill) {
      if (a.refill && !b.refill) return -1;
      if (!a.refill && b.refill) return 1;
    }
    return parseFloat(a.rate) - parseFloat(b.rate);
  })[0];
}

function calcPrice(costUsdPer1000: number): number {
  const costArs = (costUsdPer1000 / 1000) * EXCHANGE_RATE;
  return parseFloat((costArs * MARGIN).toFixed(4));
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Seeding servicios desde SMM Engineer...\n');

  const params = new URLSearchParams({ key: PROVIDER_KEY, action: 'services' });
  const { data: provSvcs } = await axios.post<ProviderService[]>(
    PROVIDER_URL, params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );
  console.log(`✅ ${provSvcs.length} servicios recibidos.\n`);

  const provResult = await db.query(`SELECT id FROM providers WHERE is_active = true LIMIT 1`);
  if (!provResult.rows.length) { console.error('❌ No hay proveedores activos en DB.'); process.exit(1); }
  const providerId = provResult.rows[0].id;

  let created = 0, updated = 0, skipped = 0;

  for (const def of SERVICES_TO_SEED) {
    const candidates = provSvcs.filter((s) => matchesService(s, def));
    if (!candidates.length) {
      console.warn(`⚠️  Sin candidatos: ${def.name}`);
      skipped++;
      continue;
    }

    const best     = pickBest(candidates, def);
    const costUSD  = parseFloat(best.rate);
    const sellARS  = calcPrice(costUSD);

    // Upsert: actualizar si existe, insertar si no
    const existing = await db.query(`SELECT id FROM services WHERE name = $1`, [def.name]);

    if (existing.rows.length) {
      await db.query(
        `UPDATE services SET
           provider_service_id = $1, provider_id = $2,
           price_per_unit = $3, min_quantity = $4, max_quantity = $5,
           updated_at = NOW()
         WHERE name = $6`,
        [best.service, providerId, sellARS, best.min, best.max, def.name]
      );
      console.log(`🔄 Actualizado: ${def.name} → ID ${best.service} | $${costUSD} USD → $${sellARS} ARS/u`);
      updated++;
    } else {
      await db.query(
        `INSERT INTO services
           (name, platform, category, description, delivery_speed,
            price_per_unit, min_quantity, max_quantity,
            provider_id, provider_service_id, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
        [def.name, def.platform, def.category, def.description, def.deliverySpeed,
         sellARS, best.min, best.max, providerId, best.service]
      );
      console.log(`✨ Creado:     ${def.name} → ID ${best.service} | $${costUSD} USD → $${sellARS} ARS/u`);
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
