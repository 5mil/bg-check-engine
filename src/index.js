require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const router = require('./router');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());

// Rate limiting: 30 requests per 15 minutes per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' }
}));

app.use('/api', router);

app.get('/', (req, res) => {
  res.json({ name: 'bg-check-engine', version: '1.0.0', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`bg-check-engine running on port ${PORT}`);
});
