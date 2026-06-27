import { Request, Response } from "express";
import { query } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import {
  applyResellerDiscount,
  getResellerPricingProfile,
} from "../services/resellerService";

// ─── In-memory services cache ────────────────────────────────────────────────
let servicesCache: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateServicesCache = (): void => {
  servicesCache = null;
};

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  platform: string;
  description: string;
  price_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  delivery_speed: string;
  is_active: boolean;
  sort_order: number;
  provider_id: string;
  provider_service_id: number;
}

export const getAllServices = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  if (servicesCache && Date.now() < servicesCache.expiresAt) {
    res.json(servicesCache.data);
    return;
  }

  const result = await query<ServiceRow>(
    `SELECT id, name, category, platform, description,
            price_per_unit, min_quantity, max_quantity,
            delivery_speed, is_active, sort_order
     FROM services
     WHERE is_active = true
     ORDER BY sort_order ASC, platform ASC, category ASC`,
  );
  const responseData = { success: true, services: result.rows };
  servicesCache = { data: responseData, expiresAt: Date.now() + CACHE_TTL };
  res.json(responseData);
};

export const getServiceById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const result = await query<ServiceRow>(
    `SELECT id, name, category, platform, description,
            price_per_unit, min_quantity, max_quantity,
            delivery_speed, is_active, sort_order
     FROM services WHERE id = $1 AND is_active = true`,
    [id],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Service not found" });
    return;
  }
  res.json({ success: true, service: result.rows[0] });
};

export const getServicesByPlatform = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { platform } = req.params;
  const result = await query<ServiceRow>(
    `SELECT id, name, category, platform, description,
            price_per_unit, min_quantity, max_quantity,
            delivery_speed, sort_order
     FROM services
     WHERE is_active = true AND platform = $1
     ORDER BY sort_order ASC, category ASC`,
    [platform.toLowerCase()],
  );
  res.json({ success: true, services: result.rows });
};

export const calculatePrice = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { serviceId, quantity } = req.body;

  if (!serviceId || !quantity) {
    res
      .status(400)
      .json({ success: false, message: "serviceId and quantity are required" });
    return;
  }

  const result = await query<ServiceRow>(
    "SELECT price_per_unit, min_quantity, max_quantity FROM services WHERE id = $1 AND is_active = true",
    [serviceId],
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: "Service not found" });
    return;
  }

  const { price_per_unit, min_quantity, max_quantity } = result.rows[0];
  const qty = parseInt(String(quantity), 10);

  if (qty < min_quantity || qty > max_quantity) {
    res.status(400).json({
      success: false,
      message: `Quantity must be between ${min_quantity} and ${max_quantity}`,
    });
    return;
  }

  const publicPrice = parseFloat((price_per_unit * qty).toFixed(2));
  const resellerProfile = await getResellerPricingProfile(req.user?.id);
  const resellerPricing = applyResellerDiscount(publicPrice, resellerProfile);

  res.json({
    success: true,
    price: resellerPricing.price,
    publicPrice,
    pricePerUnit: price_per_unit,
    reseller:
      resellerProfile?.enabled
        ? {
            active: resellerProfile.active,
            discountPercent: resellerProfile.discountPercent,
            discountAmount: resellerPricing.discountAmount,
            minDeposit: resellerProfile.minDeposit,
            approvedDeposits: resellerProfile.approvedDeposits,
            remainingToActivate: resellerProfile.remainingToActivate,
          }
        : null,
  });
};
