require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors({
  origin: ['https://5mil.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ name: 'bg-check-engine', version: '1.0.0', status: 'running' });
});

// Load router separately so a crash there doesn't kill boot
try {
  const router = require('./router');
  app.use('/api', router);
  console.log('Router loaded OK');
} catch (err) {
  console.error('Router failed to load:', err.message);
  // Server still starts — /health works even if router is broken
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`bg-check-engine running on port ${PORT}`);
});
