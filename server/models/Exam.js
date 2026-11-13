import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      validate: [
        (val) => Array.isArray(val) && val.length === 4,
        'Question must have exactly 4 options',
      ],
      required: true,
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

const ExamSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    institute: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    examCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 360,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    requireFullscreen: {
      type: Boolean,
      default: true,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    questions: [QuestionSchema],
  },
  {
    timestamps: true,
  }
);

ExamSchema.index({ teacherId: 1, createdAt: -1 });

export const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
