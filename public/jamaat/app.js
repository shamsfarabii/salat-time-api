const statusBar = document.getElementById('status-bar');
const prayerList = document.getElementById('prayer-list');
const refreshButton = document.getElementById('refresh');
const saveAllButton = document.getElementById('save-all');

/** @type {Map<string, HTMLInputElement>} */
const inputsByPrayer = new Map();

function setStatus(message, state) {
  statusBar.textContent = message;
  statusBar.dataset.state = state;
}

function formatUpdatedAt(iso) {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `Updated ${date.toLocaleString()}`;
}

function renderPrayers(prayers) {
  prayerList.replaceChildren();
  inputsByPrayer.clear();

  for (const entry of prayers) {
    const card = document.createElement('li');
    card.className = 'prayer-card';
    card.dataset.set = String(entry.isSet);

    const head = document.createElement('div');
    head.className = 'prayer-head';

    const name = document.createElement('span');
    name.className = 'prayer-name';
    name.textContent = entry.prayer;

    const current = document.createElement('span');
    current.className = 'current-time';
    current.textContent = entry.isSet ? entry.formatted : 'Not set';

    head.append(name, current);

    const updated = document.createElement('div');
    updated.className = 'updated';
    updated.textContent = formatUpdatedAt(entry.updatedAt);

    const form = document.createElement('form');
    form.className = 'prayer-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'time';
    input.autocomplete = 'off';
    input.placeholder = 'e.g. 5:55 AM';
    input.inputMode = 'text';
    if (entry.isSet) {
      input.value = entry.formatted;
    }
    inputsByPrayer.set(entry.prayer, input);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Save';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      savePrayer(entry.prayer, saveButton);
    });

    form.append(input, saveButton);
    card.append(head, updated, form);
    prayerList.append(card);
  }
}

async function loadSetup() {
  setStatus('Loading current jamaat times…', 'loading');
  refreshButton.disabled = true;
  saveAllButton.disabled = true;

  try {
    const response = await fetch('/jamaat-times/setup');
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed (${response.status})`);
    }

    const data = await response.json();
    renderPrayers(data.prayers ?? []);
    setStatus('Schedule loaded from this server’s database.', 'ok');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load';
    setStatus(message, 'error');
  } finally {
    refreshButton.disabled = false;
    saveAllButton.disabled = false;
  }
}

/**
 * @param {string} prayer
 * @param {string} time
 */
async function postJamaatTime(prayer, time) {
  const response = await fetch('/jamaat-times/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prayer, time }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Save failed (${response.status})`);
  }

  return body;
}

async function savePrayer(prayer, button, options = {}) {
  const { reload = true } = options;
  const input = inputsByPrayer.get(prayer);
  if (!input) {
    return false;
  }

  const time = input.value.trim();
  if (!time) {
    setStatus(`Enter a time for ${prayer}.`, 'error');
    input.focus();
    return false;
  }

  if (button) {
    button.disabled = true;
  }
  setStatus(`Saving ${prayer}…`, 'loading');

  try {
    const body = await postJamaatTime(prayer, time);
    setStatus(`Saved ${body.prayer} → ${body.formatted}`, 'ok');
    if (reload) {
      await loadSetup();
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Save failed';
    setStatus(message, 'error');
    return false;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function saveAll() {
  const prayers = [...inputsByPrayer.keys()];
  saveAllButton.disabled = true;

  let savedCount = 0;
  for (const prayer of prayers) {
    const input = inputsByPrayer.get(prayer);
    if (!input?.value.trim()) {
      continue;
    }
    const saved = await savePrayer(prayer, null, { reload: false });
    if (saved) {
      savedCount += 1;
    }
  }

  if (savedCount > 0) {
    await loadSetup();
    setStatus(`Saved ${savedCount} prayer time(s).`, 'ok');
  }

  saveAllButton.disabled = false;
}

refreshButton.addEventListener('click', () => {
  loadSetup();
});

saveAllButton.addEventListener('click', () => {
  saveAll();
});

loadSetup();
