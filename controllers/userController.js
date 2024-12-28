import express from "express";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Workspace from "../models/workSpace.js";

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }

    // Find the user by email and populate workspaceId and sharedWorkspaces
    const user = await User.findOne({ email })
      .populate("workspaceId") // Populate the user's primary workspace
      .populate("sharedWorkspaces"); // Populate the shared workspaces

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Compare the provided password with the stored password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, email: user.email }, // Use an object for the payload
      process.env.JWT_SECRET,
      {
        expiresIn: "1h", // Token expiration time
      }
    );

    // Fetch the workspaceName and _id for the user's primary workspace
    const userWorkspace = user.workspaceId
      ? {
          _id: user.workspaceId._id,
          workspaceName: user.workspaceId.workspaceName,
        }
      : null;

    // Fetch the workspaceName and _id for all the shared workspaces
    const sharedWorkspaces = user.sharedWorkspaces.map((workspace) => ({
      _id: workspace._id,
      workspaceName: workspace.workspaceName,
    }));

    // Combine the user's own workspace and shared workspaces into the workspaces array
    const workspaces = userWorkspace
      ? [userWorkspace, ...sharedWorkspaces]
      : sharedWorkspaces;

    // Respond with the login success, user info, and additional workspace data
    if (token) {
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          workspaces, // Only include workspaces here
          theme: user.theme,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
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
    const newWorkSpace = new Workspace({
      workspaceName: `${username}'s Workspace`,
      folders: [],
      forms: [],
      createdBy: newUser._id,
    });
    newUser.workspaceId = newWorkSpace._id;
    await newUser.save();
    await newWorkSpace.save();

    return res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, email, password } = req.body;

    // Update the user's profile (including email)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, password },
      { new: true } // Ensure we get the updated user object
    );

    // If the user doesn't exist or can't be updated, return an error
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Create a new JWT with the updated user details (new email)
    const payload = { _id: updatedUser._id, email: updatedUser.email };
    const secretKey = process.env.JWT_SECRET_KEY; // Or wherever your secret is stored
    const newToken = jwt.sign(payload, secretKey, { expiresIn: "1h" }); // Token expiry time can be adjusted

    // Send the updated user and new token to the frontend
    return res.json({
      success: true,
      user: updatedUser,
      token: newToken, // Send the new token to the client
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("workspaceId") // Populate the user's primary workspace
      .populate("sharedWorkspaces"); // Populate the shared workspaces

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Fetch the workspaceName and _id for the user's primary workspace
    const userWorkspace = user.workspaceId
      ? {
          _id: user.workspaceId._id,
          workspaceName: user.workspaceId.workspaceName,
        }
      : null;

    // Fetch the workspaceName and _id for all the shared workspaces
    const sharedWorkspaces = user.sharedWorkspaces.map((workspace) => ({
      _id: workspace._id,
      workspaceName: workspace.workspaceName,
    }));

    // Combine the user's own workspace and shared workspaces into the workspaces array
    const workspaces = userWorkspace
      ? [userWorkspace, ...sharedWorkspaces]
      : sharedWorkspaces;

    // Respond with the user details and workspace info
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        workspaces, // Include workspaces in the response
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export { login, signup, updateProfile, getUserDetails };
