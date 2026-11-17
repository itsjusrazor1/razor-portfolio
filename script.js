// Mobile navigation
const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? '×' : '☰';
  });
}

// RAZOR MUSIC PLAYER
// Music files are stored in this browser on this device only (IndexedDB).
// Visitors must choose their own audio file; it is never uploaded to your website.
(() => {
  const DB_NAME = 'razorPortfolioMusic';
  const STORE = 'settings';
  const DB_VERSION = 1;
  const audio = new Audio();
  audio.loop = true;
  let currentUrl = null;
  let savedBlob = null;

  const modal = document.createElement('section');
  modal.className = 'music-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'music-title');
  modal.innerHTML = `
    <div class="music-dialog">
      <button class="music-close" type="button" aria-label="Close music setup">×</button>
      <p class="eyebrow">YOUR BROWSING SOUNDTRACK</p>
      <h2 id="music-title">Add some <span>music.</span></h2>
      <p class="music-description">Choose an audio file from your device, or skip this for now. Your file stays on this device.</p>
      <label class="music-file-label">Choose audio file
        <input class="music-file" type="file" accept="audio/*">
      </label>
      <p class="music-filename" aria-live="polite">No file selected</p>
      <div class="music-modal-actions">
        <button class="button primary music-play" type="button" disabled>▶ Play</button>
        <button class="button secondary music-skip" type="button">Skip</button>
      </div>
      <p class="music-hint">Browsers require a button press before audio can play.</p>
    </div>`;
  document.body.appendChild(modal);

  const player = document.createElement('aside');
  player.className = 'music-player';
  player.innerHTML = `
    <span class="music-player-mark">♫</span>
    <span class="music-player-name">No music selected</span>
    <button type="button" class="music-control music-toggle" aria-label="Play music" title="Play / pause">▶</button>
    <button type="button" class="music-control music-change" aria-label="Change music" title="Change music">＋</button>
    <button type="button" class="music-control music-stop" aria-label="Stop music" title="Stop music">■</button>`;
  document.body.appendChild(player);

  const fileInput = modal.querySelector('.music-file');
  const playButton = modal.querySelector('.music-play');
  const filename = modal.querySelector('.music-filename');
  const playerName = player.querySelector('.music-player-name');
  const toggleButton = player.querySelector('.music-toggle');

  function openModal() { modal.classList.add('visible'); }
  function closeModal() { modal.classList.remove('visible'); }
  function setFile(blob, name) {
    savedBlob = blob;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(blob);
    audio.src = currentUrl;
    filename.textContent = name || 'Selected audio';
    playerName.textContent = name || 'Selected audio';
    playButton.disabled = false;
    player.classList.add('visible');
    // TODO: Add a preferred default track here only if you have permission to use it.
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return resolve(null);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function saveTrack(blob, name) {
    try {
      const db = await openDatabase();
      if (!db) return;
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ blob, name }, 'track');
    } catch (error) { console.warn('Could not save music selection:', error); }
  }
  async function loadTrack() {
    try {
      const db = await openDatabase();
      if (!db) return null;
      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE).objectStore(STORE).get('track');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) { console.warn('Could not restore music selection:', error); return null; }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      filename.textContent = 'Please choose a supported audio file.';
      return;
    }
    setFile(file, file.name);
    await saveTrack(file, file.name);
  });
  playButton.addEventListener('click', async () => {
    if (!audio.src) return;
    try { await audio.play(); closeModal(); }
    catch (error) { filename.textContent = 'Could not play this file. Try another audio format.'; }
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
  });
  audio.addEventListener('pause', () => {
    toggleButton.textContent = '▶';
    toggleButton.setAttribute('aria-label', 'Play music');
  });
  audio.addEventListener('ended', () => { toggleButton.textContent = '▶'; });

  loadTrack().then(track => {
    if (track && track.blob) setFile(track.blob, track.name);
  });
  if (!localStorage.getItem('razorMusicPromptSeen')) {
    // Show the welcome prompt once; the corner player remains available afterward.
    openModal();
    localStorage.setItem('razorMusicPromptSeen', 'yes');
  }
})();
