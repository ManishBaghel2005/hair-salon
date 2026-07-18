import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config(); 
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import appointmentRoutes from './routes/appointment.routes.js';

const app = express();
const server = http.createServer(app);

// Sockets aur HTTP dono ke liye live frontend URL allow karna hoga
const allowedOrigins = [
  'http://localhost:5500', // Local testing ke liye
  'http://127.0.0.1:5500',
  'https://your-frontend-site.netlify.app' // 🚨 YAHAN APNA NETLIFY DOCK URL DAALEIN
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('socketio', io);

// Routes
app.use('/api/appointments', appointmentRoutes);

// Socket Connection Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected'));
});

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("CRITICAL ERROR: MONGO_URI is missing in environment variables!");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('DB Connection Error:', err));

// Dynamic Port Assignment for Live Hosting
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));