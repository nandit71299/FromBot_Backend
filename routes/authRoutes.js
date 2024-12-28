import express from "express";
import {
  login,
  signup,
  getUserDetails,
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import User from "../models/user.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/authenticate", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "User authenticated successfully",
  });
});
router.put("/:theme", async (req, res) => {
  try {
    const { theme } = req.params;

    // Check if the theme is either "dark" or "light"
    if (theme !== "dark" && theme !== "light") {
      return res.status(400).json({ success: false, message: "Invalid theme" });
    }

    // Check if theme is provided
    if (!theme) {
      return res
        .status(400)
        .json({ success: false, message: "Theme is required" });
    }

    // Find and update the user's theme in the database
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { theme },
      { new: true }
    ).select("theme");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Return the updated user with the new theme
    return res.json({
      success: true,
      message: "Theme updated successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/getUserDetails", authMiddleware, getUserDetails);
// router.post("/updateProfle", updateProfile);
export default router;
