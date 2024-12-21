import mongoose from "mongoose";

const elementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "email", "number", "date", "phone", "rating", "image"],
      required: true,
    },
    label: { type: String, required: true },
    options: [{ type: String }],
    required: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Element = mongoose.model("Element", elementSchema);

export default Element;
