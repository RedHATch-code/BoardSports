import { supabase } from './supabase.js';
import { obterUsuarioAtual } from './auth_utils.js';
import { Globe3D } from './globe_3d.js';
import { showConfirm, showToast } from './ui_feedback.js';
import {
    obterSpots,
    criarSpot,
    atualizarSpot,
    apagarSpot,
    criarSolicitacaoPublicacao,
    obterCategoriasPorModalidade,
    obterEventos,
    criarEvento,
    atualizarEvento,
    apagarEvento,
    obterParticipantesPorEventos,
    atualizarParticipacaoEvento,
    removerParticipacaoEvento
} from './db_utils.js';

let map;
let spotMarkers = [];
let eventMarkers = [];
let userProfile = null;
let currentPos = null;
let userLocationLatLng = null;
let userLocationMarker = null;
let userLocationAccuracyCircle = null;
let userLocationWatchId = null;
let hasCenteredOnUserLocation = false;
let spotEmEdicao = null;
let eventoEmEdicao = null;
let currentModalidadeFilter = 'all';
let isEventMode = false;
let currentSpots = [];
let currentEventos = [];
let currentEventParticipants = new Map();
let globe = null;
let currentGlobeMarkers = [];
let globeUsingFallback = true;
let activeGlobeMarkerKey = null;
let hoveredGlobeMarkerKey = null;
let hoveredGlobeContinentId = null;

const GLOBE_CONFIG = {
    atmosphereColor: '#4da6ff',
    atmosphereIntensity: 20,
    bumpScale: 5,
    autoRotateSpeed: 0.3
};

const sampleMarkers = [
    { lat: 40.7128, lng: -74.006, src: buildMarkerAvatar('New York', '#4da6ff', 'NY'), label: 'New York', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 51.5074, lng: -0.1278, src: buildMarkerAvatar('London', '#4da6ff', 'LD'), label: 'London', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 35.6762, lng: 139.6503, src: buildMarkerAvatar('Tokyo', '#4da6ff', 'TK'), label: 'Tokyo', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: -33.8688, lng: 151.2093, src: buildMarkerAvatar('Sydney', '#4da6ff', 'SY'), label: 'Sydney', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 48.8566, lng: 2.3522, src: buildMarkerAvatar('Paris', '#4da6ff', 'PA'), label: 'Paris', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 28.6139, lng: 77.209, src: buildMarkerAvatar('New Delhi', '#4da6ff', 'ND'), label: 'New Delhi', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 55.7558, lng: 37.6173, src: buildMarkerAvatar('Moscow', '#4da6ff', 'MS'), label: 'Moscow', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: -22.9068, lng: -43.1729, src: buildMarkerAvatar('Rio de Janeiro', '#4da6ff', 'RJ'), label: 'Rio de Janeiro', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 31.2304, lng: 121.4737, src: buildMarkerAvatar('Shanghai', '#4da6ff', 'SH'), label: 'Shanghai', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 25.2048, lng: 55.2708, src: buildMarkerAvatar('Dubai', '#4da6ff', 'DU'), label: 'Dubai', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: -34.6037, lng: -58.3816, src: buildMarkerAvatar('Buenos Aires', '#4da6ff', 'BA'), label: 'Buenos Aires', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 1.3521, lng: 103.8198, src: buildMarkerAvatar('Singapore', '#4da6ff', 'SG'), label: 'Singapore', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' },
    { lat: 37.5665, lng: 126.978, src: buildMarkerAvatar('Seoul', '#4da6ff', 'SE'), label: 'Seoul', subtitle: 'Demo local', note: 'Marcador demo local para manter o globo funcional antes de existirem spots reais.', meta: 'Fallback local', color: '#4da6ff', kind: 'demo' }
];

const sampleRoutes = [
    {
        start: { lat: 64.2008, lng: -149.4937 },
        end: { lat: 34.0522, lng: -118.2437 },
        color: '#64c8ff',
        label: 'Alaska / Los Angeles'
    },
    {
        start: { lat: 64.2008, lng: -149.4937 },
        end: { lat: -15.7975, lng: -47.8919 },
        color: '#7ddf9c',
        label: 'Alaska / Brasilia'
    },
    {
        start: { lat: -15.7975, lng: -47.8919 },
        end: { lat: 38.7223, lng: -9.1393 },
        color: '#ffcf6b',
        label: 'Brasilia / Lisboa'
    },
    {
        start: { lat: 51.5074, lng: -0.1278 },
        end: { lat: 28.6139, lng: 77.209 },
        color: '#d68bff',
        label: 'Londres / Nova Deli'
    },
    {
        start: { lat: 28.6139, lng: 77.209 },
        end: { lat: 43.1332, lng: 131.9113 },
        color: '#58e4dd',
        label: 'Nova Deli / Vladivostok'
    },
    {
        start: { lat: 28.6139, lng: 77.209 },
        end: { lat: -1.2921, lng: 36.8219 },
        color: '#ff985c',
        label: 'Nova Deli / Nairobi'
    }
];

const CONTINENT_INFO = {
    north_america: { label: 'America do Norte', abbr: 'NA', color: '#64c8ff' },
    south_america: { label: 'America do Sul', abbr: 'SA', color: '#7ddf9c' },
    europe: { label: 'Europa', abbr: 'EU', color: '#ffcf6b' },
    africa: { label: 'Africa', abbr: 'AF', color: '#ff985c' },
    asia: { label: 'Asia', abbr: 'AS', color: '#d68bff' },
    oceania: { label: 'Oceania', abbr: 'OC', color: '#58e4dd' },
    antarctica: { label: 'Antartida', abbr: 'AN', color: '#c5dbf7' }
};

async function initMap() {
    try {
        map = L.map('map').setView([39.5, -8.5], 7);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        initUserLocationTracking();

        userProfile = await obterUsuarioAtual();
        setupVisibilityMessage();
        initGlobe();

        await Promise.all([loadSpots(), loadEventos()]);

        subscribeToSpots();
        subscribeToEventos();

        map.on('click', handleMapClick);
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
    }
}

function initUserLocationTracking() {
    const button = document.getElementById('btn-my-location');

    if (!('geolocation' in navigator)) {
        if (button) {
            button.disabled = true;
            button.title = 'Geolocalizacao indisponivel neste browser.';
        }
        return;
    }

    userLocationWatchId = navigator.geolocation.watchPosition(
        handleUserLocationSuccess,
        handleUserLocationError,
        {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000
        }
    );

    if (button) {
        button.onclick = () => focusUserLocation(true);
    }
}

function handleUserLocationSuccess(position) {
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy) || 0;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    userLocationLatLng = L.latLng(lat, lng);
    renderUserLocationLayer(accuracy);
    updateLocationButtonState(true);

    if (!hasCenteredOnUserLocation && !spotMarkers.length && !eventMarkers.length) {
        focusUserLocation(false);
        hasCenteredOnUserLocation = true;
    }
}

