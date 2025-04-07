const express = require('express');
const app = express();

const likesController = require('./controllers/likesControllers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  const restaurantes = likesController.getRestaurantes();
  res.render('adminhub', { restaurantes });
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

const storage = multer.memoryStorage(); 
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

  const cleanFileName = (str) => str.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const logoFileName = `${cleanFileName(nombre)}.png`;
  const hamburguesaFileName = `${cleanFileName(hamburguesa_nombre)}${id}.png`;

  fs.writeFileSync(`public/images/${logoFileName}`, logo[0].buffer);
  fs.writeFileSync(`public/images/${hamburguesaFileName}`, hamburguesa_foto[0].buffer);


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
