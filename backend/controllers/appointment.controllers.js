import Appointment from '../models/appointment.modles.js';
import dotenv from 'dotenv';
import twilio from 'twilio'; // Import Twilio
dotenv.config(); // .env file se environment variables load karne ke liye

// 1. Check Availability, Book Appointment & Send Email
export const bookAppointment = async (req, res) => {
  try {
    const { name, phone, date, timeSlot, service } = req.body;

    // Check if slot is already taken
    const existingAppointment = await Appointment.findOne({ date, timeSlot });
    if (existingAppointment) {
      return res.status(400).json({ success: false, message: 'Ye slot pehle se booked hai!' });
    }

    // Save appointment to Database
    const newAppointment = new Appointment({ name, phone, date, timeSlot, service });
    await newAppointment.save();

    // 📩 Send WhatsApp/SMS Notification via Twilio
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        // Ensure phone has +91 prefix
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('+91')) {
          formattedPhone = '+91' + phone;
        }

        const messageBody = `Hello ${name},\nYour booking at Hair Magician Unisex Salon is confirmed! 🎉\n\n📅 Date: ${date}\n⏰ Time: ${timeSlot}\n✂️ Service: ${service}\n\nThank you for choosing us!`;

        // Check if using WhatsApp Sandbox or normal SMS
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        const isWhatsApp = fromNumber.startsWith('whatsapp:');
        const toNumber = isWhatsApp ? `whatsapp:${formattedPhone}` : formattedPhone;

        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: toNumber
        });
        console.log("Notification message sent successfully to", toNumber);
      }
    } catch (twErr) {
      console.error("Twilio error (SMS/WhatsApp failed):", twErr);
      // Note: We don't throw error here because booking is already successful in DB.
    }

    // Socket.io real-time alert (Dashboard update ke liye)
    const io = req.app.get('socketio');
    if (io) {
      io.emit('appointmentBooked', { message: `New booking received for ${date} at ${timeSlot}`, data: newAppointment });
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Appointment successfully book ho gayi hai!', 
      data: newAppointment 
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Detailed Booked Slots for a specific date
export const getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query parameter (?date=YYYY-MM-DD) bhejna zaroori hai!' });
    }

    // Is date ki poori details nikalenge (Name, Phone, Service sab aayega)
    const bookings = await Appointment.find({ date });

    return res.json({ 
      success: true, 
      date: date,
      totalBookings: bookings.length,
      bookedSlots: bookings 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get All Records (Database Audit ke liye)
export const getAllAppointments = async (req, res) => {
  try {
    const allBookings = await Appointment.find().sort({ createdAt: -1 }); // Naye bookings sabse upar dikhenge
    return res.json({
      success: true,
      totalRecords: allBookings.length,
      data: allBookings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// backend/controllers/appointment.controllers.js

// 🔐 Admin Credentials (Aap ise process.env.ADMIN_USER me bhi rakh sakte ho baad me)
const ADMIN_USERNAME = process.env.ADMIN_NAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 🔬 DEBUG LOGS: Apne terminal me check karein ki kya print ho raha hai
    console.log("--- Login Request Debugger ---");
    console.log("Frontend se aaya -> Username:", username, "| Password:", password);
    console.log(".env se mila    -> ADMIN_NAME:", process.env.ADMIN_NAME, "| ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username aur password dono zaroori hain." });
    }

    // Yahan directly variables check karne ke bajaye fallback checks laga kar validation run karte hain
    const expectedUser = process.env.ADMIN_NAME || "manish";
    const expectedPass = process.env.ADMIN_PASSWORD || "admin123";

    if (username === expectedUser && password === expectedPass) {
      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        token: "hair_magician_secure_session_token_2026"
      });
    } else {
      return res.status(401).json({ success: false, message: "Invalid username ya password!" });
    }
  } catch (error) {
    console.error("Login controller crash:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
// 🛡️ Middleware: Data endpoints ko unauthorized access se bachane ke liye
export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Access Denied. Token missing." });
  }

  const token = authHeader.split(' ')[1];

  if (token !== "hair_magician_secure_session_token_2026") {
    return res.status(403).json({ success: false, message: "Session expired ya invalid token." });
  }

  next(); // Sab sahi hai, toh request aage pass kar do
};