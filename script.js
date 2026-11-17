// Site interactions. Internal page changes use lightweight navigation so the
// same audio player stays alive instead of being destroyed by a full reload.
function initSiteUI() {
  const menuButton = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuButton && navLinks && !menuButton.dataset.bound) {
    menuButton.dataset.bound = 'yes';
    menuButton.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? '×' : '☰';
    });
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-copy]:not([data-copy-bound])').forEach(copyButton => {
    copyButton.dataset.copyBound = 'yes';
    copyButton.addEventListener('click', async () => {
      const toast = document.querySelector('.toast');
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyButton.textContent = 'Copied!';
        if (toast) toast.textContent = 'Discord username copied.';
      } catch {
        if (toast) toast.textContent = 'Discord username: ' + copyButton.dataset.copy;
      }
      if (toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
      setTimeout(() => copyButton.textContent = 'Copy', 2200);
    });
  });
}

function setActiveNav(pathname) {
  document.querySelectorAll('.nav-links a').forEach(link => {
    const target = new URL(link.href, location.href).pathname;
    link.classList.toggle('active', target === pathname);
  });
}

async function navigatePage(url, addHistory = true) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Page could not be loaded');
    const html = await response.text();
    const nextDoc = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = nextDoc.querySelector('main');
    const currentMain = document.querySelector('main');
    if (!nextMain || !currentMain) { location.href = url; return; }
    currentMain.replaceWith(nextMain);
    const nextFooter = nextDoc.querySelector('.footer');
    const currentFooter = document.querySelector('.footer');
    if (nextFooter && currentFooter) currentFooter.replaceWith(nextFooter);
    document.title = nextDoc.title || 'Razor';
    if (addHistory) history.pushState({}, '', url);
    setActiveNav(new URL(url, location.href).pathname);
    initSiteUI();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) {
    location.href = url;
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || url.hash) return;
  event.preventDefault();
  navigatePage(url.href);
});

window.addEventListener('popstate', () => navigatePage(location.href, false));
initSiteUI();

