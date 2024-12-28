import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import User from "./models/user.js";
import authMiddleware from "./middlewares/authMiddleware.js";

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
  return res.send("Hello World!");
});
app.get("/authCheck", authMiddleware, (req, res) => {
  return res.send("Authorized");
});
app.use("/api/auth", authRoutes);
app.use("/api/folder", folderRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/workspace", workspaceRoutes);
app.put("/api/theme/:theme", authMiddleware, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