function handleUserLocationError(error) {
    console.warn('Nao foi possivel obter a localizacao atual:', error);
    updateLocationButtonState(false, error);
}

function renderUserLocationLayer(accuracy) {
    if (!map || !userLocationLatLng) return;

    const locationIcon = L.divIcon({
        className: 'user-location-icon',
        html: '<div class="user-location-dot"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14]
    });

    if (!userLocationMarker) {
        userLocationMarker = L.marker(userLocationLatLng, { icon: locationIcon }).addTo(map);
        userLocationMarker.bindPopup('Esta e a tua localizacao atual.');
    } else {
        userLocationMarker.setLatLng(userLocationLatLng);
    }

    if (!userLocationAccuracyCircle) {
        userLocationAccuracyCircle = L.circle(userLocationLatLng, {
            radius: Math.min(Math.max(accuracy, 12), 250),
            color: '#4da6ff',
            weight: 1,
            fillColor: '#4da6ff',
            fillOpacity: 0.12
        }).addTo(map);
    } else {
        userLocationAccuracyCircle.setLatLng(userLocationLatLng);
        userLocationAccuracyCircle.setRadius(Math.min(Math.max(accuracy, 12), 250));
    }

    userLocationMarker.bringToFront();
}

function focusUserLocation(openPopup = true) {
    if (!map) return;

    if (!userLocationLatLng) {
        showToast('Ainda nao foi possivel obter a tua localizacao atual.', { type: 'warning' });
        return;
    }

    map.setView(userLocationLatLng, 14);

    if (openPopup && userLocationMarker) {
        userLocationMarker.openPopup();
    }
}

function updateLocationButtonState(isReady, error = null) {
    const button = document.getElementById('btn-my-location');
    if (!button) return;

    button.classList.toggle('is-ready', Boolean(isReady));

    if (isReady) {
        button.title = 'Centrar o mapa na tua localizacao atual.';
        return;
    }

    if (error?.code === 1) {
        button.title = 'Permissao de localizacao recusada.';
        return;
    }

    button.title = 'Ainda a tentar obter a tua localizacao.';
}

function handleMapClick(event) {
    currentPos = event.latlng;

    if (isEventMode) {
        document.getElementById('event-lat').value = currentPos.lat;
        document.getElementById('event-lng').value = currentPos.lng;
        openEventModal();
        return;
    }

    document.getElementById('spot-lat').value = currentPos.lat;
    document.getElementById('spot-lng').value = currentPos.lng;
    openModal();
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
    if (userProfile.perfil?.role === 'cliente') {
        msgEl.textContent = 'Como cliente, os teus spots ficam privados e visiveis apenas para ti.';
        reqGroup.style.display = 'block';
        if (btnEvent) btnEvent.style.display = 'none';
    } else if (userProfile.perfil?.role === 'atleta') {
        msgEl.textContent = 'Como atleta, os teus spots ficam visiveis para ti e para os teus seguidores.';
        reqGroup.style.display = 'block';
        if (btnEvent) btnEvent.style.display = 'none';
    } else if (userProfile.perfil?.role === 'empresa') {
        msgEl.textContent = 'Como empresa, os teus spots ficam publicos e visiveis para todos.';
        reqGroup.style.display = 'none';
        if (btnEvent) btnEvent.style.display = 'inline-flex';
    }
}

function initGlobe() {
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;

    globe = new Globe3D({
        canvas,
        markers: sampleMarkers,
        routes: sampleRoutes,
        config: GLOBE_CONFIG,
        onMarkerClick: handleGlobeMarkerClick,
        onMarkerHover: handleGlobeMarkerHover,
        onContinentHover: handleGlobeContinentHover
    });

    updateGlobeFromState();
}

