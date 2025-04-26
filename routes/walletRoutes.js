import express from "express";
import {
  getBalance,
  deposit,
  withdraw,
  startDeposit,
  rapydWebhook,
  transferMoney,
} from "../controllers/walletController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/balance", protect, getBalance);
router.post("/deposit", protect, deposit);
router.post("/deposit/start", protect, startDeposit);
router.post("/withdraw", protect, withdraw);
router.post("/transfer", protect, transferMoney);

router.post("/webhook", express.raw({ type: "*/*" }), rapydWebhook);

export default router;
