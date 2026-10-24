import mongoose from "mongoose"
import connectDB from "../config/db.js"
import UserModel from "../models/user.model.js"

const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
  console.error("Usage: npx tsx src/scripts/makeAdmin.ts <email>")
  process.exit(1)
}

await connectDB()
console.log("Database:", mongoose.connection.name)

const result = await UserModel.updateOne({ email }, { role: "admin" })
console.log(result.matchedCount === 0 ? `No user found with email ${email}` : `${email} is now an admin`)

await mongoose.disconnect()