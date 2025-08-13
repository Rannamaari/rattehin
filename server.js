const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Fallback to index for any SPA-style deep links if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rattehin running on http://localhost:${PORT}`);
});
