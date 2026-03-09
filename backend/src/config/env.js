const dotenv = require("dotenv");

dotenv.config();

if (!process.env.MONGODB_URI) {
  throw new Error("Missing required environment variable: MONGODB_URI");
}

module.exports = {
  port: Number(process.env.PORT || 3001),
  mongodbUri: process.env.MONGODB_URI,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
