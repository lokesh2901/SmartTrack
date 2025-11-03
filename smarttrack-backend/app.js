import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import officeRoutes from './routes/officeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();

// ✅ Enable CORS for frontend (localhost + production)
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://smarttrack-pymh.onrender.com'// update this after frontend deployment
  

    ],
    credentials: true,
  })
);

// ✅ Parse JSON bodies
app.use(express.json());

// ✅ Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use('/api/offices', officeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);

app.get('/test', (req, res) => {
  res.send('✅ Server route working');
});

// ✅ Root route to verify deployment
app.get('/', (req, res) => {
  res.send('✅ SmartTrack Backend is Running Successfully on Render!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
