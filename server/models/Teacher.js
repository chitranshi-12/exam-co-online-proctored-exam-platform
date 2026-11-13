import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    photo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
