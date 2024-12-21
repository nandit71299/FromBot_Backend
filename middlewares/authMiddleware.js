import jwt from "jsonwebtoken";

// Middleware to check if user is authenticated
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.header("Authorization");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Your JWT_SECRET should be stored in .env
    if (!decoded) {
      return res.status(401).json({ message: "Token is invalid or expired" });
    }

    // Attach user to the request object (you can use it for checking permissions)
    req.user = decoded;

    next(); // Allow the request to continue to the next middleware/route handler
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export default authMiddleware;
