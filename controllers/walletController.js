import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { rapydRequest } from "../utils/rapyd.js";

// @desc    Get My Wallet Balance
// @route   GET /api/wallet/balance
// @access  Private
export const getBalance = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ walletBalance: user.walletBalance, currency: user.currency });
};

// @desc    Deposit Money into Wallet
// @route   POST /api/wallet/deposit
// @access  Private
export const deposit = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid deposit amount" });
  }

  const user = await User.findById(req.user._id);

  user.walletBalance += amount;
  await user.save();

  await Transaction.create({
    type: "deposit",
    amount,
    receiver: user._id,
  });

  res.json({
    message: "Deposit successful",
    walletBalance: user.walletBalance,
  });
};

// @desc    Withdraw Money from Wallet
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdraw = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid withdraw amount" });
  }

  const user = await User.findById(req.user._id);

  if (user.walletBalance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  user.walletBalance -= amount;
  await user.save();

  await Transaction.create({
    type: "withdraw",
    amount,
    sender: user._id,
  });

  res.json({
    message: "Withdraw successful",
    walletBalance: user.walletBalance,
  });
};

// @desc    Transfer Money to another User by Account Number
// @route   POST /api/wallet/transfer
// @access  Private
export const transfer = async (req, res) => {
  const { accountNumber, amount } = req.body;

  if (!accountNumber || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer details" });
  }

  const sender = await User.findById(req.user._id);
  const receiver = await User.findOne({ accountNumber });

  if (!receiver) {
    return res.status(404).json({ message: "Receiver not found" });
  }

  if (sender.walletBalance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  sender.walletBalance -= amount;
  receiver.walletBalance += amount;

  await sender.save();
  await receiver.save();

  await Transaction.create({
    type: "transfer",
    amount,
    sender: sender._id,
    receiver: receiver._id,
  });

  res.json({
    message: "Transfer successful",
    senderBalance: sender.walletBalance,
  });
};

// @desc    Initiate Local Bank Deposit
// @route   POST /api/wallet/deposit/start
// @access  Private
export const startDeposit = async (req, res) => {
  const { amount, currency } = req.body;

  if (!amount || amount <= 0 || !currency) {
    return res.status(400).json({ message: "Invalid deposit request" });
  }

  try {
    const user = await User.findById(req.user._id);

    const response = await rapydRequest("post", "/v1/checkout", {
      amount,
      country: user.country, // user's saved country like 'NG' for Nigeria
      currency,
      complete_checkout_url: "https://yourfrontend.com/deposit-success", // after successful payment
      cancel_checkout_url: "https://yourfrontend.com/deposit-cancel", // if cancelled
      error_checkout_url: "https://yourfrontend.com/deposit-error", // if error
      merchant_reference_id: user._id.toString(),
      language: "en",
    });

    return res.json({ checkout: response.data });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to start deposit" });
  }
};
