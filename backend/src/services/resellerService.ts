import { query } from "../config/database";

export const DEFAULT_RESELLER_MIN_DEPOSIT = 5000;

export interface ResellerPricingProfile {
  enabled: boolean;
  active: boolean;
  discountPercent: number;
  minDeposit: number;
  approvedDeposits: number;
  remainingToActivate: number;
}

interface ResellerRow {
  reseller_enabled: boolean;
  reseller_discount_percent: string | number;
  reseller_min_deposit: string | number;
  approved_deposits: string | number;
}

const clampDiscount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 80);
};

export const getResellerPricingProfile = async (
  userId: string | null | undefined,
): Promise<ResellerPricingProfile | null> => {
  if (!userId) return null;

  const result = await query<ResellerRow>(
    `SELECT u.reseller_enabled,
            u.reseller_discount_percent,
            u.reseller_min_deposit,
            COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) AS approved_deposits
     FROM users u
     LEFT JOIN deposits d ON d.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId],
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const minDeposit = Number(row.reseller_min_deposit) || DEFAULT_RESELLER_MIN_DEPOSIT;
  const approvedDeposits = Number(row.approved_deposits) || 0;
  const discountPercent = clampDiscount(Number(row.reseller_discount_percent) || 0);
  const enabled = Boolean(row.reseller_enabled);

  return {
    enabled,
    active: enabled && approvedDeposits >= minDeposit && discountPercent > 0,
    discountPercent,
    minDeposit,
    approvedDeposits,
    remainingToActivate: Math.max(minDeposit - approvedDeposits, 0),
  };
};

export const applyResellerDiscount = (
  price: number,
  profile: ResellerPricingProfile | null,
): { price: number; discountAmount: number } => {
  if (!profile?.active) return { price, discountAmount: 0 };

  const discountAmount = parseFloat(
    (price * (profile.discountPercent / 100)).toFixed(2),
  );
  return {
    price: Math.max(parseFloat((price - discountAmount).toFixed(2)), 0.01),
    discountAmount,
  };
};
