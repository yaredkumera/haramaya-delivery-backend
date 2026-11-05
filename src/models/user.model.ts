import { Schema, model } from "mongoose";
import type { InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    blocked: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    tokensValidFrom: { type: Date },
  },
  { timestamps: true },
);
export type User = InferSchemaType<typeof userSchema>;

export default model("User", userSchema);
