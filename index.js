const express = require('express');
const app = express();

const restaurantes = require('./data/restaurantes.json');
const likesController = require('./controllers/likesControllers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { restaurantes });
});


app.get('/', (req, res) => {
  const restaurantes = likesController.getRestaurantes();
  res.render('index', { restaurantes });
});

app.get('/restaurante/:id', (req, res) => {
  const restaurantes = likesController.getRestaurantes();
  const restaurante = restaurantes.find(r => r.id === parseInt(req.params.id));
  if (!restaurante) return res.status(404).send('Restaurante no encontrado');
  res.render('restaurant', { restaurante });
});


app.post('/like/:id', (req, res) => {
  const id = req.params.id;
  const likes = likesController.incrementarLike(id);

  if (likes === null) {
    return res.status(404).json({ error: 'Restaurante no encontrado' });
  }

  res.json({ likes });
});
app.get('/admincrt', (req, res) => {
  res.render('admin');
});

const storage = multer.memoryStorage(); // Usamos memoryStorage para poder renombrar
const upload = multer({ storage: storage });

app.post('/admincrt', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'hamburguesa_foto', maxCount: 1 }
]), (req, res) => {
  const { nombre, hamburguesa_nombre, hamburguesa_descripcion, hamburguesa_precio } = req.body;
  const { logo, hamburguesa_foto } = req.files;

  if (!nombre || !hamburguesa_nombre || !hamburguesa_descripcion || !hamburguesa_precio || !logo || !hamburguesa_foto) {
    return res.status(400).send('Faltan datos.');
  }

  const restaurantes = likesController.getRestaurantes();
  const id = restaurantes.length + 1;

  // Generar nombres de imagen
  const cleanFileName = (str) => str.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const logoFileName = `${cleanFileName(nombre)}.png`;
  const hamburguesaFileName = `${cleanFileName(hamburguesa_nombre)}${id}.png`;

  // Guardar las imágenes en el disco
  fs.writeFileSync(`public/images/${logoFileName}`, logo[0].buffer);
  fs.writeFileSync(`public/images/${hamburguesaFileName}`, hamburguesa_foto[0].buffer);

  // Crear nuevo restaurante
  const nuevoRestaurante = {
    id,
    nombre,
    logo: logoFileName,
    likes: 0,
    hamburguesas: [{
      nombre: hamburguesa_nombre,
      descripcion: hamburguesa_descripcion,
      precio: hamburguesa_precio,
      foto: hamburguesaFileName
    }]
  };

  restaurantes.push(nuevoRestaurante);
  likesController.saveRestaurantes(restaurantes);

  res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
