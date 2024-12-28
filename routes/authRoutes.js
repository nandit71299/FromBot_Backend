import express from "express";
import {
  login,
  signup,
  getUserDetails,
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

router.get("/getUserDetails", authMiddleware, getUserDetails);
// router.post("/updateProfle", updateProfile);
export default router;
