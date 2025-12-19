const mongoose = require('mongoose');

const icRecordSchema = new mongoose.Schema(
  {
    icNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    recordType: {
      type: String,
      required: true,
      enum: ['valid', 'blacklisted', 'revoked'],
      index: true,
    },

    // Fields for valid IC records
    fullName: { type: String, trim: true },
    gender: { type: String, enum: ['M', 'F'] },
    dateOfBirth: { type: String, trim: true }, // keep as YYYY-MM-DD string (matches existing API)
    birthPlace: { type: String, trim: true },
    nationality: { type: String, trim: true },
    religion: { type: String, trim: true },
    address: { type: String, trim: true },
    thumbprintPresent: { type: Boolean },
    hologramPresent: { type: Boolean },
    chipPresent: { type: Boolean },
    status: { type: String, trim: true },

    // Fields for blacklisted/revoked IC records
    reason: { type: String, trim: true },
    reportedDate: { type: String, trim: true },
    revokedDate: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ICRecord', icRecordSchema);
