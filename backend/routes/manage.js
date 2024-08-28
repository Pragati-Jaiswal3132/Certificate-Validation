const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const File = require('../models/File');


// Database connection function
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    // Already connected
    return mongoose.connection.db;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  return mongoose.connection.db;
}

// Test DB Connection
router.get('/test-db', async (req, res) => {
  try {
    const db = await connectToDatabase();
    res.json({ message: 'Database connected successfully' });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Get all files for an admin
router.get('/files', async (req, res) => {
  const { adminName } = req.query;
  try {
    const files = await File.find({ adminName }).sort({ _id: -1 });
    res.json(files);
  } catch (err) {
    console.error('Failed to retrieve files:', err);
    res.status(500).json({ message: 'Failed to retrieve files' });
  }
});

// Fetch data from a dynamic collection
router.get('/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  try {
    const db = await connectToDatabase();
    const collection = db.collection(collectionName);
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (error) {
    console.error('Error fetching collection data:', error);
    res.status(500).send('Error fetching collection data');
  }
});

// Delete a collection (table)
// routes/manage.js
router.delete('/files/:collectionName', async (req, res) => {
  const collectionName = req.params.collectionName;
  try {
    
    const collection = mongoose.connection.collection(collectionName);

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    await collection.drop();
    // Delete the reference from FileCollection
    await File.deleteOne({ collectionName });
    res.json({ message: 'Collection deleted successfully' });
  } catch (err) {
    console.error('Error deleting collection:', err);
    res.status(500).json({ message: 'Error deleting collection', error: err.message });
  }
});



// Delete a specific row by certificate ID
// Delete a specific row by certificate ID
// Delete a specific row by certificate ID
router.delete('/:collectionName/:id', async (req, res) => {
  const { collectionName } = req.params;
  const { certificateId } = req.body;

  try {
    // Define the dynamic model based on collection name
    const StudentModel = mongoose.model(collectionName, new mongoose.Schema({
      certificateId: String,
      name: String,
      internshipDomain: String,
      startDate: Date,
      endDate: Date,
    }), collectionName);

    // Find and delete the document by certificateId
    const result = await StudentModel.findOneAndDelete({ certificateId });

    if (!result) {
      return res.status(404).json({ message: 'Certificate ID not found' });
    }

    res.json({ message: 'Row deleted successfully' });
  } catch (err) {
    console.error('Error deleting row:', err);
    res.status(500).json({ message: 'Failed to delete row' });
  }
});


// Update a specific row by certificate ID
router.put('/api/manage/:collectionName', async (req, res) => {
  const { collectionName } = req.params;
  const { certificateID, studentName, internshipDomain, startDate, endDate } = req.body;

  try {
    // Find the collection
    const collection = mongoose.connection.collection(collectionName);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Update the specific row
    const result = await collection.updateOne(
      { certificateId: certificateID },
      {
        $set: {
          name: studentName,
          internshipDomain,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Certificate ID not found' });
    }

    res.json({ message: 'Row updated successfully' });
  } catch (err) {
    console.error('Error updating row:', err);
    res.status(500).json({ message: 'Failed to update row', error: err.message });
  }
});


// Check status route
router.get('/checkStatus', async (req, res) => {
  const { collectionName } = req.query;
  try {
    const status = await checkStatusInInternshipDB(collectionName);
    res.json({ status });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check status' });
  }
});

module.exports = router;
