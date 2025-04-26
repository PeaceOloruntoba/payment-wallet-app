import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import generateUniqueID from "../utils/generateUniqueID.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { name, email, phone, password, currency } = req.body;

  if (!name || !email || !password || !currency) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const accountNumber = generateUniqueID();

  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    currency,
    accountNumber,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      currency: user.currency,
      accountNumber: user.accountNumber,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
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
