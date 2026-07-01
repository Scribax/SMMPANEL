import { Router } from "express";
import { getPublicPromotions } from "../controllers/promotionController";

const router = Router();

router.get("/", getPublicPromotions);

export default router;
