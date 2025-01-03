import express from "express";
import {
  login,
  signup,
  getUserDetails,
  updateTheme,
  updateProfile,
} from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.get("/authenticate", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "User authenticated successfully",
  });
});
router.put("/update-profile", authMiddleware, updateProfile);
router.put("/change-theme", authMiddleware, updateTheme);

router.get("/getUserDetails", authMiddleware, getUserDetails);
export default router;
