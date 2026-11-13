import mongoose from 'mongoose';

const StudentAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    institute: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    startedAt: {
      type: Date,
    },
    deadlineAt: {
      type: Date,
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'submitted', 'auto_submitted'],
      default: 'enrolled',
      index: true,
    },
    answers: [StudentAnswerSchema],
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: true,
      index: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    violationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound indexes as strictly mandated in §6:
AttemptSchema.index({ examId: 1, rollNo: 1 }, { unique: true });
AttemptSchema.index({ examId: 1, email: 1 }, { unique: true });

export const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);
