const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  collectionName: { type: String, required: true },
  rows: [{
    certificateID: { type: String, required: true },
    studentName: { type: String, required: true },
    internshipDomain: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }]
});

module.exports = mongoose.model('File', FileSchema);
