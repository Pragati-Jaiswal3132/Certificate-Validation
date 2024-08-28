const mongoose = require('mongoose');

const sign_inSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email_id: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
});

module.exports = mongoose.model('Sign_in', sign_inSchema);