import { supabase } from './supabase.js'

// --------------------
// MAPA
// --------------------
const map = L.map('map').setView([40, -8], 7)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map)

let markers = {}

// --------------------
// READ – LISTAR SPOTS
// --------------------
async function loadSpots() {
  const { data, error } = await supabase
    .from('spots')
    .select('*')

  if (error) {
    console.error(error)
    return
  }

  data.forEach(addMarker)
}

function addMarker(spot) {
  const marker = L.marker([spot.latitude, spot.longitude])
    .addTo(map)
    .bindPopup(`
      <strong>${spot.name}</strong><br>
      ${spot.date}<br>
      ${spot.location}<br><br>
      <button onclick="editSpot('${spot.id}')">Editar</button>
      <button onclick="deleteSpot('${spot.id}')">Eliminar</button>
    `)

  markers[spot.id] = marker
}

// --------------------
// CREATE – CLICK NO MAPA
// --------------------
map.on('click', async e => {
  const name = prompt('Nome do evento')
  if (!name) return

  const date = prompt('Data (YYYY-MM-DD)')
  const location = prompt('Local')

  const { data, error } = await supabase
    .from('spots')
    .insert([{
      name,
      date,
      location,
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    }])
    .select()
    .single()

  if (error) {
    alert('Erro ao criar evento')
    console.error(error)
    return
  }

  addMarker(data)
})

// --------------------
// UPDATE
// --------------------
window.editSpot = async id => {
  const { data } = await supabase
    .from('spots')
    .select('*')
    .eq('id', id)
    .single()

  const name = prompt('Novo nome', data.name)
  if (!name) return

  const { error } = await supabase
    .from('spots')
    .update({ name })
    .eq('id', id)

  if (error) {
    alert('Erro ao atualizar')
    return
  }

  map.removeLayer(markers[id])
  loadClean()
}

// --------------------
// DELETE
// --------------------
window.deleteSpot = async id => {
  if (!confirm('Eliminar este evento?')) return

  const { error } = await supabase
    .from('spots')
    .delete()
    .eq('id', id)

  if (error) {
    alert('Erro ao eliminar')
    return
  }

  map.removeLayer(markers[id])
}

// --------------------
// RESET MAPA
// --------------------
async function loadClean() {
  Object.values(markers).forEach(m => map.removeLayer(m))
  markers = {}
  await loadSpots()
}

// INIT
loadSpots()
