import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  foodRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  foodComments: {
    type: String,
    default: ''
  },
  serviceRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  serviceComments: {
    type: String,
    default: ''
  },
  cleanlinessRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  cleanlinessComments: {
    type: String,
    default: ''
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  overallComments: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.model("Feedback", feedbackSchema);
