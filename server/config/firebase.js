import admin from 'firebase-admin';

let isFirebaseAdminInitialized = false;

export function initializeFirebaseAdmin() {
  if (isFirebaseAdminInitialized) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin credentials not provided in .env. Real Google token verification will be mocked.');
    return null;
  }

  // Handle escaped newlines in environment variable
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isFirebaseAdminInitialized = true;
    console.log('✅ Firebase Admin SDK initialized for Teacher Auth verification.');
    return admin;
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    return null;
  }
}

export async function verifyGoogleIdToken(idToken) {
  // If in local sandbox without Firebase keys, allow demo bypass for testing
  if (!process.env.FIREBASE_PROJECT_ID) {
    return {
      uid: 'demo_teacher_vance',
      name: 'Dr. Eleanor Vance',
      email: 'e.vance@stanford.edu',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleanor&backgroundColor=b6e3f4',
    };
  }

  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin SDK is not configured');
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken;
}
