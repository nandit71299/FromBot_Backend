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
app.use("/api/theme", authMiddleware, authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
