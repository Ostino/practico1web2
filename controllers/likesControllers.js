const fs = require('fs');
const path = require('path');

const restaurantesFile = path.join(__dirname, '../data/restaurantes.json');

// Leer restaurantes
function getRestaurantes() {
  const data = fs.readFileSync(restaurantesFile, 'utf8');
  return JSON.parse(data);
}

// Guardar restaurantes
function saveRestaurantes(restaurantes) {
  fs.writeFileSync(restaurantesFile, JSON.stringify(restaurantes, null, 2));
}

// Aumentar likes
function incrementarLike(id) {
  const restaurantes = getRestaurantes();
  const restaurante = restaurantes.find(r => r.id === parseInt(id));

  if (!restaurante) {
    return null;
  }

  restaurante.likes = (restaurante.likes || 0) + 1;
  saveRestaurantes(restaurantes);
  return restaurante.likes;
}

module.exports = {
  getRestaurantes,
  saveRestaurantes,
  incrementarLike
};
