const Wallet = require("../models/Wallet");
const User = require("../models/User");
const VirtualCard = require("../models/VirtualCard");

const getUserWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: `Error: ${error.message}` });
  }
};

const createWallet = async (req, res) => {
  const userId = req.user._id;

  try {
    // Check if a wallet already exists for the user
    const existingWallet = await Wallet.findOne({ userId });
    if (existingWallet) {
      return res
        .status(400)
        .json({ message: "Wallet already exists for this user" });
    }
    const wallet = await Wallet.create({ userId });
    res.status(201).json(wallet);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error creating wallet: ${error.message}` });
  }
};

const transferFunds = async (req, res) => {
  const { receiverEmail, amount } = req.body;
  const senderUserId = req.user._id;

  try {
    // Find sender and receiver wallets
    const senderWallet = await Wallet.findOne({ userId: senderUserId });
    const receiverUser = await User.findOne({ email: receiverEmail }); // Find user by email
    if (!receiverUser) {
      return res.status(404).json({ message: "Receiver user not found" });
    }
    const receiverWallet = await Wallet.findOne({ userId: receiverUser._id });

    if (!senderWallet || !receiverWallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Perform the transfer
    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    await senderWallet.save();
    await receiverWallet.save();

    res.json({ message: "Funds transferred successfully" });
  } catch (error) {
    res.status(500).json({ message: `Error: ${error.message}` });
  }
};

const createVirtualCard = async (req, res) => {
  const walletId = req.user.walletId; // Get wallet ID from the user

  try {
    // Check if a virtual card already exists for this wallet
    const existingCard = await VirtualCard.findOne({ walletId });
    if (existingCard) {
      return res
        .status(400)
        .json({ message: "Virtual card already exists for this wallet" });
    }
    // In a real application, you would generate a unique card number, expiry date, and CVV
    const newCard = await VirtualCard.create({
      walletId,
      cardNumber: "**** **** **** " + Math.floor(1000 + Math.random() * 9000), // Mocked
      expiryDate: "12/28", // Mocked
      cvv: Math.floor(100 + Math.random() * 900), // Mocked
    });
    res.status(201).json(newCard);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error creating virtual card: ${error.message}` });
  }
};

const getUserVirtualCard = async (req, res) => {
  const walletId = req.user.walletId;
  try {
    const card = await VirtualCard.findOne({ walletId });
    if (!card) {
      return res
        .status(404)
        .json({ message: "Virtual card not found for this wallet" });
    }
    res.json(card);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error retrieving virtual card: ${error.message}` });
  }
};

module.exports = {
  getUserWallet,
  createWallet,
  transferFunds,
  createVirtualCard,
  getUserVirtualCard,
};
