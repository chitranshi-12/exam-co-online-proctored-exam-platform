import { verifyGoogleIdToken } from '../config/firebase.js';
import { Teacher } from '../models/Teacher.js';
import { signTeacherToken } from '../utils/token.js';

export async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID Token is required',
        code: 'MISSING_ID_TOKEN',
      });
    }

    const decoded = await verifyGoogleIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account must have an associated email address',
        code: 'EMAIL_REQUIRED',
      });
    }

    // Upsert teacher in MongoDB Atlas as strictly specified in §5
    let teacher = await Teacher.findOne({ firebaseUid: uid });
    if (!teacher) {
      teacher = await Teacher.findOne({ email });
    }

    if (teacher) {
      teacher.name = name || teacher.name;
      teacher.photo = picture || teacher.photo;
      teacher.firebaseUid = uid;
      await teacher.save();
    } else {
      teacher = await Teacher.create({
        firebaseUid: uid,
        name: name || 'Educator',
        email,
        photo: picture || '',
      });
    }

    // Sign 7-day JWT for REST and Socket.IO
    const token = signTeacherToken({
      teacherId: teacher._id.toString(),
      email: teacher.email,
    });

    res.json({
      success: true,
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        photo: teacher.photo,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({
    success: true,
    teacher: {
      id: req.teacher._id || req.teacher.id,
      name: req.teacher.name,
      email: req.teacher.email,
      photo: req.teacher.photo,
    },
  });
}
