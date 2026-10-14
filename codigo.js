const GEOJSON_URL = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/spain-provinces.geojson";

const provinceData = {
  "A Coruña": ["A Coruña", 249000],
  "Alacant/Alicante": ["Alicante", 359000],
  "Albacete": ["Albacete", 173000],
  "Almería": ["Almería", 205000],
  "Araba/Álava": ["Vitoria-Gasteiz", 261000],
  "Asturias": ["Oviedo", 221000],
  "Ávila": ["Ávila", 58000],
  "Badajoz": ["Badajoz", 151000],
  "Barcelona": ["Barcelona", 1703000],
  "Bizkaia/Vizcaya": ["Bilbao", 348000],
  "Burgos": ["Burgos", 176000],
  "Cáceres": ["Cáceres", 96000],
  "Cádiz": ["Cádiz", 111000],
  "Cantabria": ["Santander", 173000],
  "Castelló/Castellón": ["Castellón de la Plana", 180000],
  "Ceuta": ["Ceuta", 83000],
  "Ciudad Real": ["Ciudad Real", 76000],
  "Córdoba": ["Córdoba", 324000],
  "Cuenca": ["Cuenca", 54000],
  "Gipuzkoa/Guipúzcoa": ["San Sebastián / Donostia", 189000],
  "Girona": ["Girona", 104000],
  "Granada": ["Granada", 232000],
  "Guadalajara": ["Guadalajara", 89000],
  "Huelva": ["Huelva", 143000],
  "Huesca": ["Huesca", 54000],
  "Illes Balears": ["Palma", 432000],
  "Jaén": ["Jaén", 112000],
  "La Rioja": ["Logroño", 151000],
  "Las Palmas": ["Las Palmas de Gran Canaria", 382000],
  "León": ["León", 124000],
  "Lleida": ["Lleida", 143000],
  "Lugo": ["Lugo", 99000],
  "Madrid": ["Madrid", 3417000],
  "Málaga": ["Málaga", 592000],
  "Melilla": ["Melilla", 86000],
  "Murcia": ["Murcia", 475000],
  "Navarra": ["Pamplona / Iruña", 209000],
  "Ourense": ["Ourense", 104000],
  "Palencia": ["Palencia", 76000],
  "Pontevedra": ["Pontevedra", 83000],
  "Salamanca": ["Salamanca", 145000],
  "Santa Cruz De Tenerife": ["Santa Cruz de Tenerife", 209000],
  "Segovia": ["Segovia", 52000],
  "Sevilla": ["Sevilla", 687000],
  "Soria": ["Soria", 41000],
  "Tarragona": ["Tarragona", 143000],
  "Teruel": ["Teruel", 37000],
  "Toledo": ["Toledo", 87000],
  "València/Valencia": ["Valencia", 826000],
  "Valladolid": ["Valladolid", 301000],
  "Zamora": ["Zamora", 59000],
  "Zaragoza": ["Zaragoza", 687000]
};

const svgNamespace = "http://www.w3.org/2000/svg";
const mainlandGroup = document.querySelector("#mainland-provinces");
const canaryGroup = document.querySelector("#canary-provinces");
const mapStatus = document.querySelector("#map-status");
let selectedProvince = null;

function isCanaryProvince(name) {
  return name === "Las Palmas" || name === "Santa Cruz De Tenerife";
}

function getCoordinatePairs(geometry) {
  const points = [];
  const visit = (value) => {
    if (Array.isArray(value) && typeof value[0] === "number") {
      points.push(value);
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry.coordinates);
  return points;
}

function createProjection(features, bounds, target) {
  const points = features.flatMap((feature) => getCoordinatePairs(feature.geometry));
  const projectRaw = ([longitude, latitude]) => [longitude * Math.cos(39 * Math.PI / 180), -latitude];
  const projected = points.map(projectRaw);
  const minX = Math.min(...projected.map(([x]) => x));
  const maxX = Math.max(...projected.map(([x]) => x));
  const minY = Math.min(...projected.map(([, y]) => y));
  const maxY = Math.max(...projected.map(([, y]) => y));
  const scale = Math.min(target.width / (maxX - minX), target.height / (maxY - minY));
  const offsetX = target.x + (target.width - (maxX - minX) * scale) / 2;
  const offsetY = target.y + (target.height - (maxY - minY) * scale) / 2;

  return (coordinate) => {
    const [x, y] = projectRaw(coordinate);
    return [offsetX + (x - minX) * scale, offsetY + (y - minY) * scale];
  };
}

function geometryToPath(geometry, project) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => polygon.map((ring) => {
    return ring.map((coordinate, index) => {
      const [x, y] = project(coordinate);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ") + " Z";
  }).join(" ")).join(" ");
}

function selectProvince(feature, element) {
  if (selectedProvince) selectedProvince.classList.remove("is-selected");
  selectedProvince = element;
  selectedProvince.classList.add("is-selected");

  const [capital, population] = provinceData[feature.properties.name];
  document.querySelector("#province-name").textContent = feature.properties.name;
  document.querySelector("#province-capital").textContent = capital;
  document.querySelector("#province-population").textContent =
    new Intl.NumberFormat("es-ES").format(population);
  document.querySelector("#empty-state").hidden = true;
  document.querySelector("#province-details").hidden = false;
}

function drawFeature(feature, project, group) {
  const name = feature.properties.name;
  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("class", "province");
  path.setAttribute("d", geometryToPath(feature.geometry, project));
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("tabindex", "0");
  path.setAttribute("role", "button");
  path.setAttribute("aria-label", `${name}: mostrar capital y habitantes`);

  const title = document.createElementNS(svgNamespace, "title");
  title.textContent = name;
  path.append(title);

  path.addEventListener("click", () => selectProvince(feature, path));
  path.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectProvince(feature, path);
    }
  });
  group.append(path);
}

async function loadMap() {
  try {
    const response = await fetch(GEOJSON_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    const features = geojson.features.filter((feature) => provinceData[feature.properties.name]);
    const mainland = features.filter((feature) => !isCanaryProvince(feature.properties.name));
    const canaries = features.filter((feature) => isCanaryProvince(feature.properties.name));

    if (features.length !== 52) {
      throw new Error(`Se esperaban 52 territorios y se recibieron ${features.length}`);
    }

    const mainlandProjection = createProjection(mainland, null, {
      x: 35, y: 20, width: 930, height: 640
    });
    const canaryProjection = createProjection(canaries, null, {
      x: 170, y: 690, width: 480, height: 105
    });

    mainland.forEach((feature) => drawFeature(feature, mainlandProjection, mainlandGroup));
    canaries.forEach((feature) => drawFeature(feature, canaryProjection, canaryGroup));
    mapStatus.textContent = "";
  } catch (error) {
    console.error("No se pudo cargar el mapa provincial.", error);
    mapStatus.textContent = "No se pudo cargar el mapa. Comprueba tu conexión a Internet y vuelve a cargar la página.";
    mapStatus.classList.add("is-error");
  }
}

loadMap();
