import path from "path"
import multer from "multer"

// Multer
const storage = multer.diskStorage({
    destination: (rew, res, cb) => {
       cb(null, path.join(__dirname, "../public/uploads/re-image"));
    },
    filname: (req, res, cb) => {
       cb(null, Date.now() + "-" + file.originalname)
    }
})

export default storage;
