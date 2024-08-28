

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define the route for verifying the certificate
router.get('/verify', async (req, res) => {
  const { batchName, certificateId } = req.query;

  if (!batchName || !certificateId) {
    return res.status(400).json({ message: 'Batch name and certificate ID are required' });
  }

  try {
    // Convert batchName to lowercase
    const collectionName = batchName.toLowerCase();
    
    // Check if the collection exists
    const collection = await mongoose.connection.db.collection(collectionName).findOne({ certificateId });

    if (!collection) {
      return res.status(404).json({ message: 'No matching certificate found' });
    }

    res.json(collection);
  } catch (err) {
    console.error('Error verifying certificate:', err);
    res.status(500).json({ message: 'Error verifying certificate' });
  }
});

module.exports = router;

