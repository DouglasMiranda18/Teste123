(function () {
  const locationElement = document.getElementById('user-location');
  if (!locationElement) return;

  const STORAGE_KEY = 'alugadrive:userLocation';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

  function setText(text) {
    locationElement.textContent = text;
  }

  function loadCached() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.timestamp) return null;
      if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, timestamp: Date.now() }));
    } catch (_) {
      // ignore
    }
  }

  async function getIpLocation() {
    const res = await fetch('https://ipwho.is/?lang=pt-BR');
    if (!res.ok) throw new Error('Falha IP geolocation');
    const data = await res.json();
    if (!data.success) throw new Error('IP geolocation sem sucesso');
    const city = data.city || '';
    const state = data.region || '';
    const country = data.country || '';
    const lat = data.latitude;
    const lon = data.longitude;
    const ip = data.ip || '';
    const display = (city && state) ? `${city} - ${state}` : (city || state || country || 'Localização detectada');
    return { display, city, state, country, lat, lon, ip, source: 'ip' };
  }

  async function saveToFirestore(info) {
    try {
      if (!window.db) return; // Firebase não configurado
      await window.db.collection('entradas').add({
        city: info.city || null,
        state: info.state || null,
        country: info.country || null,
        lat: typeof info.lat === 'number' ? info.lat : null,
        lon: typeof info.lon === 'number' ? info.lon : null,
        ip: info.ip || null,
        source: info.source || 'ip',
        ua: navigator.userAgent,
        ts: (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue)
          ? window.firebase.firestore.FieldValue.serverTimestamp()
          : new Date()
      });
    } catch (_) {
      // silencioso
    }
  }

  async function resolveAndShow() {
    const cached = loadCached();
    if (cached) {
      setText(cached.city && cached.state ? `${cached.city} - ${cached.state}` : cached.display);
      // Registra esta visita com dados em cache
      try { saveToFirestore(cached); } catch (_) {}
      // Atualiza em background com IP atual
      try { refreshInBackground(); } catch (_) {}
      return;
    }

    try {
      const info = await getIpLocation();
      saveCache(info);
      setText(info.display);
      saveToFirestore(info);
    } catch (err) {
      setText('Não foi possível obter a localização');
    }
  }

  async function refreshInBackground() {
    try {
      const info = await getIpLocation();
      saveCache(info);
      setText(info.display);
      saveToFirestore(info);
    } catch (_) {
      // silencioso
    }
  }

  // Init
  setText('Localizando sua região...');
  resolveAndShow();
})();


