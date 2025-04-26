import mongoose from "mongoose";

const virtualCardSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true,
    unique: true,
  },
  cardNumber: { type: String, required: true, unique: true },
  expiryDate: { type: String, required: true },
  cvv: { type: String, required: true },
});

const VirtualCard = mongoose.model("VirtualCard", virtualCardSchema);
export default VirtualCard;
