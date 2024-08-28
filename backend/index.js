
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const Sign_in = require('./models/Sign_in');
const File = require('./models/File');
const manageRoutes = require('./routes/manage');
const fileRoutes = require('./routes/fileRoutes');
const bodyParser = require('body-parser');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const verifyRoute = require('./routes/verify');


const app = express();

// Use JSON and CORS middleware
app.use(express.json());
app.use(cors());
app.use('/api', fileRoutes); // Mount fileRoutes under /api
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', uploadRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Single connection to MongoDB
mongoose.connect('mongodb://localhost:27017/internshipdb', {
  // Removed deprecated options
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('Connection error:', err));

// Multer for file upload
const upload = multer({ dest: 'uploads/' });

// Register route
app.post("/register", async (req, res) => {
  try {
    const sign_in = new Sign_in(req.body);
    const result = await sign_in.save();
    const user = result.toObject();
    delete user.password;
    res.send(user);
  } catch (err) {
    res.status(500).send({ message: 'Registration failed', error: err.message });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    if (req.body.password && req.body.email_id) {
      const sign_in = await Sign_in.findOne(req.body).select("-password");
      if (sign_in) {
        res.send(sign_in);
      } else {
        res.send({ result: "This account does not exist. Kindly SIGN UP or enter correct DETAILS." });
      }
    } else {
      res.send({ result: "It is mandatory to enter email and password for login" });
    }
  } catch (err) {
    res.status(500).send({ message: 'Login failed', error: err.message });
  }
});

// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
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

    const requiredHeaders = ['Certificate ID', 'Student Name', 'Internship Domain', 'Starting Date', 'Ending Date'];
    const fileHeaders = Object.keys(sheetData[0]).map(header => header.trim().toLowerCase());
    const missingHeaders = requiredHeaders.map(header => header.toLowerCase()).filter(header => !fileHeaders.includes(header));

    if (missingHeaders.length > 0) {
      return res.status(400).json({ message: " The uploaded file does not have the required headers: ${missingHeaders.join(', ')}" });
    }

    const students = sheetData.map((data, index) => {
      const startDate = new Date(data['Starting Date']);
      const endDate = new Date(data['Ending Date']);

      if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error('Date format is incorrect in row ${index + 1}. Expected YYYY-MM-DD.');
      }

      return {
        certificateId: data['Certificate ID'],
        name: data['Student Name'],
        internshipDomain: data['Internship Domain'],
        startDate: startDate,
        endDate: endDate,
      };
    });

    const certificateIds = students.map(student => student.certificateId);
    const uniqueCertificateIds = new Set(certificateIds);
    if (uniqueCertificateIds.size !== certificateIds.length) {
      return res.status(400).json({ message: 'Duplicate Certificate IDs found in the file.' });
    }

    const StudentModel = mongoose.model(collectionName, new mongoose.Schema({
      certificateId: { type: String, required: true },
      name: { type: String, required: true },
      internshipDomain: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    }));

    await StudentModel.insertMany(students);

    const fileRecord = new File({ collectionName,admin, status: 'success' });
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

// Use the verify routes
app.use('/api', verifyRoute);



// Use the manage routes
app.use('/api/manage', manageRoutes);

app.post('/get-certificate', async (req, res) => {
  try {
    const { batchName, certificateId } = req.body;

    if (!batchName || !certificateId) {
      return res.status(400).json({ message: 'Batch name and certificate ID are required' });
    }

    // Convert batch name to lowercase and pluralize
    const collectionName = batchName.toLowerCase();

    // Define the model based on the collection name
    const StudentModel = mongoose.model(collectionName, new mongoose.Schema({
      certificateId: { type: String, required: true },
      name: { type: String, required: true },
      internshipDomain: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    }), collectionName);  // Explicitly define collectionName to prevent auto-pluralization by mongoose

    // Query the database for the specific certificate
    const certificate = await StudentModel.findOne({ certificateId });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.status(200).json({
      message: 'Certificate retrieved successfully',
      data: {
        name: certificate.name,
        internshipDomain: certificate.internshipDomain,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        certificateId: certificate.certificateId
      }
    });

  } catch (error) {
    console.error('Error retrieving certificate:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
