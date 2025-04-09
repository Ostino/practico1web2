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
    cb(null, 'public/images');  // Carpeta donde se guardan las imágenes
  },
  filename: (req, file, cb) => {
    const nombreRestaurante = req.body.nombre.trim().toLowerCase().replace(/\s+/g, '_');  // Reemplazar espacios por guiones bajos y convertir a minúsculas
    const extension = path.extname(file.originalname);  // Obtener la extensión del archivo (como .jpg, .png)
    cb(null, `${nombreRestaurante}${extension}`);  // Asignamos el nombre final a la imagen
  }
});

const uploadup = multer({ storage: storageup });

// Ruta para editar restaurante
app.post('/admin/editarrestaurante/:id', uploadup.single('logo'), (req, res) => {
  const id = parseInt(req.params.id);
  let data = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const index = data.findIndex(r => r.id === id);

  if (index === -1) return res.status(404).send('Restaurante no encontrado');

  const restaurante = data[index];

  // Actualizar el nombre del restaurante
  restaurante.nombre = req.body.nombre;

  // Si se sube una nueva imagen, actualizar el logo
  if (req.file) {
    restaurante.logo = req.file.filename;  // Asignar el nuevo nombre de la imagen al campo 'logo'
  }
  // Si no se sube una nueva imagen, mantenemos la imagen actual (no se cambia el logo)
  
  data[index] = restaurante;  // Reemplazar el restaurante con los nuevos datos
  fs.writeFileSync('data/restaurantes.json', JSON.stringify(data, null, 2));  // Guardar los datos actualizados en el JSON

  res.redirect('/admin');  // Redirigir al admin donde aparece la lista de restaurantes
});

app.post('/admin/borrarrestaurante/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let data = JSON.parse(fs.readFileSync('data/restaurantes.json'));

  // Buscar el restaurante a eliminar
  const index = data.findIndex(r => r.id === id);
  
  if (index === -1) return res.status(404).send('Restaurante no encontrado');

  const restaurante = data[index];
  
  // Eliminar la imagen del logo del restaurante
  const logoPath = path.join(__dirname, 'public/images', restaurante.logo);
  fs.unlink(logoPath, (err) => {
    if (err) {
      console.error('Error al eliminar la imagen del logo:', err);
    }
  });

  // Eliminar las imágenes de las hamburguesas del restaurante
  restaurante.hamburguesas.forEach(hamburguesa => {
    const hamburguesaImagePath = path.join(__dirname, 'public/images', hamburguesa.foto);
    fs.unlink(hamburguesaImagePath, (err) => {
      if (err) {
        console.error(`Error al eliminar la imagen de la hamburguesa ${hamburguesa.nombre}:`, err);
      }
    });
  });

  // Eliminar el restaurante del arreglo de datos
  data.splice(index, 1);  // Eliminar el restaurante por índice
  fs.writeFileSync('data/restaurantes.json', JSON.stringify(data, null, 2));  // Guardar los cambios en el archivo JSON

  res.redirect('/admin');  // Redirigir a la página de administración
});

app.get('/admin/editarhamburguesas/:restauranteId', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);

  // Obtener los restaurantes desde el archivo JSON
  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  // Pasar el restaurante y las hamburguesas a la vista
  res.render('editarhamburguesas', { restaurante });
});

app.get('/admin/agregarhamburguesa/:restauranteId', (req, res) => {
  const restauranteId = parseInt(req.params.restauranteId);

  // Obtener los restaurantes desde el archivo JSON
  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  // Mostrar el formulario de agregar hamburguesa
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

  // Guardar imagen
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
  const hid = parseInt(req.params.hid);  // Asegúrate de convertirlo a número

  // Obtener los restaurantes desde el archivo JSON
  const restaurantes = JSON.parse(fs.readFileSync('data/restaurantes.json'));
  const restaurante = restaurantes.find(r => r.id === restauranteId);

  if (!restaurante) {
    return res.status(404).send('Restaurante no encontrado');
  }

  // Buscar la hamburguesa por "hid"
  const hamburguesa = restaurante.hamburguesas.find(h => h.hid === hid);

  if (!hamburguesa) {
    return res.status(404).send('Hamburguesa no encontrada');
  }

  // Pasar la hamburguesa y el restaurante a la vista de edición
  res.render('editarhamburguesa', { restaurante, hamburguesa });
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

  // Borrar imagen del sistema de archivos
  const imagePath = path.join(__dirname, 'public', 'images', hamburguesa.foto);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  // Eliminar hamburguesa del array
  restaurante.hamburguesas.splice(hamburguesaIndex, 1);
  likesController.saveRestaurantes(restaurantes);

  res.redirect(`/admin/editarhamburguesas/${restauranteId}`);
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
