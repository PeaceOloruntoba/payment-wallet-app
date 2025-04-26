import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { rapydRequest } from "../utils/rapyd.js";
import { v4 as uuidv4 } from 'uuid';

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

// @desc    Withdraw Money from Wallet to Local Bank
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdraw = async (req, res) => {
    const { amount, bankAccountNumber, bankCode, beneficiaryName } = req.body;
    // bankAccountNumber is the account number
    // bankCode is the bank identifier (e.g., routing number, sort code)

    if (!amount || amount <= 0 || !bankAccountNumber || !bankCode || !beneficiaryName) {
        return res.status(400).json({ message: "Invalid withdrawal request" });
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        const idempotencyKey = uuidv4();

        // 1. Log the Transaction Initiation
        const transaction = await Transaction.create({
            type: "withdraw",
            sender: user._id, // User is the sender
            amount: amount,
            currency: user.currency,
            status: "pending",
            reference: idempotencyKey,
        });

        // 2. Create Bank Account (if it doesn't exist) or use existing.  For simplicity, we create a new one every time in this example.  In production, you'd want to store and reuse bank account details.
        const bankAccountResponse = await rapydRequest("post", "/v1/bankaccounts/GB", { //  GB is just an example,  get this from user.country.
            account_number: bankAccountNumber,
            bank_code: bankCode,
            holder_name: beneficiaryName,
            currency: user.currency, // Use user's currency
        });

        if (bankAccountResponse.status?.status !== "SUCCESS") {
          await Transaction.findByIdAndUpdate(transaction._id, {
                status: "failed",
                rapydResponse: bankAccountResponse,
            });
            throw new Error(bankAccountResponse.status?.error_message || "Failed to create bank account");
        }
        const rapydBankAccountId = bankAccountResponse.data.id;

        // 3. Create a beneficiary
        const beneficiaryResponse = await rapydRequest("post", "/v1/beneficiaries", {
            name: beneficiaryName,
            email: user.email, // Use user email.
            country: "GB",  // GB is example,  get country from user
            type: "person",
            requested_capabilities: ["payout"],
            payout_method_type: "gb_bank_account", // Example, get from country and bank
            bank_account: {
                id: rapydBankAccountId
            }
        });

        if (beneficiaryResponse.status?.status !== "SUCCESS") {
          await Transaction.findByIdAndUpdate(transaction._id, {
                status: "failed",
                rapydResponse: beneficiaryResponse,
            });
            throw new Error(beneficiaryResponse.status?.error_message || "Failed to create beneficiary");
        }
        const rapydBeneficiaryId = beneficiaryResponse.data.id;


        // 4. Initiate the Payout
        const payoutResponse = await rapydRequest("post", "/v1/payouts", {
            amount: amount,
            currency: user.currency,
            beneficiary: rapydBeneficiaryId,
            payout_method: "gb_bank_account", // Example, get from country and bank
            sender_name: user.name,
            sender_address: "N/A", //  Provide a valid address
            sender_country: "GB", // Get from user
            metadata: {
                userId: user._id.toString(),  // Store Mongoose ID
                transactionId: transaction._id.toString(), // Link to our transaction
            },
            idempotency_key: idempotencyKey,
        });

        if (payoutResponse.status?.status !== "SUCCESS") {
            await Transaction.findByIdAndUpdate(transaction._id, {
                status: "failed",
                rapydResponse: payoutResponse, // Store the Rapyd response
            });
            throw new Error(payoutResponse.status?.error_message || "Payout failed");
        }

        // 5. Update User Balance and Transaction Status (after successful payout initiation)
        user.walletBalance -= amount;
        await user.save();

        await Transaction.findByIdAndUpdate(transaction._id, {
            status: "success",  //  Payout initiated.  Status might change via webhook.
            rapydResponse: payoutResponse,
        });

        res.status(200).json({ message: "Withdrawal initiated successfully", payoutId: payoutResponse.data.id }); // Return payout ID

    } catch (error) {
        console.error("Withdrawal Error:", error);
        res.status(500).json({ message: error.message || "Withdrawal failed" });
    }
};

