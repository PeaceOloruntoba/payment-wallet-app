const express = require("express");
const {
  getUserWallet,
  createWallet,
  transferFunds,
  createVirtualCard,
  getUserVirtualCard,
} = require("../controllers/walletController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/my-wallet", protect, getUserWallet);
router.post("/", protect, createWallet);
router.post("/transfer", protect, transferFunds);
router.post("/card", protect, createVirtualCard);
router.get("/card", protect, getUserVirtualCard);

export default router;
