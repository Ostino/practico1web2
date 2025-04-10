const express = require('express');
const app = express();

const likesController = require('./controllers/likesControllers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
      hid: 1,
      nombre: hamburguesa_nombre,
      descripcion: hamburguesa_descripcion,
      precio: hamburguesa_precio,
      foto: hamburguesaFileName
    }]
  };

  restaurantes.push(nuevoRestaurante);
  likesController.saveRestaurantes(restaurantes);

  res.redirect('/admin');
});

app.get('/admin/editarrestaurante/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = data.find(r => r.id === id);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  res.render('editarrestaurante', { restaurante });
});

const storageup = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');
  },
  filename: (req, file, cb) => {
    const nombreRestaurante = req.body.nombre.trim().toLowerCase().replace(/\s+/g, '_');  
    const extension = path.extname(file.originalname);  
    cb(null, `${nombreRestaurante}${extension}`);  
  }
});
const uploadup = multer({ storage: storageup });

app.post('/admin/editarrestaurante/:id', uploadup.single('logo'), (req, res) => {
  const id = parseInt(req.params.id);
  let data = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const index = data.findIndex(r => r.id === id);

  if (index === -1) return res.status(404).send('Restaurante no encontrado');

  const restaurante = data[index];

  
  restaurante.nombre = req.body.nombre;

  
  if (req.file) {
    restaurante.logo = req.file.filename;  
  }
  
  data[index] = restaurante;  
  fs.writeFileSync('data/restaurantes.json', JSON.stringify(data, null, 2)); 

  res.redirect('/admin');
});

app.post('/admin/borrarrestaurante/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let data = JSON.parse(fs.readFileSync('data/restaurantes.json'));

  const index = data.findIndex(r => r.id === id);
  
  if (index === -1) return res.status(404).send('Restaurante no encontrado');

  const restaurante = data[index];
  
  const logoPath = path.join(__dirname, 'public/images', restaurante.logo);
  fs.unlink(logoPath, (err) => {
    if (err) {
      console.error('Error al eliminar la imagen del logo:', err);
    }
  });

  restaurante.hamburguesas.forEach(hamburguesa => {
    const hamburguesaImagePath = path.join(__dirname, 'public/images', hamburguesa.foto);
    fs.unlink(hamburguesaImagePath, (err) => {
      if (err) {
        console.error(`Error al eliminar la imagen de la hamburguesa ${hamburguesa.nombre}:`, err);
      }
    });
  });

  data.splice(index, 1);  
  fs.writeFileSync('data/restaurantes.json', JSON.stringify(data, null, 2)); 

  res.redirect('/admin');
});

app.get('/admin/editarhamburguesas/:restauranteId', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);

  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  res.render('editarhamburguesas', { restaurante });
});

app.get('/admin/agregarhamburguesa/:restauranteId', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);

  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  res.render('agregarhamburguesa', { restaurante });
});

app.post('/admin/agregarhamburguesa/:restauranteId', upload.fields([
  { name: 'hamburguesa_foto', maxCount: 1 }
]), (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);
  const { hamburguesa_nombre, hamburguesa_descripcion, hamburguesa_precio } = req.body;
  const { hamburguesa_foto } = req.files;

  if (!hamburguesa_nombre || !hamburguesa_descripcion || !hamburguesa_precio || !hamburguesa_foto) {
    return res.status(400).send('Faltan campos obligatorios.');
  }

  const restaurantes = likesController.getRestaurantes();
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado.');
  }

  const cleanFileName = (str) => str.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const ultimoHid = restaurante.hamburguesas.length > 0 
    ? Math.max(...restaurante.hamburguesas.map(h => h.hid)) 
    : 0;
  const nuevoHid = ultimoHid + 1;

  const hamburguesaFileName = `${cleanFileName(hamburguesa_nombre)}${restauranteId}.png`;

  fs.writeFileSync(`public/images/${hamburguesaFileName}`, hamburguesa_foto[0].buffer);

  const nuevaHamburguesa = {
    hid: nuevoHid,
    nombre: hamburguesa_nombre,
    descripcion: hamburguesa_descripcion,
    precio: hamburguesa_precio,
    foto: hamburguesaFileName
  };

  restaurante.hamburguesas.push(nuevaHamburguesa);
  likesController.saveRestaurantes(restaurantes);

  res.redirect(`/admin/editarhamburguesas/${restauranteId}`);
});

app.get('/admin/editarhamburguesa/:restauranteId/:hid', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);
  const hid = parseInt(req.params.hid);  

  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  const hamburguesa = restaurante.hamburguesas.find(h => h.hid === hid);

  if (!hamburguesa) {
    return res.status(404).send('Hamburguesa no encontrada');
  }

  res.render('editarhamburguesa', { restaurante, hamburguesa });
});

app.post('/admin/editarhamburguesa/:restauranteId/:hid', upload.fields([
  { name: 'hamburguesa_foto', maxCount: 1 }
]), (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);
  const hid = parseInt(req.params.hid);
  const { hamburguesa_nombre, hamburguesa_descripcion, hamburguesa_precio } = req.body;
  const { hamburguesa_foto } = req.files;

  const restaurantes = likesController.getRestaurantes();
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  const hamburguesa = restaurante.hamburguesas.find(h => h.hid === hid);

  if (!hamburguesa) {
    return res.status(404).send('Hamburguesa no encontrada');
  }

  const cleanFileName = (str) => str.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const nombreFinal = hamburguesa_nombre ? hamburguesa_nombre : hamburguesa.nombre;
  const descripcionFinal = hamburguesa_descripcion ? hamburguesa_descripcion : hamburguesa.descripcion;
  const precioFinal = hamburguesa_precio ? hamburguesa_precio : hamburguesa.precio;

  let hamburguesaFileName = hamburguesa.foto;

  if (hamburguesa_foto) {
    hamburguesaFileName = `${cleanFileName(nombreFinal)}${restauranteId}.png`;
    fs.writeFileSync(`public/images/${hamburguesaFileName}`, hamburguesa_foto[0].buffer);
  }

  hamburguesa.nombre = nombreFinal;
  hamburguesa.descripcion = descripcionFinal;
  hamburguesa.precio = precioFinal;
  hamburguesa.foto = hamburguesaFileName;

  likesController.saveRestaurantes(restaurantes);

  res.redirect(`/admin/editarhamburguesas/${restauranteId}`);
});

app.post('/admin/borrarhamburguesa/:restauranteId/:hid', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);
  const hid = parseInt(req.params.hid);

  const restaurantes = likesController.getRestaurantes();
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado.');
  }

  const hamburguesaIndex = restaurante.hamburguesas.findIndex(h => h.hid === hid);

  if (hamburguesaIndex === -1) {
    return res.status(404).send('Hamburguesa no encontrada.');
  }

  const hamburguesa = restaurante.hamburguesas[hamburguesaIndex];

  const imagePath = path.join(__dirname, 'public', 'images', hamburguesa.foto);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  restaurante.hamburguesas.splice(hamburguesaIndex, 1);
  likesController.saveRestaurantes(restaurantes);

  res.redirect(`/admin/editarhamburguesas/${restauranteId}`);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
