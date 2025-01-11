const markers = JSON.parse(localStorage.getItem("markers")) || [];
let map, markerLayer;

function initializeMap() {
  map = L.map("map").setView([51.169392, 71.449074], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // Добавление маркера на карту
  map.on("click", (e) => {
    const markerId = Date.now();
    const newMarker = {
      id: markerId,
      coords: [e.latlng.lat, e.latlng.lng],
      description: "",
      photos: [],
      recipient: "",
      fullName: "",
      phone: "",
      timestamp: new Date().toLocaleString(),
    };
    markers.push(newMarker);
    addMarkerToMap(newMarker);
    renderMarkerList();
    saveMarkers();
  });

  markers.forEach((marker) => addMarkerToMap(marker));
}

function addMarkerToMap(marker) {
  const markerInstance = L.marker(marker.coords).addTo(markerLayer);
  markerInstance.bindPopup(renderPopupContent(marker));
}

function renderPopupContent(marker) {
  const container = document.createElement("div");
  container.classList.add("popup-form");
  container.innerHTML = `
    <label>Получатель</label>
    <input type="text" placeholder="Введите имя получателя" value="${marker.recipient}" />
    <label>ФИО</label>
    <input type="text" placeholder="Введите ФИО" value="${marker.fullName}" />
    <label>Номер телефона</label>
    <input type="tel" placeholder="Введите номер телефона" value="${marker.phone}" />
    <label>Описание</label>
    <textarea placeholder="Введите описание">${marker.description}</textarea>
    <label>Фото</label>
    <input type="file" class="file-input" multiple />
    <button onclick="saveMarker(${marker.id})">Сохранить</button>
    <button onclick="deleteMarker(${marker.id})">Удалить</button>
  `;

  const fileInput = container.querySelector(".file-input");
  const photoPreview = container.querySelector(".photo-preview");

  fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);
    for (const file of files) {
      const dataURL = await fileToDataURL(file);
      if (dataURL.startsWith("data:image")) {
        const compressedPhoto = await compressImage(dataURL, 800, 800);
        marker.photos.push(compressedPhoto);
      } else {
        console.error("Пропущен файл: некорректный формат изображения.");
      }
    }
    renderMarkerList();
    saveMarkers();
    if (photoPreview) {
      photoPreview.innerHTML = marker.photos
        .map((photo) => `<img src="${photo}" alt="Фото метки" />`)
        .join("");
    }
  });

  return container;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target.result.startsWith("data:image")) {
        resolve(event.target.result);
      } else {
        reject(new Error("Файл не является изображением."));
      }
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

function compressImage(dataURL, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };

    img.onerror = () => reject(new Error("Ошибка загрузки изображения"));

    if (typeof dataURL === "string" && dataURL.startsWith("data:image")) {
      img.src = dataURL;
    } else {
      reject(new Error("Некорректный формат изображения"));
    }
  });
}

function saveMarker(markerId) {
  const marker = markers.find((m) => m.id === markerId);
  const popup = document.querySelector(".leaflet-popup-content");
  const recipient = popup.querySelector("input[placeholder='Введите имя получателя']").value;
  const fullName = popup.querySelector("input[placeholder='Введите ФИО']").value;
  const phone = popup.querySelector("input[placeholder='Введите номер телефона']").value;
  const description = popup.querySelector("textarea").value;

  marker.recipient = recipient;
  marker.fullName = fullName;
  marker.phone = phone;
  marker.description = description;

  renderMarkerList();
  saveMarkers();

  // Закрытие формы
  const popupParent = document.querySelector(".leaflet-popup");
  if (popupParent) popupParent.remove();
}

function deleteMarker(markerId) {
  const markerIndex = markers.findIndex((m) => m.id === markerId);
  if (markerIndex > -1) {
    markers.splice(markerIndex, 1);
    markerLayer.clearLayers();
    markers.forEach((m) => addMarkerToMap(m));
    renderMarkerList();
    saveMarkers();
  }
}

function renderMarkerList() {
  const markerList = document.getElementById("marker-list");
  markerList.innerHTML = "";

  markers.forEach((marker, index) => {
    const markerDiv = document.createElement("div");
    markerDiv.className = "marker-item";

    markerDiv.innerHTML = `
      <div class="marker-header">
        <p><strong>Метка №${index + 1}</strong></p>
        <button class="delete-marker-btn" onclick="deleteMarker(${marker.id})">✖</button>
      </div>
      <p><strong>Добавлено:</strong> ${marker.timestamp}</p>
      <p><strong>Получатель:</strong> ${marker.recipient || "Не указано"}</p>
      <p><strong>ФИО:</strong> ${marker.fullName || "Не указано"}</p>
      <p><strong>Телефон:</strong> ${
        marker.phone
          ? `<a href="tel:${marker.phone}" class="phone-link">${marker.phone}</a>`
          : "Не указан"
      }</p>
      <p><strong>Описание:</strong> ${marker.description || "Нет описания"}</p>
      <div class="marker-photos">
        ${marker.photos
          .map(
            (photo, photoIndex) =>
              `<div class="photo-container">
                <img src="${photo}" alt="Фото метки">
                <button class="delete-photo-btn" onclick="deletePhoto(${index}, ${photoIndex})">✖</button>
              </div>`
          )
          .join("")}
      </div>
    `;
    markerList.appendChild(markerDiv);
  });
}
function deletePhoto(markerIndex, photoIndex) {
  markers[markerIndex].photos.splice(photoIndex, 1);
  saveMarkers();
  renderMarkerList();
}

function saveMarkers() {
  localStorage.setItem("markers", JSON.stringify(markers));
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("open");
  document.getElementById("map").classList.toggle("shrinked");
}

initializeMap();
renderMarkerList();