async function loadSpots(modalidadeId = 'all') {
    try {
        currentModalidadeFilter = modalidadeId;
        const spots = await obterSpots({ modalidade_id: modalidadeId });
        currentSpots = spots;
        renderSpotMarkers(spots);
        renderSpotsList(spots);
        updateGlobeFromState();
        return spots;
    } catch (error) {
        console.error('Erro ao carregar spots:', error);
        return [];
    }
}

async function loadEventos() {
    try {
        const eventos = await obterEventos({});
        const participacoes = await obterParticipantesPorEventos(eventos.map((evento) => evento.id));

        currentEventParticipants = new Map();
        participacoes.forEach((participacao) => {
            const currentList = currentEventParticipants.get(participacao.evento_id) || [];
            currentList.push(participacao);
            currentEventParticipants.set(participacao.evento_id, currentList);
        });

        currentEventos = eventos.map((evento) => ({
            ...evento,
            participantes: currentEventParticipants.get(evento.id) || []
        }));

        renderEventMarkers(currentEventos);
        renderEventosList(currentEventos);
        updateGlobeFromState();
        return currentEventos;
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        return [];
    }
}

function renderSpotMarkers(spots) {
    spotMarkers.forEach(marker => map.removeLayer(marker));
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
        marker.boardSportsId = spot.id;
        marker.boardSportsKind = 'spot';

        const canEdit = userProfile && spot.criador_id === userProfile.id;
        const editBtn = canEdit ? `<button onclick="window.editarSpot(${spot.id})" style="background: #ff8c00; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>` : '';
        const deleteBtn = canEdit ? `<button onclick="window.apagarSpotMap(${spot.id})" style="background: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Apagar</button>` : '';
        const videoLink = spot.video_url
            ? `<p style="margin: 0 0 8px 0;"><a href="${spot.video_url}" target="_blank" style="color: #7ed6ff;">Ver video</a></p>`
            : '';

        marker.bindPopup(`
            <div style="color: white; min-width: 200px;">
                <h3 style="color: #ff8c00; margin: 0 0 5px 0;">${escapeHtml(spot.nome)}</h3>
                <p style="margin: 0 0 5px 0; font-size: 0.9rem;">${escapeHtml(spot.modalidades?.nome || '')}${spot.categorias?.nome ? ` - ${escapeHtml(spot.categorias.nome)}` : ''}</p>
                <p style="margin: 0 0 10px 0; font-size: 0.85rem;">${escapeHtml(spot.descricao || 'Sem descricao')}</p>
                ${videoLink}
                <small style="color: #888;">Por: ${escapeHtml(spot.profiles?.nome || 'Utilizador')}</small>
                <div style="margin-top: 10px;">
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
        `);

        spotMarkers.push(marker);
    });

    updateMapBounds();
}

function renderEventMarkers(eventos) {
    eventMarkers.forEach(marker => map.removeLayer(marker));
    eventMarkers = [];

    eventos.forEach((evento) => {
        const lat = Number(evento.coordenadas_lat);
        const lng = Number(evento.coordenadas_long);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

        const eventIcon = L.divIcon({
            className: 'checkpoint-icon',
            html: '<div class="event-marker">EV</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -24]
        });

        const marker = L.marker([lat, lng], { icon: eventIcon }).addTo(map);
        marker.boardSportsId = evento.id;
        marker.boardSportsKind = 'evento';

        const dataInicio = evento.data_inicio ? new Date(evento.data_inicio).toLocaleString('pt-PT') : '';
        const dataFim = evento.data_fim ? new Date(evento.data_fim).toLocaleString('pt-PT') : '';
        const canManage = userProfile && evento.criador_id === userProfile.id;
        const participantCount = Array.isArray(evento.participantes) ? evento.participantes.length : 0;
        const editBtn = canManage ? `<button onclick="window.editarEvento(${evento.id})" style="background: #00b09b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Editar</button>` : '';
        const deleteBtn = canManage ? `<button onclick="window.apagarEventoMapa(${evento.id})" style="background: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Apagar</button>` : '';

        marker.bindPopup(`
            <div style="color: white; min-width: 220px;">
                <h3 style="color: #00d1b2; margin: 0 0 5px 0;">${escapeHtml(evento.nome)}</h3>
                <p style="margin: 0 0 5px 0; font-size: 0.9rem;">${escapeHtml(dataInicio)}${dataFim ? ` - ${escapeHtml(dataFim)}` : ''}</p>
                <p style="margin: 0 0 5px 0; font-size: 0.85rem;">${escapeHtml(evento.localidade || 'Localidade por definir')}</p>
                <p style="margin: 0; font-size: 0.85rem;">${escapeHtml(evento.descricao || 'Sem descricao')}</p>
                <p style="margin: 8px 0 0; font-size: 0.8rem; color: #9fe8db;">${participantCount} ${participantCount === 1 ? 'participante' : 'participantes'}</p>
                ${canManage ? `<div style="margin-top: 10px;">${editBtn}${deleteBtn}</div>` : ''}
            </div>
        `);

        eventMarkers.push(marker);
    });

    updateMapBounds();
}

