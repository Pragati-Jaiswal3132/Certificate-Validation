
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const File = require('../models/File'); // Adjust path as necessary

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const file = req.file;
    const { collectionName, admin } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!collectionName) {
      return res.status(400).json({ message: 'No collection name provided' });
    }

    if (!admin) {
      return res.status(400).json({ message: 'Admin name is required' });
    }

    console.log('Saving file record with admin:', admin);

    const fileExtension = file.originalname.split('.').pop();
    if (fileExtension !== 'xlsx') {
      return res.status(400).json({ message: 'Unsupported file format. Only Excel files are allowed.' });
    }

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log('Parsed data:', sheetData);

    const requiredHeaders = ['Certificate ID', 'Student Name', 'Internship Domain', 'Starting Date', 'Ending Date'];
    const fileHeaders = Object.keys(sheetData[0]).map(header => header.trim().toLowerCase());
    const missingHeaders = requiredHeaders.map(header => header.toLowerCase()).filter(header => !fileHeaders.includes(header));

    if (missingHeaders.length > 0) {
      return res.status(400).json({ message: `The uploaded file does not have the required headers: ${missingHeaders.join(', ')}` });
    }

    const students = sheetData.map((data, index) => {
      const startDate = new Date(data['Starting Date']);
      const endDate = new Date(data['Ending Date']);

      if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error(`Date format is incorrect in row ${index + 1}. Expected YYYY-MM-DD.`);
      }

      return {
        certificateId: data['Certificate ID'],
        name: data['Student Name'],
        internshipDomain: data['Internship Domain'],
        startDate: startDate,
        endDate: endDate,
      };
    });

    console.log('Students data:', students);

    const certificateIds = students.map(student => student.certificateId);
    const uniqueCertificateIds = new Set(certificateIds);
    if (uniqueCertificateIds.size !== certificateIds.length) {
      return res.status(400).json({ message: 'Duplicate Certificate IDs found in the file.' });
    }

    const StudentSchema = new mongoose.Schema({
      certificateId: { type: String, required: true },
      name: { type: String, required: true },
      internshipDomain: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    });

    const StudentModel = mongoose.model(collectionName, StudentSchema);

    await StudentModel.deleteMany(); // Optionally clear existing data
    await StudentModel.insertMany(students);

    const fileRecord = new File({ collectionName, admin, status: 'success', rows: students });
    await fileRecord.save();

    res.status(200).json({ message: 'File uploaded and data saved successfully' });
  } catch (error) {
    console.error('Error processing file:', error.message);

    if (req.body.collectionName && req.body.admin) {
      const fileRecord = new File({ admin: req.body.admin, collectionName: req.body.collectionName, status: 'failed' });
      await fileRecord.save();
    }

    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

module.exports = router;

