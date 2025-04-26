import express from "express";
import {
  getBalance,
  withdraw,
  startDeposit,
  rapydWebhook,
  transferMoney,
  createVirtualCard,
  getVirtualCardDetails,
} from "../controllers/walletController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/balance", protect, getBalance);
router.post("/deposit", protect, startDeposit);
router.post("/withdraw", protect, withdraw);
router.post("/transfer", protect, transferMoney);
router.post("/webhook", express.raw({ type: "*/*" }), rapydWebhook);

// Virtual Card Routes
router.post("/virtual-card", protect, createVirtualCard);
router.get("/virtual-card/:cardId", protect, getVirtualCardDetails);

export default router;
