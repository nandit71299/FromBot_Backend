import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import authMiddleware from "./middlewares/AuthMiddleware.js";
dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.send("Hello World!");
});
app.get("/authCheck", authMiddleware, (req, res) => {
  return res.send("Authorized");
});
app.use("/api/auth", authRoutes);
app.use("/api/folder", folderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
