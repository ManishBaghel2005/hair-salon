import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  timeSlot: { type: String, required: true }, // E.g., "11:00 AM - 12:00 PM"
  service: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ek unique index banayenge taaki same date aur time pe koi dusra data save na ho sake (Database Level Safety)
appointmentSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

export default mongoose.model('Appointment', appointmentSchema);