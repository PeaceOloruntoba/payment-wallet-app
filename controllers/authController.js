import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import generateUniqueID from "../utils/generateUniqueID.js";
import { rapydRequest } from "../utils/rapyd.js"; // Import the utility

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { name, email, phone, password, currency, country } /* Added country */ =
    req.body;

  if (!name || !email || !password || !currency || !country) {
    // Added country validation
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const accountNumber = generateUniqueID();

  try {
    // 1. Create Rapyd Wallet
    const walletResponse = await rapydRequest("post", "/v1/wallets", {
      customer: {
        // Rapyd customer object
        name: name,
        email: email,
        metadata: {
          // Store user ID for linking
          userId: "pending", // We'll update this later with the Mongoose ID
        },
      },
      currency,
    });

    if (walletResponse.status?.status !== "SUCCESS") {
      throw new Error(
        walletResponse.status?.error_message || "Failed to create Rapyd wallet"
      );
    }

    const rapydWalletId = walletResponse.data.id;

    // 2. Create User in Database
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      currency,
      accountNumber,
      rapydWalletId, // Store Rapyd Wallet ID
      country, // Store country
    });

    //Update the user metadata in rapyd
    const metadataResponse = await rapydRequest(
      "post",
      `/v1/wallets/${rapydWalletId}/metadata`,
      {
        metadata: {
          userId: user._id.toString(), // Store Mongoose ID in Rapyd wallet
        },
      }
    );
    if (metadataResponse.status?.status !== "SUCCESS") {
      throw new Error(
        metadataResponse.status?.error_message ||
          "Failed to update Rapyd wallet metadata"
      );
    }

    // 3. Send Response
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      currency: user.currency,
      accountNumber: user.accountNumber,
      token: generateToken(user._id),
      rapydWalletId: user.rapydWalletId,
    });
  } catch (error) {
    // 4. Handle Errors
    console.error("Registration Error:", error);
    res.status(500).json({ message: error.message || "Registration failed" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      currency: user.currency,
      accountNumber: user.accountNumber,
      walletBalance: user.walletBalance,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};
