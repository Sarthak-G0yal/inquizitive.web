import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config(); // Load the .env file

const token = jwt.sign(
  { email: "organizer1@example.com" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

console.log(token);
