// app.js atau file utama aplikasi
const express = require('express');
const app = express();
const routes = require('./router/routes');

// Middleware untuk memproses body dari request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Gunakan rute boardRoutes
app.use('/', routes);

// Port yang akan digunakan
const port = 3000;

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
