import { supabase } from './supabase.js';
import { obterUsuarioAtual } from './auth_utils.js';
import {
    obterSpots,
    criarSpot,
    atualizarSpot,
    apagarSpot,
    criarSolicitacaoPublicacao,
    obterCategoriasPorModalidade,
    obterEventos,
    criarEvento
} from './db_utils.js';

let map;
let spotMarkers = [];
let eventMarkers = [];
let userProfile = null;
let currentPos = null;
let spotEmEdicao = null;
let currentModalidadeFilter = 'all';
let isEventMode = false;

async function initMap() {
    try {
        map = L.map('map').setView([39.5, -8.5], 7);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        userProfile = await obterUsuarioAtual();
        setupVisibilityMessage();

        loadSpots();
        loadEventos();
        subscribeToSpots();
        subscribeToEventos();

        map.on('click', (e) => {
            currentPos = e.latlng;
            if (isEventMode) {
                document.getElementById('event-lat').value = currentPos.lat;
                document.getElementById('event-lng').value = currentPos.lng;
                openEventModal();
            } else {
                document.getElementById('spot-lat').value = currentPos.lat;
                document.getElementById('spot-lng').value = currentPos.lng;
                openModal();
            }
        });
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
    }
}

function setupVisibilityMessage() {
    const msgEl = document.getElementById('visibility-msg');
    const reqGroup = document.getElementById('public-request-group');
    const btnEvent = document.getElementById('btn-add-event');

    if (!userProfile) {
        msgEl.style.display = 'none';
        reqGroup.style.display = 'none';
        if (btnEvent) btnEvent.style.display = 'none';
        return;
    }

    msgEl.style.display = 'block';
    if (userProfile.role === 'cliente') {
        msgEl.textContent = 'Como cliente, os teus spots são privados e visíveis apenas para ti.';
        reqGroup.style.display = 'block';
        if (btnEvent) btnEvent.style.display = 'none';
    } else if (userProfile.role === 'atleta') {
        msgEl.textContent = 'Como atleta, os teus spots são visíveis para ti e para os teus seguidores.';
        reqGroup.style.display = 'block';
        if (btnEvent) btnEvent.style.display = 'none';
    } else if (userProfile.role === 'empresa') {
        msgEl.textContent = 'Como empresa, os teus spots são públicos e visíveis para todos.';
        reqGroup.style.display = 'none';
        if (btnEvent) btnEvent.style.display = 'inline-flex';
    }
}

async function loadSpots(modalidadeId = 'all') {
    try {
        currentModalidadeFilter = modalidadeId;
        const spots = await obterSpots({ modalidade_id: modalidadeId });
        renderSpotMarkers(spots);
        renderSpotsList(spots);
    } catch (error) {
        console.error('Erro ao carregar spots:', error);
    }
}

async function loadEventos() {
    try {
        const eventos = await obterEventos({});
        renderEventMarkers(eventos);
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
    }
}