function updateMapBounds() {
    const bounds = L.latLngBounds([]);
    spotMarkers.forEach(marker => bounds.extend(marker.getLatLng()));
    eventMarkers.forEach(marker => bounds.extend(marker.getLatLng()));
    if (userLocationLatLng) bounds.extend(userLocationLatLng);

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        return;
    }

    if (userLocationLatLng) {
        map.setView(userLocationLatLng, 13);
    }
}

function buildGlobeMarkers() {
    const spotGlobeMarkers = currentSpots
        .filter(spot => Number.isFinite(Number(spot.coordenadas_lat)) && Number.isFinite(Number(spot.coordenadas_long)))
        .map((spot) => {
            const lat = Number(spot.coordenadas_lat);
            const lng = Number(spot.coordenadas_long);
            const subtitleParts = [spot.modalidades?.nome, spot.categorias?.nome].filter(Boolean);

            return {
                kind: 'spot',
                entityId: spot.id,
                lat,
                lng,
                label: spot.nome || 'Spot sem nome',
                subtitle: subtitleParts.join(' / ') || 'Spot',
                note: spot.descricao || 'Spot guardado na plataforma e pronto para ser explorado no mapa principal.',
                meta: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
                color: '#ff8c00',
                src: buildMarkerAvatar(spot.nome || 'Spot', '#ff8c00', getMarkerInitials(spot.nome, 'SP'))
            };
        });

    const eventGlobeMarkers = currentEventos
        .filter(evento => Number.isFinite(Number(evento.coordenadas_lat)) && Number.isFinite(Number(evento.coordenadas_long)))
        .map((evento) => {
            const lat = Number(evento.coordenadas_lat);
            const lng = Number(evento.coordenadas_long);
            const inicio = evento.data_inicio ? new Date(evento.data_inicio).toLocaleDateString('pt-PT') : 'Sem data';

            return {
                kind: 'evento',
                entityId: evento.id,
                lat,
                lng,
                label: evento.nome || 'Evento sem nome',
                subtitle: 'Evento',
                note: evento.descricao || 'Evento ativo no mapa. Ao clicar, o mapa principal abre diretamente o marcador.',
                meta: [inicio, evento.localidade].filter(Boolean).join(' | '),
                color: '#00d1b2',
                src: buildMarkerAvatar(evento.nome || 'Evento', '#00b09b', getMarkerInitials(evento.nome, 'EV'))
            };
        });

    return [...spotGlobeMarkers, ...eventGlobeMarkers];
}

function updateGlobeFromState() {
    if (!globe) return;

    const realMarkers = buildGlobeMarkers();
    globeUsingFallback = realMarkers.length === 0;
    currentGlobeMarkers = globeUsingFallback ? sampleMarkers : realMarkers;

    globe.setMarkers(currentGlobeMarkers);
    globe.setContinentStats(buildContinentSpotStats());
    updateGlobeStats(currentGlobeMarkers, globeUsingFallback);

    const activeMarker = getActiveGlobeMarker();
    if (activeMarker) {
        activeGlobeMarkerKey = getGlobeMarkerKey(activeMarker);
    }
    updateGlobeDetails(activeMarker);
}

function updateGlobeStats(markers, usingFallback) {
    const markerCount = document.getElementById('globe-marker-count');
    const sourceLabel = document.getElementById('globe-source-label');
    const routeCount = document.getElementById('globe-route-count');

    if (markerCount) markerCount.textContent = String(markers.length);
    if (sourceLabel) sourceLabel.textContent = usingFallback ? 'Demo' : 'Tempo real';
    if (routeCount) routeCount.textContent = String(sampleRoutes.length);
}

function updateGlobeDetails(item) {
    const avatar = document.getElementById('globe-active-avatar');
    const label = document.getElementById('globe-active-label');
    const type = document.getElementById('globe-active-type');
    const meta = document.getElementById('globe-active-meta');
    const note = document.getElementById('globe-active-note');
    const hoverLabel = document.getElementById('globe-hover-label');
    const hoverSubtitle = document.getElementById('globe-hover-subtitle');

    if (!item) {
        if (label) label.textContent = 'A preparar o globo';
        if (type) type.textContent = 'Sem marcador ativo';
        if (meta) meta.textContent = 'Passa o cursor sobre o globo';
        if (note) note.textContent = 'Os marcadores vao aparecer aqui com detalhe. Clica num spot ou evento real para focar automaticamente o mapa principal.';
        if (hoverLabel) hoverLabel.textContent = 'Exploracao global';
        if (hoverSubtitle) hoverSubtitle.textContent = 'Passa o cursor para inspecionar. Clica para focar.';
        return;
    }

    if (item.kind === 'continent') {
        const count = Number(item.spotCount || 0);
        const plural = count === 1 ? 'spot' : 'spots';

        if (avatar) {
            avatar.src = buildMarkerAvatar(item.label, item.color || '#4da6ff', item.abbr || 'CT');
            avatar.alt = item.label;
        }
        if (label) label.textContent = item.label;
        if (type) type.textContent = 'Continente';
        if (meta) meta.textContent = `${count} ${plural} nesta vista`;
        if (note) {
            note.textContent = count
                ? `O globo encontrou ${count} ${plural} neste continente com o filtro atual. Continua a rodar para localizar os marcadores individuais.`
                : 'Ainda nao ha spots visiveis neste continente com o filtro atual.';
        }
        if (hoverLabel) hoverLabel.textContent = item.label;
        if (hoverSubtitle) hoverSubtitle.textContent = `${count} ${plural} nesta vista`;
        return;
    }

    if (avatar) {
        avatar.src = item.src || buildMarkerAvatar(item.label, item.color || '#4da6ff', getMarkerInitials(item.label, 'GL'));
        avatar.alt = item.label;
    }
    if (label) label.textContent = item.label;
    if (type) type.textContent = buildMarkerTypeLabel(item.kind);
    if (meta) meta.textContent = item.meta || item.subtitle || 'Sem detalhe adicional';
    if (note) note.textContent = item.note || 'Sem detalhe adicional para este marker.';
    if (hoverLabel) hoverLabel.textContent = item.label;
    if (hoverSubtitle) hoverSubtitle.textContent = item.subtitle || buildMarkerTypeLabel(item.kind);
}

