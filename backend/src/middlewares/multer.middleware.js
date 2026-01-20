import {v2 as cloudinary} from 'cloudinary';
import multer from 'multer';
import {CloudinaryStorage} from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder: 'project_task', 
        resource_type: "auto", 
    }
}
)

export const multerMiddleware = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
 });


