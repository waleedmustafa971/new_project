import multer from 'multer';
import path from 'path';

/*
  The general-purpose disk uploader.

  Three things were wrong with the original and all three are fixed here:

    - The filename was `Date.now() + '-' + file.originalname`, and multer joins
      that onto the destination directory verbatim. A name containing `../`
      therefore wrote outside `uploads/`. Only the extension is taken from the
      client now, and it is whitelisted; the name itself is generated.

    - There was no fileFilter, so any file type could be uploaded. `uploads/`
      is served statically at /uploads, which means an uploaded .html or .svg
      would run as script on this origin — the same origin the admin panel is
      served from.

    - There was no size limit, so a single request could fill the disk. That is
      not hypothetical here: a full disk is what killed the database on 19 Aug.

  Limits match middleware/multerConfig.js so the two uploaders behave the same.
*/

const MAX_BYTES = 100 * 1024 * 1024; // 100MB, matches multerConfig.js

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['video/mp4', '.mp4'],
  ['video/quicktime', '.mov'],
  ['audio/mpeg', '.mp3'],
  ['audio/mp4', '.m4a'],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    /*
      Generated, never client-supplied. The extension is taken from the mime
      type the filter already vetted rather than from the name, so a file
      called `x.php.png` cannot land with a `.php` on the end.
    */
    const ext = ALLOWED.get(file.mimetype) || path.extname(file.originalname).toLowerCase().slice(0, 10);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 10 },
  fileFilter,
});

export default upload;
