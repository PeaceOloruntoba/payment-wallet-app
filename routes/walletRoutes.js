import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createVirtualCard,
  createWallet,
  getUserVirtualCard,
  getUserWallet,
  transferFunds,
} from "../controllers/walletController.js";

const router = express.Router();

router.get("/my-wallet", protect, getUserWallet);
router.post("/", protect, createWallet);
router.post("/transfer", protect, transferFunds);
router.post("/card", protect, createVirtualCard);
router.get("/card", protect, getUserVirtualCard);

export default router;
