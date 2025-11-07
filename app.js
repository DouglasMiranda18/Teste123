(function () {
  const locationElement = document.getElementById('user-location');
  if (!locationElement) return;

  const STORAGE_KEY = 'alugadrive:userLocation';
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

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

  async function getIpLocationIpwho() {
    const res = await fetch('https://ipwho.is/?lang=pt-BR', { mode: 'cors' });
    if (!res.ok) throw new Error('Falha IP ipwho');
    const data = await res.json();
    if (!data.success) throw new Error('ipwho sem sucesso');
    return {
      city: data.city || '',
      state: data.region || '',
      country: data.country || '',
      lat: data.latitude,
      lon: data.longitude,
      ip: data.ip || ''
    };
  }

  async function getIpLocationIpapi() {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('Falha IP ipapi');
    const data = await res.json();
    return {
      city: data.city || '',
      state: data.region || '',
      country: data.country_name || data.country || '',
      lat: data.latitude,
      lon: data.longitude,
      ip: data.ip || ''
    };
  }

  async function getIpLocation() {
    let base;
    try {
      base = await getIpLocationIpwho();
    } catch (_) {
      base = await getIpLocationIpapi();
    }
    const display = (base.city && base.state) ? `${base.city} - ${base.state}` : (base.city || base.state || base.country || 'Localização detectada');
    return { ...base, display, source: 'ip' };
  }

  async function reverseGeocodeLatLon(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=pt-BR&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, mode: 'cors' });
    if (!res.ok) throw new Error('Falha ao obter endereço por lat/lon');
    const data = await res.json();
    const address = data.address || {};
    const road = address.road || '';
    const neighbourhood = address.neighbourhood || address.suburb || '';
    const city = address.city || address.town || address.village || '';
    const state = address.state || address.state_district || '';
    const postcode = address.postcode || '';
    const line = [road, neighbourhood, [city, state].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    return { addressLine: line, road, neighbourhood, city, state, postcode };
  }

  async function saveToFirestore(info) {
    try {
      if (!window.db) return; // Firebase não configurado
      const payload = {
        city: info.city || null,
        state: info.state || null,
        country: info.country || null,
        lat: typeof info.lat === 'number' ? info.lat : null,
        lon: typeof info.lon === 'number' ? info.lon : null,
        ip: info.ip || null,
        address: info.addressLine || null,
        road: info.road || null,
        neighbourhood: info.neighbourhood || null,
        postcode: info.postcode || null,
        source: info.source || 'ip',
        ua: navigator.userAgent,
        ts: (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue)
          ? window.firebase.firestore.FieldValue.serverTimestamp()
          : new Date()
      };
      const docRef = await window.db.collection('entradas').add(payload);
      try { localStorage.setItem('alugadrive:lastEntryId', docRef.id); } catch (_) {}
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
      const base = await getIpLocation();
      let enriched = base;
      try {
        const rev = await reverseGeocodeLatLon(base.lat, base.lon);
        enriched = { ...base, ...rev };
        if (rev.addressLine) enriched.display = rev.addressLine;
      } catch (_) {
        // se reverse falhar, mantém base
      }
      saveCache(enriched);
      setText(enriched.display);
      saveToFirestore(enriched);
    } catch (err) {
      setText('Não foi possível obter a localização');
    }
  }

  async function refreshInBackground() {
    try {
      const base = await getIpLocation();
      let enriched = base;
      try {
        const rev = await reverseGeocodeLatLon(base.lat, base.lon);
        enriched = { ...base, ...rev };
        if (rev.addressLine) enriched.display = rev.addressLine;
      } catch (_) {}
      saveCache(enriched);
      setText(enriched.display);
      saveToFirestore(enriched);
    } catch (_) {
      // silencioso
    }
  }

  // Init
  setText('Localizando sua região...');
  resolveAndShow();
})();