function handleGlobeMarkerClick(marker) {
    if (!marker) return;

    activeGlobeMarkerKey = getGlobeMarkerKey(marker);
    updateGlobeDetails(marker);

    if (marker.kind === 'spot' || marker.kind === 'evento') {
        focusMap(marker.lat, marker.lng, 14);
        openLeafletMarker(marker.kind, marker.entityId);

        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function handleGlobeMarkerHover(marker) {
    hoveredGlobeMarkerKey = marker ? getGlobeMarkerKey(marker) : null;

    if (marker) {
        updateGlobeDetails(marker);
        return;
    }

    if (hoveredGlobeContinentId) return;
    updateGlobeDetails(getActiveGlobeMarker());
}

function handleGlobeContinentHover(continent) {
    hoveredGlobeContinentId = continent ? continent.id : null;

    if (hoveredGlobeMarkerKey) return;

    if (continent) {
        updateGlobeDetails({ ...continent, kind: 'continent' });
        return;
    }

    updateGlobeDetails(getActiveGlobeMarker());
}

function openLeafletMarker(kind, entityId) {
    const collection = kind === 'evento' ? eventMarkers : spotMarkers;
    const leafletMarker = collection.find(marker => marker.boardSportsId === entityId);

    if (leafletMarker) {
        leafletMarker.openPopup();
    }
}

function getGlobeMarkerKey(marker) {
    return `${marker.kind || 'marker'}:${marker.entityId || marker.label}`;
}

function getActiveGlobeMarker() {
    return currentGlobeMarkers.find(marker => getGlobeMarkerKey(marker) === activeGlobeMarkerKey) || currentGlobeMarkers[0] || null;
}

function buildMarkerTypeLabel(kind) {
    if (kind === 'spot') return 'Spot em destaque';
    if (kind === 'evento') return 'Evento em destaque';
    return 'Marcador demo';
}

function buildContinentSpotStats() {
    const stats = Object.fromEntries(
        Object.entries(CONTINENT_INFO).map(([id, info]) => [
            id,
            {
                id,
                label: info.label,
                abbr: info.abbr,
                color: info.color,
                spotCount: 0
            }
        ])
    );

    currentSpots.forEach((spot) => {
        const lat = Number(spot.coordenadas_lat);
        const lng = Number(spot.coordenadas_long);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const continentId = getContinentIdForCoordinates(lat, lng);
        if (!continentId || !stats[continentId]) return;
        stats[continentId].spotCount += 1;
    });

    return stats;
}

function getContinentIdForCoordinates(lat, lng) {
    if (lat <= -60) return 'antarctica';

    if (lat >= 15 && lat <= 84 && lng >= -170 && lng <= -50) return 'north_america';
    if (lat >= 7 && lat < 15 && lng >= -100 && lng <= -60) return 'north_america';

    if (lat >= -58 && lat < 16 && lng >= -92 && lng <= -30) return 'south_america';

    if (lat >= 35 && lat <= 72 && lng >= -25 && lng <= 45) return 'europe';

    if (lat >= -35 && lat <= 37 && lng >= -20 && lng <= 55) return 'africa';

    if (lat >= -50 && lat <= 20 && lng >= 110 && lng <= 180) return 'oceania';
    if (lat >= -12 && lat <= 5 && (lng >= 95 && lng < 110)) return 'oceania';
    if (lat >= -50 && lat <= -10 && lng <= -150) return 'oceania';

    if (lat >= 5 && lat <= 82 && lng >= 25 && lng <= 180) return 'asia';
    if (lat >= 0 && lat <= 35 && lng >= 45 && lng < 60) return 'asia';

    return null;
}

function buildMarkerAvatar(label, backgroundColor, text) {
    const safeText = escapeSvg(text);
    const safeLabel = escapeSvg(label || 'Marker');
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stop-color="${backgroundColor}" />
                    <stop offset="100%" stop-color="#111827" />
                </linearGradient>
            </defs>
            <rect width="72" height="72" rx="20" fill="url(#g)" />
            <circle cx="36" cy="36" r="23" fill="rgba(255,255,255,0.14)" />
            <text x="36" y="43" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${safeText}</text>
            <title>${safeLabel}</title>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getMarkerInitials(label, fallback) {
    const words = String(label || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) return fallback;
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function escapeSvg(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        container.innerHTML = '<div class="no-spots"><p>Nenhum spot encontrado com o filtro atual.</p></div>';
        return;
    }

    container.innerHTML = spots.map((spot, index) => {
        const canEdit = userProfile && spot.criador_id === userProfile.id;
        const look = getSpotVisualLook(spot);
        const modalidade = spot.modalidades?.nome || 'Spot';
        const categoria = spot.categorias?.nome || 'Geral';
        const descricao = escapeHtml(spot.descricao || 'Sem descricao disponivel');
        const autor = escapeHtml(spot.profiles?.nome || 'Utilizador');
        const lat = Number(spot.coordenadas_lat);
        const lng = Number(spot.coordenadas_long);
        return `
            <div class="spot-card" data-spot-card style="--pin-accent:${look.accent}; --pin-accent-soft:${look.soft};" onclick="window.focusMap(${spot.coordenadas_lat}, ${spot.coordenadas_long})">
                <div class="spot-card-shell">
                    <div class="spot-card-surface">
                        <div class="spot-card-titlebar">
                            <div class="spot-card-link">/${escapeHtml(modalidade.toLowerCase())}/${spot.id}</div>
                            <div class="checkpoint-badge">CP ${index + 1}</div>
                        </div>

                        <div class="spot-card-preview">
                            <span class="spot-preview-icon">${look.icon}</span>
                            <div class="spot-preview-meta">
                                <div>
                                    <strong>${escapeHtml(spot.nome)}</strong>
                                    <span>${escapeHtml(modalidade)} / ${escapeHtml(categoria)}</span>
                                </div>
                                <span>${lat.toFixed(2)}, ${lng.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="spot-card-header">
                            <h3>${escapeHtml(spot.nome)}</h3>
                        </div>
                        <p><strong>${escapeHtml(modalidade)}</strong> | ${escapeHtml(categoria)}</p>
                        <p>${descricao}</p>
                        <p style="color: #888; font-size: 12px;">Por: ${autor}</p>
                        ${canEdit ? `
                            <div class="spot-actions">
                                <button class="btn-edit" onclick="window.editarSpot(${spot.id}); event.stopPropagation();">Editar</button>
                                <button class="btn-delete" onclick="window.apagarSpotMap(${spot.id}); event.stopPropagation();">Apagar</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="spot-card-stem"></div>
                <div class="spot-card-node"></div>
                <div class="spot-card-pulse"></div>
            </div>
        `;
    }).join('');

    attachSpotPinInteractions(container);
}

function attachSpotPinInteractions(container) {
    const cards = container.querySelectorAll('[data-spot-card]');

    cards.forEach((card) => {
        card.onpointermove = (event) => {
            const rect = card.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const percentX = (pointerX / rect.width) - 0.5;
            const percentY = (pointerY / rect.height) - 0.5;
            const rotateY = percentX * 12;
            const rotateX = percentY * -10;

            card.style.setProperty('--pin-rotate-x', `${rotateX.toFixed(2)}deg`);
            card.style.setProperty('--pin-rotate-y', `${rotateY.toFixed(2)}deg`);
            card.style.setProperty('--pin-translate-y', '-10px');
        };

        card.onpointerleave = () => {
            card.style.setProperty('--pin-rotate-x', '0deg');
            card.style.setProperty('--pin-rotate-y', '0deg');
            card.style.setProperty('--pin-translate-y', '0px');
        };
    });
}

function renderEventosList(eventos) {
    const container = document.getElementById('eventos-container');
    if (!container) return;

    if (!eventos.length) {
        container.innerHTML = '<div class="no-spots"><p>Ainda nao existem eventos registados.</p></div>';
        return;
    }

    container.innerHTML = eventos.map((evento, index) => {
        const canManage = userProfile && evento.criador_id === userProfile.id;
        const look = getEventVisualLook();
        const participantes = Array.isArray(evento.participantes) ? evento.participantes : [];
        const inicio = formatShortDate(evento.data_inicio);
        const fim = formatShortDate(evento.data_fim);
        const periodo = fim ? `${inicio} - ${fim}` : inicio;
        const participantCount = participantes.length;
        const pendingCount = participantes.filter((item) => !item.confirmado).length;
        const lat = Number(evento.coordenadas_lat);
        const lng = Number(evento.coordenadas_long);

        return `
            <div class="spot-card" data-spot-card style="--pin-accent:${look.accent}; --pin-accent-soft:${look.soft};" onclick="window.focusMap(${evento.coordenadas_lat}, ${evento.coordenadas_long})">
                <div class="spot-card-shell">
                    <div class="spot-card-surface">
                        <div class="spot-card-titlebar">
                            <div class="spot-card-link">/eventos/${evento.id}</div>
                            <div class="checkpoint-badge">EV ${index + 1}</div>
                        </div>

                        <div class="spot-card-preview">
                            <span class="spot-preview-icon">${look.icon}</span>
                            <div class="spot-preview-meta">
                                <div>
                                    <strong>${escapeHtml(evento.nome)}</strong>
                                    <span>${escapeHtml(evento.modalidade || evento.modalidades?.nome || 'Evento')} / ${escapeHtml(evento.localidade || 'Local a definir')}</span>
                                </div>
                                <span>${Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(2)}, ${lng.toFixed(2)}` : 'Sem ponto'}</span>
                            </div>
                        </div>

                        <div class="spot-card-header">
                            <h3>${escapeHtml(evento.nome)}</h3>
                        </div>
                        <p><strong>${escapeHtml(periodo)}</strong> | ${escapeHtml(evento.localidade || 'Localidade por definir')}</p>
                        <p>${escapeHtml(evento.descricao || 'Sem descricao disponivel')}</p>
                        <p style="color: #9fe8db; font-size: 12px;">${participantCount} ${participantCount === 1 ? 'participante' : 'participantes'}${canManage && pendingCount ? ` | ${pendingCount} por confirmar` : ''}</p>
                        ${canManage ? `
                            <div class="spot-actions">
                                <button class="btn-edit" onclick="window.editarEvento(${evento.id}); event.stopPropagation();">Editar</button>
                                <button class="btn-delete" onclick="window.apagarEventoMapa(${evento.id}); event.stopPropagation();">Apagar</button>
                            </div>
                            <div class="event-participants">
                                <div class="event-participants-head">
                                    <strong>Participantes</strong>
                                    <span>${participantCount}</span>
                                </div>
                                ${buildEventParticipantsMarkup(participantes)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="spot-card-stem"></div>
                <div class="spot-card-node"></div>
                <div class="spot-card-pulse"></div>
            </div>
        `;
    }).join('');

    attachSpotPinInteractions(container);
}

function buildEventParticipantsMarkup(participantes) {
    if (!participantes.length) {
        return '<p class="event-participants-empty">Ainda nao ha atletas inscritos.</p>';
    }

    return participantes.map((participacao) => `
        <div class="event-participant">
            <div>
                <strong>${escapeHtml(participacao.atleta?.nome || participacao.atleta?.email || 'Atleta')}</strong>
                <span>${participacao.confirmado ? 'Confirmado' : 'A aguardar confirmacao'}</span>
            </div>
            <div class="event-participant-actions">
                ${!participacao.confirmado ? `<button class="btn-edit" onclick="window.confirmarParticipacaoEvento(${participacao.id}); event.stopPropagation();">Confirmar</button>` : ''}
                <button class="btn-delete" onclick="window.removerParticipacaoEventoMapa(${participacao.id}); event.stopPropagation();">Remover</button>
            </div>
        </div>
    `).join('');
}

function getEventVisualLook() {
    return {
        accent: '#00d1b2',
        soft: 'rgba(0, 209, 178, 0.22)',
        icon: 'EV'
    };
}

function formatShortDate(value) {
    if (!value) return 'Sem data';
    return new Date(value).toLocaleString('pt-PT', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function getSpotVisualLook(spot) {
    const modalidade = (spot.modalidades?.nome || '').toLowerCase();

    if (modalidade.includes('surf')) {
        return {
            accent: '#1fb6ff',
            soft: 'rgba(31, 182, 255, 0.24)',
            icon: '🏄'
        };
    }

    if (modalidade.includes('skate')) {
        return {
            accent: '#ff8c00',
            soft: 'rgba(255, 140, 0, 0.24)',
            icon: '🛹'
        };
    }

    if (modalidade.includes('snow')) {
        return {
            accent: '#d8efff',
            soft: 'rgba(216, 239, 255, 0.24)',
            icon: '🏂'
        };
    }

    if (modalidade.includes('sand')) {
        return {
            accent: '#d6a14a',
            soft: 'rgba(214, 161, 74, 0.24)',
            icon: '🏜️'
        };
    }

    if (modalidade.includes('skim')) {
        return {
            accent: '#32d7c8',
            soft: 'rgba(50, 215, 200, 0.24)',
            icon: '🌊'
        };
    }

    return {
        accent: '#ff8c00',
        soft: 'rgba(255, 140, 0, 0.24)',
        icon: '📍'
    };
}

function focusMap(lat, lng, zoom = 14) {
    if (!map) return;
    map.setView([lat, lng], zoom);
}

window.focusMap = focusMap;

const spotForm = document.getElementById('form-spot');
const eventForm = document.getElementById('form-event');
const filterModalidade = document.getElementById('filter-modalidade');
const modal = document.getElementById('modal-spot');
const btnAdd = document.getElementById('btn-add-spot');
const spanClose = document.getElementsByClassName('close-modal')[0];
const modalEvent = document.getElementById('modal-event');
const btnEvent = document.getElementById('btn-add-event');
const closeEvent = document.getElementById('close-event');
const cancelEvent = document.getElementById('cancel-event');

spotForm.onsubmit = async (event) => {
    event.preventDefault();

    const user = await obterUsuarioAtual();
    if (!user) {
        showToast('Deves estar ligado para adicionar spots.', { type: 'warning' });
        return;
    }

    const videoUrl = document.getElementById('spot-video').value.trim();
    const spotData = {
        nome: document.getElementById('spot-nome').value,
        descricao: document.getElementById('spot-descricao').value,
        modalidade_id: parseInt(document.getElementById('spot-modalidade').value, 10),
        categoria_id: document.getElementById('spot-categoria').value ? parseInt(document.getElementById('spot-categoria').value, 10) : null,
        coordenadas_lat: parseFloat(document.getElementById('spot-lat').value),
        coordenadas_long: parseFloat(document.getElementById('spot-lng').value),
        criador_id: user.id,
        ...(videoUrl ? { video_url: videoUrl } : {})
    };

    let spot;

    if (spotEmEdicao) {
        const resultado = await atualizarSpot(spotEmEdicao, spotData);
        if (!resultado) {
            showToast('Erro ao atualizar spot.', { type: 'error' });
            return;
        }
        showToast('Spot atualizado com sucesso.', { type: 'success' });
        spotEmEdicao = null;
    } else {
        spot = await criarSpot(spotData);
        if (!spot) {
            showToast('Erro ao guardar spot.', { type: 'error' });
            return;
        }

        if (document.getElementById('request-public').checked) {
            await criarSolicitacaoPublicacao(spot.id, user.id);
            showToast('Spot guardado e enviado para moderacao.', { type: 'success', duration: 3800 });
        } else {
            showToast('Spot guardado com sucesso.', { type: 'success' });
        }

        await loadSpots(currentModalidadeFilter);
        focusMap(spotData.coordenadas_lat, spotData.coordenadas_long, 14);
    }

    closeModal();
    loadSpots(currentModalidadeFilter);
};

eventForm.onsubmit = async (event) => {
    event.preventDefault();

    const user = await obterUsuarioAtual();
    if (!user) {
        showToast('Deves estar ligado para adicionar eventos.', { type: 'warning' });
        return;
    }
    if (!userProfile || userProfile.perfil?.role !== 'empresa') {
        showToast('Apenas empresas podem adicionar eventos.', { type: 'warning' });
        return;
    }

    const eventoData = {
        nome: document.getElementById('event-nome').value,
        descricao: document.getElementById('event-descricao').value,
        modalidade_id: parseInt(document.getElementById('event-modalidade').value, 10),
        data_inicio: document.getElementById('event-data-inicio').value,
        data_fim: document.getElementById('event-data-fim').value,
        localidade: document.getElementById('event-localidade').value,
        coordenadas_lat: parseFloat(document.getElementById('event-lat').value),
        coordenadas_long: parseFloat(document.getElementById('event-lng').value),
        criador_id: user.id
    };

    const evento = await criarEvento(eventoData);
    if (!evento) {
        showToast('Erro ao guardar evento.', { type: 'error' });
        return;
    }

    showToast('Evento guardado com sucesso.', { type: 'success' });
    closeEventModal();
    await loadEventos();
    focusMap(eventoData.coordenadas_lat, eventoData.coordenadas_long, 14);
};

document.getElementById('spot-modalidade').onchange = async (event) => {
    const modId = event.target.value;
    const catSelect = document.getElementById('spot-categoria');

    if (!modId) {
        catSelect.disabled = true;
        catSelect.innerHTML = '<option value="">Selecionar Categoria</option>';
        return;
    }

    const cats = await obterCategoriasPorModalidade(modId);
    catSelect.disabled = false;
    catSelect.innerHTML = '<option value="">Selecionar Categoria</option>' +
        cats.map(categoria => `<option value="${categoria.id}">${escapeHtml(categoria.nome)}</option>`).join('');
};

filterModalidade.onchange = (event) => {
    loadSpots(event.target.value);
};

function openModal() {
    isEventMode = false;
    modal.style.display = 'flex';
    document.getElementById('modal-title').textContent = spotEmEdicao ? 'Editar Spot' : 'Criar Novo Spot';
}

function closeModal() {
    modal.style.display = 'none';
    spotForm.reset();
    spotEmEdicao = null;
    isEventMode = false;
}

window.closeModal = closeModal;

btnAdd.onclick = () => {
    isEventMode = false;
    showToast('Clica num ponto do mapa para definir a localizacao do spot.', { type: 'info' });
};

spanClose.onclick = closeModal;
window.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
});

function openEventModal() {
    modalEvent.style.display = 'flex';
}

function closeEventModal() {
    modalEvent.style.display = 'none';
    eventForm.reset();
    isEventMode = false;
}

window.closeEventModal = closeEventModal;

if (btnEvent) {
    btnEvent.onclick = () => {
        if (!userProfile || userProfile.perfil?.role !== 'empresa') {
            showToast('Apenas empresas podem adicionar eventos.', { type: 'warning' });
            return;
        }
        isEventMode = true;
        showToast('Clica num ponto do mapa para definir a localizacao do evento.', { type: 'info' });
    };
}

if (closeEvent) closeEvent.onclick = closeEventModal;
if (cancelEvent) cancelEvent.onclick = closeEventModal;
window.addEventListener('click', (event) => {
    if (event.target === modalEvent) closeEventModal();
});

window.editarSpot = async (spotId) => {
    const spots = await obterSpots({});
    const spot = spots.find(item => item.id === spotId);

    if (!spot) {
        showToast('Spot nao encontrado.', { type: 'error' });
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
        cats.map(categoria => `<option value="${categoria.id}" ${categoria.id === spot.categoria_id ? 'selected' : ''}>${escapeHtml(categoria.nome)}</option>`).join('');
    catSelect.disabled = false;

    openModal();
};

window.apagarSpotMap = async (spotId) => {
    const confirmed = await showConfirm({
        title: 'Apagar spot',
        message: 'Tem a certeza que quer apagar este spot?',
        confirmText: 'Apagar',
        danger: true
    });
    if (!confirmed) return;

    const resultado = await apagarSpot(spotId);
    if (resultado) {
        showToast('Spot apagado com sucesso.', { type: 'success' });
        loadSpots(currentModalidadeFilter);
    } else {
        showToast('Erro ao apagar spot.', { type: 'error' });
    }
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

window.addEventListener('beforeunload', () => {
    if (userLocationWatchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(userLocationWatchId);
    }
});
