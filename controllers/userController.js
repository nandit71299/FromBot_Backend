import express from "express";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(user.email, process.env.JWT_SECRET);
    if (token)
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user,
      });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, message: "Internal Server Error" });
  }
};
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: username, email, and password",
      });
    }
    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS)
    );

    const newUser = new User({ username, email, password: hashedPassword });

    await newUser.save();

    return res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export { login, signup };
