import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowedFormats: ['jpg', 'jpeg', 'png'],
  },
});

const upload = multer({ storage });

const uploadImages = upload.fields([
  { name: 'sharedImages', maxCount: 10 },
  { name: 'variantImages_0', maxCount: 10 },
  { name: 'variantImages_1', maxCount: 10 },
  { name: 'variantImages_2', maxCount: 10 },
  { name: 'variantImages_3', maxCount: 10 },
  { name: 'variantImages_4', maxCount: 10 },
  { name: 'variantImages_5', maxCount: 10 },
  { name: 'variantImages_6', maxCount: 10 },
  { name: 'variantImages_7', maxCount: 10 },
  { name: 'variantImages_8', maxCount: 10 },

]);

export { upload, uploadImages, cloudinary };