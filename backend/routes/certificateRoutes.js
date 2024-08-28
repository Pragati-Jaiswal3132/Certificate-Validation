const express = require('express');
const router = express.Router();
const File = require('../models/File'); // Adjust the path if necessary

// Route to get certificate data based on batch name and certificate ID
router.get('/api/certificate/:batchName/:certificateID', async (req, res) => {
  const { batchName, certificateID } = req.params;

  try {
    // Fetch file data based on collection name (batchName)
    const formattedBatchName = batchName.toLowerCase(); // Ensure lowercase
    const file = await File.findOne({
      collectionName: formattedBatchName,
      'rows.certificateID': certificateID
    });

    if (!file) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Find the certificate data within the rows array
    const certificate = file.rows.find(row => row.certificateID === certificateID);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (err) {
    console.error('Error retrieving certificate:', err);
    res.status(500).json({ message: 'Error retrieving certificate' });
  }
});

module.exports = router;
