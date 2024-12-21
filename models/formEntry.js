import mongoose from "mongoose";

const formEntrySchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    responses: [
      {
        elementId: { type: mongoose.Schema.Types.ObjectId, ref: "Element" },
        response: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const FormEntry = mongoose.model("FormEntry", formEntrySchema);

export default FormEntry;
