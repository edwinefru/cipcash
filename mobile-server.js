const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, 'frontend', 'web-build')));

// Handle React Router (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'web-build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mobile app server running on port ${PORT}`);
});