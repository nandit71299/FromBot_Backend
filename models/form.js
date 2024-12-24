import mongoose from "mongoose";
const formSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    formName: { type: String, required: true },
    elements: [
      {
        type: {
          type: String,
          enum: ["text", "email", "number", "date", "phone", "rating", "image"],
          required: true,
        },
        label: { type: String, required: true },
        options: { type: [String], default: [] },
        required: { type: Boolean, default: false },
      },
    ],

    viewCount: { type: Number, default: 0 },
    startCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);

export default Form;
