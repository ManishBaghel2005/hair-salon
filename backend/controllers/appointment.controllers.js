import Appointment from '../models/appointment.modles.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config(); // .env file se environment variables load karne ke liye

// ================= Nodemailer (Email) Setup =================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'manishedit78@gmail.com', // Aapka Gmail address
    pass: process.env.EMAIL_PASS || 'briucscmijksahgu' // Google Account se generate kiya hua 16-digit App Password
  }
});

// 1. Check Availability, Book Appointment & Send Email
export const bookAppointment = async (req, res) => {
  try {
    const { name, phone, email, date, timeSlot, service } = req.body;

    // Check if slot is already taken
    const existingAppointment = await Appointment.findOne({ date, timeSlot });
    if (existingAppointment) {
      return res.status(400).json({ success: false, message: 'Ye slot pehle se booked hai!' });
    }

    // Save appointment to Database
    const newAppointment = new Appointment({ name, phone, email, date, timeSlot, service });
    await newAppointment.save();

    // 📩 Nodemailer Email Logic
    if (email) {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'YOUR_GMAIL@gmail.com',
        to: email, // User ka email account (req.body se)
        subject: 'Appointment Booked Successfully! 🎉',
        text: `Hello ${name},\n\nAapki appointment successfully confirm ho gayi hai!\n\n📋 Details:\n- Service: ${service}\n- Date: ${date}\n- Time Slot: ${timeSlot}\n\nThank you for choosing our service!`,
      };

      // `.catch()` lagaya hai taaki agar email send failure ho, toh main API request crash na ho
      transporter.sendMail(mailOptions)
        .then(() => console.log(`Confirmation email sent to ${email}`))
        .catch(err => console.log("Nodemailer Error:", err.message));
    }

    // Socket.io real-time alert (Dashboard update ke liye)
    const io = req.app.get('socketio');
    if (io) {
      io.emit('appointmentBooked', { message: `New booking received for ${date} at ${timeSlot}`, data: newAppointment });
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Appointment successfully book ho gayi hai aur email bhej diya gaya hai!', 
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