function renderSpotMarkers(spots) {
    spotMarkers.forEach(m => map.removeLayer(m));
    spotMarkers = [];

    spots.forEach((spot, index) => {
        const lat = Number(spot.coordenadas_lat);
        const lng = Number(spot.coordenadas_long);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.warn('Spot com coordenadas invalidas ignorado:', spot);
            return;
        }

        const checkpointIcon = L.divIcon({
            className: 'checkpoint-icon',
            html: `<div class="checkpoint-marker">${index + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -24]
        });

        const marker = L.marker([lat, lng], { icon: checkpointIcon }).addTo(map);

        const canEdit = userProfile && spot.criador_id === userProfile.id;
        const editBtn = canEdit ? `<button onclick="window.editarSpot(${spot.id})" style="background: #ff8c00; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>` : '';
        const deleteBtn = canEdit ? `<button onclick="window.apagarSpotMap(${spot.id})" style="background: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Apagar</button>` : '';
        const videoLink = spot.video_url
            ? `<p style="margin: 0 0 8px 0;"><a href="${spot.video_url}" target="_blank" style="color: #7ed6ff;">Ver v�deo</a></p>`
            : '';

        const popupContent = `
            <div style="color: white; min-width: 200px;">
                <h3 style="color: #ff8c00; margin: 0 0 5px 0;">${spot.nome}</h3>
                <p style="margin: 0 0 5px 0; font-size: 0.9rem;">${spot.modalidades?.nome || ''} ${spot.categorias?.nome ? ' - ' + spot.categorias.nome : ''}</p>
                <p style="margin: 0 0 10px 0; font-size: 0.85rem;">${spot.descricao || 'Sem descrição'}</p>
                ${videoLink}
                <small style="color: #888;">Por: ${spot.profiles?.nome || 'Utilizador'}</small>
                <div style="margin-top: 10px;">
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
        `;

        marker.bindPopup(popupContent);
        spotMarkers.push(marker);
    });

    updateMapBounds();
}

function renderEventMarkers(eventos) {
    eventMarkers.forEach(m => map.removeLayer(m));
    eventMarkers = [];

    eventos.forEach((evento) => {
        const lat = Number(evento.coordenadas_lat);
        const lng = Number(evento.coordenadas_long);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

        const eventIcon = L.divIcon({
            className: 'checkpoint-icon',
            html: `<div class="event-marker">EV</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -24]
        });

        const marker = L.marker([lat, lng], { icon: eventIcon }).addTo(map);

        const dataInicio = evento.data_inicio ? new Date(evento.data_inicio).toLocaleString('pt-PT') : '';
        const dataFim = evento.data_fim ? new Date(evento.data_fim).toLocaleString('pt-PT') : '';

        const popupContent = `
            <div style="color: white; min-width: 220px;">
                <h3 style="color: #00d1b2; margin: 0 0 5px 0;">${evento.nome}</h3>
                <p style="margin: 0 0 5px 0; font-size: 0.9rem;">${dataInicio}${dataFim ? ' - ' + dataFim : ''}</p>
                <p style="margin: 0 0 5px 0; font-size: 0.85rem;">${evento.localidade || 'Localidade por definir'}</p>
                <p style="margin: 0; font-size: 0.85rem;">${evento.descricao || 'Sem descrição'}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        eventMarkers.push(marker);
    });

    updateMapBounds();
}

function updateMapBounds() {
    const bounds = L.latLngBounds([]);
    spotMarkers.forEach((m) => bounds.extend(m.getLatLng()));
    eventMarkers.forEach((m) => bounds.extend(m.getLatLng()));

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
}

function subscribeToSpots() {
    supabase
        .channel('spots-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'spots' },
            () => {
                loadSpots(currentModalidadeFilter);
            }
        )
        .subscribe();
}

function subscribeToEventos() {
    supabase
        .channel('eventos-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'eventos' },
            () => {
                loadEventos();
            }
        )
        .subscribe();
}

function renderSpotsList(spots) {
    const container = document.getElementById('spots-container');
    if (spots.length === 0) {
        container.innerHTML = '<div class="no-spots"><p>Nenhum spot encontrado nesta modalidade.</p></div>';
        return;
    }

    container.innerHTML = spots.map((spot, index) => {
        const canEdit = userProfile && spot.criador_id === userProfile.id;
        return `
            <div class="spot-card" onclick="window.focusMap(${spot.coordenadas_lat}, ${spot.coordenadas_long})">
                <div class="spot-card-header">
                    <div class="checkpoint-badge">CP ${index + 1}</div>
                    <h3>${spot.nome}</h3>
                </div>
                <p><strong>${spot.modalidades?.nome || ''}</strong> ${spot.categorias?.nome ? '| ' + spot.categorias.nome : ''}</p>
                <p style="color: #999; font-size: 12px;">📍 ${Number(spot.coordenadas_lat).toFixed(4)}, ${Number(spot.coordenadas_long).toFixed(4)}</p>
                <p>${spot.descricao || 'Sem descrição'}</p>
                <p style="color: #888; font-size: 12px;">Por: ${spot.profiles?.nome || 'Utilizador'}</p>
                ${canEdit ? `
                    <div class="spot-actions">
                        <button class="btn-edit" onclick="window.editarSpot(${spot.id}); event.stopPropagation();">✏️ Editar</button>
                        <button class="btn-delete" onclick="window.apagarSpotMap(${spot.id}); event.stopPropagation();">🗑️ Apagar</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

window.focusMap = (lat, lng) => {
    map.setView([lat, lng], 14);
};

// CRUD Actions - CREATE (SPOT)
document.getElementById('form-spot').onsubmit = async (e) => {
    e.preventDefault();

    const user = await obterUsuarioAtual();
    if (!user) return alert('Deves estar ligado para adicionar spots.');

    const videoUrl = document.getElementById('spot-video').value.trim();
    const spotData = {
        nome: document.getElementById('spot-nome').value,
        descricao: document.getElementById('spot-descricao').value,
        modalidade_id: parseInt(document.getElementById('spot-modalidade').value),
        categoria_id: document.getElementById('spot-categoria').value ? parseInt(document.getElementById('spot-categoria').value) : null,
        coordenadas_lat: parseFloat(document.getElementById('spot-lat').value),
        coordenadas_long: parseFloat(document.getElementById('spot-lng').value),
        criador_id: user.id,
        ...(videoUrl ? { video_url: videoUrl } : {})
    };

    let spot;

    if (spotEmEdicao) {
        const resultado = await atualizarSpot(spotEmEdicao, spotData);
        if (!resultado) {
            alert('Erro ao atualizar spot.');
            return;
        }
        alert('Spot atualizado com sucesso!');
        spotEmEdicao = null;
    } else {
        spot = await criarSpot(spotData);
        if (!spot) {
            alert('Erro ao guardar spot.');
            return;
        }

        if (document.getElementById('request-public').checked) {
            await criarSolicitacaoPublicacao(spot.id, user.id);
            alert('Spot guardado e solicitação de publicação enviada ao admin!');
        } else {
            alert('Spot guardado com sucesso!');
        }

        await loadSpots();
        map.setView([spotData.coordenadas_lat, spotData.coordenadas_long], 14);
    }

    closeModal();
    loadSpots();
};

// CRUD Actions - CREATE (EVENTO)
document.getElementById('form-event').onsubmit = async (e) => {
    e.preventDefault();

    const user = await obterUsuarioAtual();
    if (!user) return alert('Deves estar ligado para adicionar eventos.');
    if (!userProfile || userProfile.role !== 'empresa') {
        return alert('Apenas empresas podem adicionar eventos.');
    }

    const eventoData = {
        nome: document.getElementById('event-nome').value,
        descricao: document.getElementById('event-descricao').value,
        modalidade_id: parseInt(document.getElementById('event-modalidade').value),
        data_inicio: document.getElementById('event-data-inicio').value,
        data_fim: document.getElementById('event-data-fim').value,
        localidade: document.getElementById('event-localidade').value,
        coordenadas_lat: parseFloat(document.getElementById('event-lat').value),
        coordenadas_long: parseFloat(document.getElementById('event-lng').value),
        criador_id: user.id
    };

    const evento = await criarEvento(eventoData);
    if (!evento) {
        alert('Erro ao guardar evento.');
        return;
    }

    alert('Evento guardado com sucesso!');
    closeEventModal();
    loadEventos();
    map.setView([eventoData.coordenadas_lat, eventoData.coordenadas_long], 14);
};

// Category mapping logic
document.getElementById('spot-modalidade').onchange = async (e) => {
    const modId = e.target.value;
    const catSelect = document.getElementById('spot-categoria');

    if (!modId) {
        catSelect.disabled = true;
        catSelect.innerHTML = '<option value="">Selecionar Categoria</option>';
        return;
    }

    const cats = await obterCategoriasPorModalidade(modId);

    catSelect.disabled = false;
    catSelect.innerHTML = '<option value="">Selecionar Categoria</option>' +
        cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
};

document.getElementById('filter-modalidade').onchange = (e) => {
    loadSpots(e.target.value);
};

// Modal Logic (SPOT)
const modal = document.getElementById('modal-spot');
const btnAdd = document.getElementById('btn-add-spot');
const spanClose = document.getElementsByClassName('close-modal')[0];

function openModal() {
    isEventMode = false;
    modal.style.display = 'flex';
    document.getElementById('modal-title').textContent = spotEmEdicao ? 'Editar Spot' : 'Criar Novo Spot';
}

function closeModal() {
    modal.style.display = 'none';
    document.getElementById('form-spot').reset();
    spotEmEdicao = null;
    isEventMode = false;
}

btnAdd.onclick = () => {
    isEventMode = false;
    alert('Clica num ponto do mapa para definir a localização do spot.');
};

spanClose.onclick = closeModal;
window.addEventListener('click', (e) => {
    if (e.target == modal) closeModal();
});

// Modal Logic (EVENTO)
const modalEvent = document.getElementById('modal-event');
const btnEvent = document.getElementById('btn-add-event');
const closeEvent = document.getElementById('close-event');
const cancelEvent = document.getElementById('cancel-event');

function openEventModal() {
    modalEvent.style.display = 'flex';
}

function closeEventModal() {
    modalEvent.style.display = 'none';
    document.getElementById('form-event').reset();
    isEventMode = false;
}

if (btnEvent) {
    btnEvent.onclick = () => {
        if (!userProfile || userProfile.role !== 'empresa') {
            alert('Apenas empresas podem adicionar eventos.');
            return;
        }
        isEventMode = true;
        alert('Clica num ponto do mapa para definir a localização do evento.');
    };
}

if (closeEvent) closeEvent.onclick = closeEventModal;
if (cancelEvent) cancelEvent.onclick = closeEventModal;
window.addEventListener('click', (e) => {
    if (e.target == modalEvent) closeEventModal();
});

// EDITAR SPOT
window.editarSpot = async (spotId) => {
    const spots = await obterSpots({});
    const spot = spots.find(s => s.id === spotId);

    if (!spot) {
        alert('Spot não encontrado');
        return;
    }

    spotEmEdicao = spotId;
    document.getElementById('spot-nome').value = spot.nome;
    document.getElementById('spot-descricao').value = spot.descricao || '';
    document.getElementById('spot-video').value = spot.video_url || '';
    document.getElementById('spot-modalidade').value = spot.modalidade_id;
    document.getElementById('spot-lat').value = spot.coordenadas_lat;
    document.getElementById('spot-lng').value = spot.coordenadas_long;

    const cats = await obterCategoriasPorModalidade(spot.modalidade_id);
    const catSelect = document.getElementById('spot-categoria');
    catSelect.innerHTML = '<option value="">Selecionar Categoria</option>' +
        cats.map(c => `<option value="${c.id}" ${c.id === spot.categoria_id ? 'selected' : ''}>${c.nome}</option>`).join('');

    openModal();
};

// APAGAR SPOT
window.apagarSpotMap = async (spotId) => {
    if (!confirm('Tem a certeza que quer apagar este spot?')) return;

    const resultado = await apagarSpot(spotId);
    if (resultado) {
        alert('Spot apagado com sucesso!');
        loadSpots();
    } else {
        alert('Erro ao apagar spot');
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando mapa...');
    initMap();
});



