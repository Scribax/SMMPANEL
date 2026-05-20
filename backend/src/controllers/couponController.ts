import { Request, Response } from 'express';
import { query } from '../config/database';

interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400).json({ success: false, message: 'Coupon code is required' });
    return;
  }

  const result = await query<CouponRow>(
    `SELECT id, code, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at
     FROM coupons
     WHERE UPPER(code) = UPPER($1) AND is_active = true`,
    [code]
  );

  if (!result.rows.length) {
    res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    return;
  }

  const coupon = result.rows[0];

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    res.status(400).json({ success: false, message: 'This coupon has expired' });
    return;
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    return;
  }

  if (orderAmount && parseFloat(String(orderAmount)) < coupon.min_order_value) {
    res.status(400).json({
      success: false,
      message: `Minimum order value for this coupon is R$ ${coupon.min_order_value.toFixed(2)}`,
    });
    return;
  }

  let discountAmount = 0;
  const amount = parseFloat(String(orderAmount ?? 0));

  if (coupon.discount_type === 'percentage') {
    discountAmount = amount * (coupon.discount_value / 100);
  } else {
    discountAmount = coupon.discount_value;
  }

  res.json({
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
    },
  });
};
