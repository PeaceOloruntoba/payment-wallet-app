import express from "express";
import {
  getBalance,
  deposit,
  withdraw,
  transfer,
} from "../controllers/walletController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/balance", protect, getBalance);
router.post("/deposit", protect, deposit);
router.post("/withdraw", protect, withdraw);
router.post("/transfer", protect, transfer);

export default router;
