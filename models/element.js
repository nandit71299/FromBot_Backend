import mongoose from "mongoose";

const elementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "Text",
        "Email",
        "Number",
        "Date",
        "Phone",
        "Rating",
        "Image", // Ensure "Image" is here
        "Button",
        "Text_Bubble",
      ],
      required: true,
    },
    id: { type: String, required: true },
    formId: { type: String, required: true },
    label: { type: String }, // For displaying the element label
    options: [{ type: String }], // Optional for dropdowns or radio buttons
    required: { type: Boolean, default: false }, // Whether the field is mandatory
    placeholder: { type: String }, // Placeholder text for input fields
    value: { type: String }, // Current value of the element, for pre-filling or editing forms
    link: { type: String, required: false }, // Add the link field for Image elements
  },
  { timestamps: true }
);

const Element = mongoose.model("Element", elementSchema);

export default Element;
