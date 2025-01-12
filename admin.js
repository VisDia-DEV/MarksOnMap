const githubConfig = {
  owner: "VisDia-DEV", // Ваш GitHub аккаунт
  repo: "MarksOnMap", // Имя репозитория
  branch: "main", // Ветка, где хранится markers.json
  token: "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", // Добавьте сюда токен для разработки, но в продакшене скройте
};

const markersFile = "markers.json";
let markers = [];
let map, markerLayer;

// Инициализация карты
function initializeMap() {
  map = L.map("map").setView([51.169392, 71.449074], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  loadMarkers();

  // Добавление новой метки
  map.on("click", (e) => {
    const markerId = Date.now();
    const newMarker = {
      id: markerId,
      coords: [e.latlng.lat, e.latlng.lng],
      description: "",
      recipient: "",
      fullName: "",
      phone: "",
      timestamp: new Date().toLocaleString(),
    };
    markers.push(newMarker);
    addMarkerToMap(newMarker);
    saveMarkers();
  });
}

// Загрузка меток из GitHub
async function loadMarkers() {
  const url = `https://raw.githubusercontent.com/${githubConfig.owner}/${githubConfig.repo}/${githubConfig.branch}/${markersFile}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      markers = await response.json();
      markers.forEach(addMarkerToMap);
      renderMarkerList();
    } else {
      console.error("Не удалось загрузить метки:", response.status);
    }
  } catch (error) {
    console.error("Ошибка загрузки меток:", error);
  }
}

// Сохранение меток в GitHub
async function saveMarkers() {
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${markersFile}`;
  try {
    // Получаем SHA файла для обновления
    const fileResponse = await fetch(url, {
      headers: {
        Authorization: `token ${githubConfig.token}`,
      },
    });
    const fileData = await fileResponse.json();

    // Кодируем новый JSON в base64
    const content = btoa(JSON.stringify(markers, null, 2));

    // Отправляем обновления
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubConfig.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Обновление меток",
        content: content,
        sha: fileData.sha,
      }),
    });
    console.log("Метки успешно сохранены!");
  } catch (error) {
    console.error("Ошибка сохранения меток:", error);
  }
}

// Добавление метки на карту
function addMarkerToMap(marker) {
  const markerInstance = L.marker(marker.coords).addTo(markerLayer);
  markerInstance.bindPopup(`
    <strong>Получатель:</strong> ${marker.recipient || "Не указано"}<br>
    <strong>ФИО:</strong> ${marker.fullName || "Не указано"}<br>
    <strong>Телефон:</strong> ${marker.phone || "Не указан"}<br>
    <strong>Описание:</strong> ${marker.description || "Нет описания"}
  `);
}

// Рендер списка меток
function renderMarkerList() {
  const markerList = document.getElementById("marker-list");
  markerList.innerHTML = "";
  markers.forEach((marker, index) => {
    const markerDiv = document.createElement("div");
    markerDiv.className = "marker-item";
    markerDiv.innerHTML = `
      <p><strong>Метка №${index + 1}</strong></p>
      <p><strong>Добавлено:</strong> ${marker.timestamp}</p>
      <p><strong>Описание:</strong> ${marker.description || "Нет описания"}</p>
      <button onclick="deleteMarker(${marker.id})">Удалить</button>
    `;
    markerList.appendChild(markerDiv);
  });
}

// Удаление метки
function deleteMarker(markerId) {
  markers = markers.filter((m) => m.id !== markerId);
  markerLayer.clearLayers();
  markers.forEach(addMarkerToMap);
  renderMarkerList();
  saveMarkers();
}

initializeMap();
