import mongoose from 'mongoose';

const ViolationSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'tab_switch',
        'window_blur',
        'offline',
        'online_restored',
        'fullscreen_exit',
        'screen_share_stopped',
        'copy',
        'paste',
        'cut',
        'right_click',
        'print_screen',
        'devtools',
        'no_face',
        'multiple_faces',
        'audio_noise',
        'multiple_voices',
      ],
      required: true,
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
      default: '',
    },
    screenshotFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    webcamFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ViolationSchema.index({ examId: 1, occurredAt: -1 });
ViolationSchema.index({ attemptId: 1, occurredAt: -1 });

export const Violation = mongoose.models.Violation || mongoose.model('Violation', ViolationSchema);
