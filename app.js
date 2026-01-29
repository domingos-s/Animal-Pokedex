import { addCapture, getAllCaptures, deleteCapture } from "./db.js";

const form = document.getElementById("captureForm");
const photoInput = document.getElementById("photoInput");
const nameInput = document.getElementById("nameInput");
const typeInput = document.getElementById("typeInput");
const notesInput = document.getElementById("notesInput");
const clearBtn = document.getElementById("clearBtn");

const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");

const dexList = document.getElementById("dexList");
const emptyState = document.getElementById("emptyState");
const stats = document.getElementById("stats");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

let currentPreviewURL = null;
let allCaptures = [];

function fmtDate(ms) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function clean(s) {
  return (s || "").trim();
}

function revokePreview() {
  if (currentPreviewURL) {
    URL.revokeObjectURL(currentPreviewURL);
    currentPreviewURL = null;
  }
}

photoInput.addEventListener("change", () => {
  revokePreview();
  const f = photoInput.files?.[0];
  if (!f) {
    preview.hidden = true;
    return;
  }
  currentPreviewURL = URL.createObjectURL(f);
  previewImg.src = currentPreviewURL;
  preview.hidden = false;
});

clearBtn.addEventListener("click", () => {
  form.reset();
  revokePreview();
  preview.hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = photoInput.files?.[0];
  const name = clean(nameInput.value);
  const type = clean(typeInput.value);
  const notes = clean(notesInput.value);

  if (!file || !name) return;

  const capture = {
    name,
    type: type || "Other",
    notes,
    createdAt: Date.now(),
    imageBlob: file,
    imageType: file.type || "image/jpeg",
  };

  await addCapture(capture);

  form.reset();
  revokePreview();
  preview.hidden = true;

  await refreshDex();
});

searchInput.addEventListener("input", () => renderDex());
filterType.addEventListener("change", () => renderDex());

function matchesFilters(c) {
  const q = clean(searchInput.value).toLowerCase();
  const t = clean(filterType.value);

  const hitsQ = !q
    || c.name.toLowerCase().includes(q)
    || (c.notes || "").toLowerCase().includes(q)
    || (c.type || "").toLowerCase().includes(q);

  const hitsT = !t || c.type === t;

  return hitsQ && hitsT;
}

function renderDex() {
  dexList.innerHTML = "";

  const filtered = allCaptures.filter(matchesFilters);

  stats.textContent = `${filtered.length} shown  •  ${allCaptures.length} total`;

  emptyState.hidden = filtered.length !== 0;

  for (const c of filtered) {
    const card = document.createElement("div");
    card.className = "dexCard";

    const img = document.createElement("img");
    // object URL per card (revoked when image loads to reduce memory)
    const url = URL.createObjectURL(c.imageBlob);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    img.alt = c.name;

    const body = document.createElement("div");
    body.className = "dexBody";

    const nameEl = document.createElement("div");
    nameEl.className = "dexName";
    nameEl.textContent = c.name;

    const meta = document.createElement("div");
    meta.className = "dexMeta";
    meta.innerHTML = `
      <span>Type: ${c.type || "Other"}</span>
      <span>Captured: ${fmtDate(c.createdAt)}</span>
    `;

    const notes = document.createElement("div");
    notes.className = "dexNotes";
    notes.textContent = c.notes ? c.notes : "—";

    const actions = document.createElement("div");
    actions.className = "dexActions";

    const left = document.createElement("div");
    left.className = "dexMeta";
    left.textContent = `#${c.id}`;

    const del = document.createElement("button");
    del.className = "btn danger";
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      await deleteCapture(c.id);
      await refreshDex();
    });

    actions.append(left, del);

    body.append(nameEl, meta, notes, actions);
    card.append(img, body);
    dexList.append(card);
  }
}

async function refreshDex() {
  allCaptures = await getAllCaptures();
  renderDex();
}

// PWA install prompt button
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  });
}

// initial render
refreshDex();
