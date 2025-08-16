import multer from 'multer';
import path from 'path';
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

// File filter to accept multiple media types
const fileFilter = (req, file, cb) => {
  console.log('File received in fileFilter:', file);
  if (!file) {
    console.log('No file received in fileFilter');
    return cb(new Error('No file provided'));
  }
  const mediaType = req.body.mediaType || 'image'; // Default to image if not specified
  const allowedTypes = {
    image: /jpeg|jpg|png|gif/,
    audio: /mp3|wav/,
    video: /mp4|mov/
  };
  const extname = allowedTypes[mediaType].test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes[mediaType].test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error(`Only ${mediaType} files (${allowedTypes[mediaType].source}) are allowed!`));
  }
};

// Configure Multer to use memory storage
const storageConfig = multer.memoryStorage();

const upload = multer({
  storage: storageConfig,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // Increased to 50MB for video/audio
});

// Middleware to handle Firebase upload
const uploadMiddleware = (req, res, next) => {
  console.log('Upload middleware called, body:', req.body);
  upload.single('file')(req, res, async (err) => {
    console.log('Multer processing result:', { file: req.file, error: err });
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
    if (err) {
      console.error('File filter error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      console.error('No file received after Multer processing');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const mediaType = req.body.mediaType;
      const fileBuffer = req.file.buffer;
      const storageRef = ref(storage, `${mediaType}/${Date.now()}-${req.file.originalname}`);
      await uploadBytes(storageRef, fileBuffer);
      const fileUrl = await getDownloadURL(storageRef);
      console.log('Firebase upload successful:', fileUrl);
      req.fileUrl = fileUrl; // Store URL for next middleware
      next();
    } catch (error) {
      console.error('Firebase upload error:', error);
      res.status(500).json({ error: 'Failed to upload media to Firebase' });
    }
  });
};

export default uploadMiddleware;