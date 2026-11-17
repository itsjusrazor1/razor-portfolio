// Mobile navigation
const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.textContent = isOpen ? '×' : '☰';
  });
}

// Razor soundtrack picker. Tracks are 30-second previews supplied by the
// iTunes Search API; this does not stream or host full commercial songs.
(() => {
  const starterTracks = [
    { term: 'Janice STFU Drake', label: 'Janice STFU', artist: 'Drake' },
    { term: "Shotta's Season 25", label: "Shotta's", artist: 'Season 25' },
    { term: 'Love Sosa Chief Keef', label: 'Love Sosa', artist: 'Chief Keef' },
    { term: 'Morning Dew Xavier Wulf Bones', label: 'Morning Dew', artist: 'Xavier Wulf, Bones' },
    { term: 'Routine Rouge PARTYNEXTDOOR', label: 'Routine Rouge', artist: 'PARTYNEXTDOOR' },
    { term: 'Her Way PARTYNEXTDOOR', label: 'Her Way', artist: 'PARTYNEXTDOOR' },
    { term: 'Out The Way Yeat', label: 'Out The Way', artist: 'Yeat' },
    { term: 'National Treasures Drake', label: 'National Treasures', artist: 'Drake' },
    { term: 'COME N GO Yeat', label: 'COME N GO', artist: 'Yeat' },
    { term: 'No Pole Don Toliver', label: 'No Pole', artist: 'Don Toliver' }
  ];

  const audio = new Audio();
  let tracks = [];
  let selectedTrack = null;
  let searchVersion = 0;

  const modal = document.createElement('section');
  modal.className = 'music-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'music-title');
  modal.innerHTML = `
    <div class="music-dialog">
      <button class="music-close" type="button" aria-label="Close music picker">×</button>
      <div class="music-heading-row">
        <div><p class="eyebrow">RAZOR SOUNDTRACK</p><h2 id="music-title">Choose a <span>song.</span></h2>
        <p class="music-description">Pick a track to play a short preview while you browse.</p></div>
        <button class="music-random" type="button">Random ↗</button>
      </div>
      <div class="music-list-heading"><strong>Choose a track</strong><span class="music-count">Loading tracks…</span></div>
      <label class="music-search-wrap"><span>⌕</span><input class="music-search" type="search" placeholder="Search songs or artists…" autocomplete="off"></label>
      <div class="music-track-list" aria-live="polite"><p class="music-loading">Finding song previews…</p></div>
      <div class="music-footer-row"><span class="music-selected-label">No track selected</span><button class="button primary music-enter" type="button" disabled>Enter site <span>↗</span></button></div>
      <p class="music-hint">Previews are about 30 seconds. Press Enter site to start playback.</p>
      <button class="music-skip" type="button">Continue without music</button>
    </div>`;
  document.body.appendChild(modal);

  const player = document.createElement('aside');
  player.className = 'music-player';
  player.innerHTML = `<span class="music-player-mark">♫</span><span class="music-player-meta"><small>NOW PLAYING</small><strong class="music-player-name">No track selected</strong></span><button type="button" class="music-control music-toggle" aria-label="Play music" title="Play / pause">▶</button><button type="button" class="music-control music-change" aria-label="Change music" title="Choose another song">＋</button><button type="button" class="music-control music-stop" aria-label="Stop music" title="Stop music">■</button>`;
  document.body.appendChild(player);

  const list = modal.querySelector('.music-track-list');
  const searchInput = modal.querySelector('.music-search');
  const enterButton = modal.querySelector('.music-enter');
  const selectedLabel = modal.querySelector('.music-selected-label');
  const countLabel = modal.querySelector('.music-count');
  const playerName = player.querySelector('.music-player-name');
  const toggleButton = player.querySelector('.music-toggle');

  function openModal() { modal.classList.add('visible'); }
  function closeModal() { modal.classList.remove('visible'); }

  async function findPreview(term, fallback) {
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=8`);
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      const results = (data.results || []).filter(item => item.previewUrl && item.trackName && item.artistName);
      if (!results.length) return null;
      const normalized = term.toLowerCase();
      results.sort((a, b) => {
        const score = item => {
          const title = (item.trackName + ' ' + item.artistName).toLowerCase();
          return normalized.split(/\s+/).reduce((n, word) => n + (title.includes(word) ? 1 : 0), 0);
        };
        return score(b) - score(a);
      });
      const item = results[0];
      return { id: String(item.trackId), title: item.trackName, artist: item.artistName, preview: item.previewUrl, artwork: item.artworkUrl100 || '', source: 'Apple preview' };
    } catch (error) {
      console.warn('Music search could not load:', error);
      return null;
    }
  }

  function renderTracks(items) {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<p class="music-loading">No previews found. Try another search.</p>';
      countLabel.textContent = '0 tracks';
      return;
    }
    countLabel.textContent = `${items.length} tracks`;
    items.forEach(track => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'music-track' + (selectedTrack && selectedTrack.id === track.id ? ' selected' : '');
      row.innerHTML = `<span class="music-track-art">♫</span><span class="music-track-copy"><strong></strong><small></small></span><span class="music-track-add">＋</span>`;
      row.querySelector('strong').textContent = track.title;
      row.querySelector('small').textContent = track.artist;
      row.addEventListener('click', () => selectTrack(track));
      list.appendChild(row);
    });
  }

  function selectTrack(track) {
    selectedTrack = track;
    selectedLabel.textContent = `Selected: ${track.title} — ${track.artist}`;
    playerName.textContent = track.title;
    enterButton.disabled = false;
    renderTracks(tracks);
  }

  async function loadStarterTracks() {
    list.innerHTML = '<p class="music-loading">Finding song previews…</p>';
    const found = await Promise.all(starterTracks.map(item => findPreview(item.term, item)));
    tracks = found.filter(Boolean);
    renderTracks(tracks);
    if (!tracks.length) list.innerHTML = '<p class="music-loading">Song previews could not load right now. Check your connection or search again.</p>';
  }

  async function searchTracks(query) {
    const version = ++searchVersion;
    if (!query.trim()) { renderTracks(tracks); return; }
    list.innerHTML = '<p class="music-loading">Searching…</p>';
    const results = await findPreview(query);
    if (version !== searchVersion) return;
    const found = results ? [results] : [];
    renderTracks(found);
    if (found.length) tracks = [...found, ...tracks.filter(track => track.id !== found[0].id)];
  }

  let searchDelay;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDelay);
    searchDelay = setTimeout(() => searchTracks(searchInput.value), 350);
  });

  modal.querySelector('.music-random').addEventListener('click', () => {
    if (!tracks.length) return;
    selectTrack(tracks[Math.floor(Math.random() * tracks.length)]);
  });

  enterButton.addEventListener('click', async () => {
    if (!selectedTrack) return;
    audio.src = selectedTrack.preview;
    audio.loop = false;
    try {
      await audio.play();
      player.classList.add('visible');
      closeModal();
      localStorage.setItem('razorMusicPromptSeen', 'yes');
    } catch (error) {
      selectedLabel.textContent = 'Preview could not play. Choose another track.';
    }
  });

  modal.querySelector('.music-skip').addEventListener('click', () => {
    localStorage.setItem('razorMusicPromptSeen', 'yes');
    closeModal();
  });
  modal.querySelector('.music-close').addEventListener('click', () => {
    localStorage.setItem('razorMusicPromptSeen', 'yes');
    closeModal();
  });
  player.querySelector('.music-change').addEventListener('click', openModal);
  toggleButton.addEventListener('click', async () => {
    if (!audio.src && selectedTrack) audio.src = selectedTrack.preview;
    if (!audio.src) return openModal();
    if (audio.paused) {
      try { await audio.play(); } catch (error) { openModal(); }
    } else audio.pause();
  });
  player.querySelector('.music-stop').addEventListener('click', () => {
    audio.pause();
    audio.currentTime = 0;
    toggleButton.textContent = '▶';
    toggleButton.setAttribute('aria-label', 'Play music');
  });
  audio.addEventListener('play', () => {
    toggleButton.textContent = 'Ⅱ';
    toggleButton.setAttribute('aria-label', 'Pause music');
    player.classList.add('visible');
  });
  audio.addEventListener('pause', () => {
    toggleButton.textContent = '▶';
    toggleButton.setAttribute('aria-label', 'Play music');
  });
  audio.addEventListener('ended', () => {
    toggleButton.textContent = '▶';
    toggleButton.setAttribute('aria-label', 'Play music');
  });

  loadStarterTracks();
  if (!localStorage.getItem('razorMusicPromptSeen')) openModal();
})();
