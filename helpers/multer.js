import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, "../public/uploads");

        const profilePicsDir = path.join(uploadsDir, 'profile-pics');

        fs.mkdirSync(profilePicsDir, { recursive: true }); 
        cb(null, profilePicsDir); 

        fs.mkdirSync(uploadsDir, { recursive: true });
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

export default storage;

