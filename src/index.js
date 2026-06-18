require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const router = require('./router');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// CORS must come before helmet so preflight OPTIONS requests are handled first
const allowedOrigins = [
  'https://5mil.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed for: ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

// Handle preflight for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(helmet());
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ name: 'bg-check-engine', version: '1.0.0', status: 'running' });
});

app.use('/api', router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`bg-check-engine running on port ${PORT}`);
});
