const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  collectionName: { type: String, required: true },
  rows: { type: [Object], default: [] }, // Ensure rows is an array of objects
  admin: { type: String, required: true },
  status: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