// @desc    Transfer Money to another User by Account Number
// @route   POST /api/wallet/transfer
// @access  Private
export const transferMoney = async (req, res) => {
  const { recipientAccountNumber, amount } = req.body;

  if (!recipientAccountNumber || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer data" });
  }

  try {
    const sender = await User.findById(req.user._id);

    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    if (sender.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const recipient = await User.findOne({ accountNumber: recipientAccountNumber });

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (!sender.rapydWalletId || !recipient.rapydWalletId) {
      return res.status(400).json({
        message: "Sender or recipient does not have a Rapyd wallet.",
      });
    }

    // Currency Handling:  Check if currencies match
    if (sender.currency !== recipient.currency) {
      return res.status(400).json({
        message: "Currencies do not match.  Cross-currency transfers not supported.",
      });
    }
    const transferCurrency = sender.currency; //redundant but clearer

    const idempotencyKey = uuidv4(); // Generate unique ID

    // 1. Log the Transaction Initiation
    const transaction = await Transaction.create({
      type: "transfer",
      sender: sender._id,
      recipient: recipient._id,
      amount: amount,
      currency: transferCurrency,
      status: "pending", // Initial status
      reference: idempotencyKey, // Store idempotency key
    });

    // 2. Create the Rapyd Transfer
    const transferResponse = await rapydRequest("post", "/v1/transfers", {
      amount: amount,
      currency: transferCurrency,
      source_wallet_id: sender.rapydWalletId,
      destination_wallet_id: recipient.rapydWalletId,
      metadata: {
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        transactionId: transaction._id.toString(), // Link to our transaction
      },
      idempotency_key: idempotencyKey, // Use the generated key
    });

    if (transferResponse.status?.status !== "SUCCESS") {
      // Handle Rapyd transfer failure
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: "failed",
        rapydResponse: transferResponse, // Store Rapyd response
      });
      throw new Error(
        transferResponse.status?.error_message || "Rapyd transfer failed"
      );
    }

    // 3. Update Balances and Transaction Status (after successful Rapyd transfer)
    sender.walletBalance -= amount;
    recipient.walletBalance += amount;
    await sender.save();
    await recipient.save();

    await Transaction.findByIdAndUpdate(transaction._id, {
      status: "success",
      rapydResponse: transferResponse, // Store Rapyd response
    });

    res.status(200).json({ message: "Transfer successful" });
  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({ message: error.message || "Transfer failed" });
  }
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
      complete_checkout_url:
        "https://payment-wallet-app.vercel.app/deposit/success", // after successful payment
      cancel_checkout_url:
        "https://payment-wallet-app.vercel.app/deposit/cancel", // if cancelled
      error_checkout_url: "https://payment-wallet-app.vercel.app/deposit/error", // if error
      merchant_reference_id: user._id.toString(),
      language: "en",
    });

    return res.json({ checkout: response.data });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to start deposit" });
  }
};

// @desc  Handle Rapyd Webhooks
// @route POST /api/wallet/webhook
export const rapydWebhook = async (req, res) => {
  const secret = process.env.RAPYD_SECRET_KEY;

  const signature = req.headers["signature"];
  const salt = req.headers["salt"];
  const timestamp = req.headers["timestamp"];

  const rawBody = req.body.toString("utf8");

  // Create the string Rapyd expects
  const toSign = `${req.method.toLowerCase()}${req.originalUrl}${salt}${timestamp}${process.env.RAPYD_ACCESS_KEY}${secret}${rawBody}`;
  const expectedSignature = Buffer.from(
    crypto.createHmac("sha256", secret).update(toSign).digest("hex")
  ).toString("base64");

  if (expectedSignature !== signature) {
    console.error("Invalid webhook signature!");
    return res.status(403).send("Invalid signature");
  }

  try {
    const event = JSON.parse(rawBody);
    console.log("Received Rapyd Webhook:", event); // Log the entire event for debugging

    switch (event.type) {
      case "PAYMENT_COMPLETED":
        await handlePaymentCompleted(event.data);
        break;
      case "TRANSFER_COMPLETED":
        await handleTransferCompleted(event.data);
        break;
      case "TRANSFER_FAILED":
        await handleTransferFailed(event.data);
        break;
      case "PAYOUT_COMPLETED": // Add Payout completed
        await handlePayoutCompleted(event.data);
        break;
      case "PAYOUT_FAILED":  // Add Payout Failed
        await handlePayoutFailed(event.data);
        break;
      default:
        console.log("Unhandled Rapyd webhook event type:", event.type);
        res.status(200).send("Event ignored");
    }

    res.status(200).send("Webhook received and processed");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Webhook processing failed");
  }
};

