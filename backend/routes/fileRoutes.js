

const express = require('express');
const multer = require('multer');
const File = require('../models/File'); // Import the model here

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  const { collectionName, admin } = req.body;

  if (!collectionName) {
    return res.status(400).json({ message: 'Collection name is required' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const fileRecord = new File({ collectionName, admin, status: 'success' });
    await fileRecord.save();
    res.json({ message: 'File uploaded successfully', success: true });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Error processing file' });
  }
});


module.exports = router;
