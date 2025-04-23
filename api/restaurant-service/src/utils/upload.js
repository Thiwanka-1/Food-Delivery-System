// backend/restaurant-service/src/utils/upload.js
import multer from "multer";
import multerS3 from "multer-s3-v3";
import s3 from "./s3Config.js";

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "public-read", // Allows public access to images
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      // Create a unique file name using the current timestamp
      cb(null, `${Date.now().toString()}-${file.originalname}`);
    },
  }),
});

export default upload;