// --- Helper Functions ---
const handlePaymentCompleted = async (data) => {
  const { merchant_reference_id, amount, currency } = data;

  const user = await User.findById(merchant_reference_id);
  if (!user) {
    console.error("User not found for PAYMENT_COMPLETED webhook:", merchant_reference_id);
    return; // Don't throw, just log and return to avoid crashing the whole webhook process
  }

  // Update wallet
  user.walletBalance += amount;
  await user.save();

  // Update Transaction
  const transaction = await Transaction.findOne({ reference: merchant_reference_id }); // Assuming reference is merchant_reference_id
  if (transaction) {
    await transaction.updateOne({ status: "success", rapydResponse: data });
  }

  console.log(`Wallet funded for user ${user._id}: +${amount} ${currency}`);
};

const handleTransferCompleted = async (data) => {
  const { metadata } = data;
  const { transactionId } = metadata;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    console.error("Transaction not found for TRANSFER_COMPLETED webhook:", transactionId);
    return;
  }

  await transaction.updateOne({ status: "success", rapydResponse: data });
  console.log(`Transfer completed for transaction: ${transactionId}`);
};

const handleTransferFailed = async (data) => {
  const { metadata } = data;
  const { transactionId } = metadata;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    console.error("Transaction not found for TRANSFER_FAILED webhook:", transactionId);
    return;
  }

  await transaction.updateOne({ status: "failed", rapydResponse: data });
  console.log(`Transfer failed for transaction: ${transactionId}`);
};

const handlePayoutCompleted = async (data) => {
    const { metadata } = data;
    const { transactionId } = metadata;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
        console.error("Transaction not found for PAYOUT_COMPLETED", transactionId);
        return;
    }
    await transaction.updateOne({status: "success", rapydResponse: data});
    console.log(`Payout Completed for transaction: ${transactionId}`);
}

const handlePayoutFailed = async (data) => {
    const { metadata } = data;
    const { transactionId } = metadata;

     const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        console.error("Transaction not found for PAYOUT_FAILED webhook:", transactionId);
        return;
      }

    await transaction.updateOne({status: "failed", rapydResponse: data});
     console.log(`Payout Failed for transaction: ${transactionId}`);
}

// @desc    Create a virtual card for a user's wallet
// @route   POST /api/wallet/virtual-card
// @access  Private
export const createVirtualCard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.rapydWalletId) {
      return res.status(400).json({ message: "User does not have a Rapyd wallet" });
    }

    // 1. Create the virtual card using Rapyd API
    const cardResponse = await rapydRequest("post", "/v1/cards/virtual", {
      wallet: user.rapydWalletId,
      currency: user.currency, // Use user's currency
      metadata: {
        userId: user._id.toString(), // Store Mongoose ID
      },
    });

    if (cardResponse.status?.status !== "SUCCESS") {
      throw new Error(
        cardResponse.status?.error_message ||
          "Failed to create virtual card"
      );
    }

    const virtualCard = cardResponse.data;
    const cardId = virtualCard.id;

    // 2. Store the cardId in the User model
    user.virtualCardId = cardId; // Store the Rapyd card ID
    await user.save();

    // 3. Return the virtual card details to the client.
    res.status(201).json({
      message: "Virtual card created successfully",
      cardId: cardId, // Return the Rapyd card ID.
    });
  } catch (error) {
    console.error("Create Virtual Card Error:", error);
    res.status(500).json({
      message: error.message || "Failed to create virtual card",
    });
  }
};

// @desc    Get a virtual card details.  This should be called only when you need to display the card number, CVV, etc. to the user, and you should follow Rapyd's security guidelines.
// @route   GET /api/wallet/virtual-card/:cardId
// @access  Private
export const getVirtualCardDetails = async (req, res) => {
  const { cardId } = req.params;

  try {
    const user = await User.findById(req.user._id);
     if (!user) {
            return res.status(404).json({ message: "User not found" });
     }

    // 1.  Call Rapyd to get the card details.
    const cardDetailsResponse = await rapydRequest("get", `/v1/cards/virtual/${cardId}`);

    if (cardDetailsResponse.status?.status !== "SUCCESS") {
      throw new Error(
        cardDetailsResponse.status?.error_message ||
          "Failed to retrieve virtual card details"
      );
    }
    const cardDetails = cardDetailsResponse.data;

    // 2.  Return the card details.  Be very careful how you handle this data.
    res.status(200).json({
      cardNumber: cardDetails.number,
      expiryDate: cardDetails.expiry_date,
      cvv: cardDetails.cvv,
    });
  } catch (error) {
    console.error("Get Virtual Card Details Error", error);
    res.status(500).json({
      message: error.message || "Failed to retrieve virtual card details",
    });
  }
};