// Music uses short previews returned by the iTunes Search API, not full tracks.
// The song names below came from the playlist screenshot supplied for this update.
(() => {
  const starterSongs = [
    { title: 'Janice STFU', artist: 'Drake', search: 'Janice STFU Drake' },
    { title: "Shotta's", artist: 'Season 25', search: "Shotta's Season 25" },
    { title: 'Love Sosa', artist: 'Chief Keef', search: 'Love Sosa Chief Keef' },
    { title: 'Morning Dew', artist: 'Xavier Wulf, Bones', search: 'Morning Dew Xavier Wulf Bones' },
    { title: 'Routine Rouge', artist: 'PARTYNEXTDOOR', search: 'Routine Rouge PARTYNEXTDOOR' },
    { title: 'Her Way', artist: 'PARTYNEXTDOOR', search: 'Her Way PARTYNEXTDOOR' },
    { title: 'Out The Way', artist: 'Yeat', search: 'Out The Way Yeat' },
    { title: 'National Treasures', artist: 'Drake', search: 'National Treasures Drake' },
    { title: 'COME N GO', artist: 'Yeat', search: 'COME N GO Yeat' },
    { title: 'No Pole', artist: 'Don Toliver', search: 'No Pole Don Toliver' }
  ];

  const audio = new Audio();
  audio.preload = 'none';
  let songs = [];
  let selected = null;
  let searchTimer;
  let requestNumber = 0;
  let promptSeen = false;
  try { promptSeen = sessionStorage.getItem('razorMusicPromptSeen') === 'yes'; } catch {}

  const modal = document.createElement('section');
  modal.className = 'music-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'music-title');
  modal.innerHTML = `
    <div class="music-dialog">
      <button class="music-close" type="button" aria-label="Close music picker">×</button>
      <div class="music-heading-row"><div><p class="kicker">RAZOR SOUNDTRACK</p><h2 id="music-title">Pick the <em>vibe.</em></h2><p class="music-description">Choose a song preview for while you look around.</p></div><button class="music-random" type="button">Random ↗</button></div>
      <div class="music-list-heading"><strong>Choose a track</strong><span class="music-count">Loading songs…</span></div>
      <label class="music-search-wrap"><span>⌕</span><input class="music-search" type="search" placeholder="Search songs or artists…" autocomplete="off"></label>
      <div class="music-track-list" aria-live="polite"><p class="music-loading">Loading song previews…</p></div>
      <div class="music-footer-row"><span class="music-selected-label">No song selected</span><button class="btn btn-primary music-enter" type="button" disabled>Enter site <span>↗</span></button></div>
      <p class="music-hint">Music previews are short clips. Press Enter site to start playing.</p>
      <button class="music-skip" type="button">Continue without music</button>
    </div>`;
  document.body.appendChild(modal);

  const player = document.createElement('aside');
  player.className = 'music-player';
  player.innerHTML = `<span class="player-note">♫</span><span class="player-copy"><small>NOW PLAYING</small><b class="player-name">No song selected</b></span><button type="button" class="player-control player-toggle" aria-label="Play or pause">▶</button><button type="button" class="player-control player-change" aria-label="Change song">＋</button><button type="button" class="player-control player-stop" aria-label="Stop music">■</button>`;
  document.body.appendChild(player);

  const list = modal.querySelector('.music-track-list');
  const search = modal.querySelector('.music-search');
  const count = modal.querySelector('.music-count');
  const selectedLabel = modal.querySelector('.music-selected-label');
  const enter = modal.querySelector('.music-enter');
  const playerName = player.querySelector('.player-name');
  const toggle = player.querySelector('.player-toggle');

  const openPicker = () => modal.classList.add('visible');
  const closePicker = () => modal.classList.remove('visible');

  async function lookup(song) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(song.search || song)}&entity=song&limit=15`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      const results = (data.results || []).filter(item => item.previewUrl && item.trackName && item.artistName);
      if (!results.length) return null;
      const wantedTitle = (song.title || song).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const wantedArtist = (song.artist || '').toLowerCase();
      const score = item => {
        const title = item.trackName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const artist = item.artistName.toLowerCase();
        let points = 0;
        if (title === wantedTitle) points += 10;
        else if (title.includes(wantedTitle) || wantedTitle.includes(title)) points += 5;
        if (wantedArtist && artist.includes(wantedArtist.split(',')[0].trim())) points += 4;
        return points;
      };
      results.sort((a,b) => score(b)-score(a));
      const item = results[0];
      if (score(item) < 5) return null;
      return { id: String(item.trackId), title: song.title || item.trackName, artist: song.artist || item.artistName, actualTitle: item.trackName, preview: item.previewUrl, artwork: (item.artworkUrl100 || '').replace('100x100','300x300') };
    } catch (error) {
      console.warn('Could not load a music preview:', error);
      return null;
    }
  }

  function render(items) {
    list.innerHTML = '';
    count.textContent = `${items.length} ${items.length === 1 ? 'song' : 'songs'}`;
    if (!items.length) { list.innerHTML = '<p class="music-loading">No preview found. Try another search.</p>'; return; }
    items.forEach(song => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'music-track' + (selected && selected.id === song.id ? ' selected' : '');
      const art = song.artwork ? `<img class="music-track-art" src="${song.artwork}" alt="" loading="lazy">` : '<span class="music-track-art">♫</span>';
      row.innerHTML = `${art}<span class="music-track-copy"><strong></strong><small></small></span><span class="music-track-add">${selected && selected.id === song.id ? '✓' : '+'}</span>`;
      row.querySelector('strong').textContent = song.title;
      row.querySelector('small').textContent = song.artist;
      row.addEventListener('click', () => choose(song));
      list.appendChild(row);
    });
  }

  function choose(song) {
    selected = song;
    selectedLabel.textContent = `Selected: ${song.title} — ${song.artist}`;
    playerName.textContent = song.title;
    enter.disabled = false;
    render(songs);
  }

  async function loadStarterSongs() {
    list.innerHTML = '<p class="music-loading">Finding the songs from your playlist…</p>';
    const results = await Promise.all(starterSongs.map(lookup));
    songs = results.filter(Boolean);
    render(songs);
    if (!songs.length) list.innerHTML = '<p class="music-loading">Song previews are not available right now. Check your connection or search for a song.</p>';
  }

  async function searchSongs(term) {
    const version = ++requestNumber;
    if (!term.trim()) { render(songs); return; }
    list.innerHTML = '<p class="music-loading">Searching…</p>';
    const found = await lookup({ title: term, artist: '', search: term });
    if (version !== requestNumber) return;
    const matches = found ? [found] : [];
    render(matches);
    if (found && !songs.some(song => song.id === found.id)) songs = [found, ...songs];
  }

  search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => searchSongs(search.value), 400); });
  modal.querySelector('.music-random').addEventListener('click', () => { if (songs.length) choose(songs[Math.floor(Math.random() * songs.length)]); });
  enter.addEventListener('click', async () => {
    if (!selected) return;
    audio.src = selected.preview;
    try {
      await audio.play();
      player.classList.add('visible');
      closePicker();
      try { sessionStorage.setItem('razorMusicPromptSeen', 'yes'); localStorage.setItem('razorLastSong', JSON.stringify({ title: selected.title, artist: selected.artist, preview: selected.preview, artwork: selected.artwork })); } catch {}
    } catch { selectedLabel.textContent = 'Could not play that preview. Try another song.'; }
  });
  modal.querySelector('.music-skip').addEventListener('click', () => { try { sessionStorage.setItem('razorMusicPromptSeen', 'yes'); } catch {} closePicker(); });
  modal.querySelector('.music-close').addEventListener('click', () => { try { sessionStorage.setItem('razorMusicPromptSeen', 'yes'); } catch {} closePicker(); });
  player.querySelector('.player-change').addEventListener('click', openPicker);
  toggle.addEventListener('click', async () => {
    if (!audio.src && selected) audio.src = selected.preview;
    if (!audio.src) return openPicker();
    if (audio.paused) { try { await audio.play(); } catch { openPicker(); } } else audio.pause();
  });
  player.querySelector('.player-stop').addEventListener('click', () => { audio.pause(); audio.currentTime = 0; player.classList.remove('visible'); });
  audio.addEventListener('play', () => { toggle.textContent = 'Ⅱ'; player.classList.add('visible'); });
  audio.addEventListener('pause', () => { toggle.textContent = '▶'; });
  audio.addEventListener('ended', () => { toggle.textContent = '▶'; });

  loadStarterSongs();
  if (!promptSeen) openPicker();
})();
