/* =====================================================
   EcoRoute - script.js
   Eco-Friendly Route Planner (Version 1)
   Uses predefined sample routes. No APIs, no frameworks.
   All numbers are ESTIMATES for this prototype.
   ===================================================== */


/* =====================================================
   1. SAMPLE ROUTE DATA
   These are approximate road distances (in km) stored in
   the project. Each route works in BOTH directions, so
   "Chandigarh to Shimla" and "Shimla to Chandigarh" both work.
   You can add more routes by copying a line.
   ===================================================== */
/* =====================================================
   1. SAMPLE ROUTE DATA
   These are approximate road distances (in km) stored in
   the project. Each route works in BOTH directions, so
   "Chandigarh to Shimla" and "Shimla to Chandigarh" both work.
   You can add more routes by copying a line.
   ===================================================== */
const sampleRoutes = [
  // Jalandhar routes
  { from: "Jalandhar",  to: "Ludhiana",   distanceKm: 65 },
  { from: "Jalandhar",  to: "Amritsar",   distanceKm: 85 },
  { from: "Jalandhar",  to: "Chandigarh", distanceKm: 155 },
  { from: "Jalandhar",  to: "Delhi",      distanceKm: 375 },

  // Ludhiana routes
  { from: "Ludhiana",   to: "Amritsar",   distanceKm: 140 },
  { from: "Ludhiana",   to: "Chandigarh", distanceKm: 105 },

  // Amritsar routes
  { from: "Amritsar",   to: "Chandigarh", distanceKm: 225 },
  { from: "Amritsar",   to: "Delhi",      distanceKm: 450 },

  // Chandigarh routes
  { from: "Chandigarh", to: "Delhi",      distanceKm: 245 },
  { from: "Chandigarh", to: "Shimla",     distanceKm: 115 },
  { from: "Chandigarh", to: "Panchkula",  distanceKm: 10 },

  // Delhi routes
  { from: "Delhi",      to: "Agra",       distanceKm: 230 },
  { from: "Delhi",      to: "Jaipur",     distanceKm: 280 },
  { from: "Delhi",      to: "Shimla",     distanceKm: 350 },

  // Other cities
  { from: "Mumbai",     to: "Pune",       distanceKm: 150 },
  { from: "Bengaluru",  to: "Mysuru",     distanceKm: 145 }
];
/* =====================================================
   2. TRANSPORT DATA (our assumptions)
   These are simple estimates for a college prototype.
   State them clearly in your report.

   - speedKmh: average travel speed
   - Car: petrol car, 15 km per litre, 2.31 kg CO2 per litre of petrol
   - Bus: estimated 0.089 kg CO2 per passenger-kilometre (shared transport)
   - Electric Vehicle: 0.15 kWh per km, grid factor 0.7 kg CO2 per kWh
   - Bicycle and Walking: 0 CO2 during travel (this prototype does not
     count manufacturing, food energy, etc.)
   ===================================================== */
const transportModes = {
  car: {
    name: "Car",
    speedKmh: 50,
    type: "fuel",
    mileageKmPerLitre: 15,
    co2PerLitre: 2.31
  },
  bus: {
    name: "Bus",
    speedKmh: 40,
    type: "shared",
    co2PerPassengerKm: 0.089
  },
  bicycle: {
    name: "Bicycle",
    speedKmh: 15,
    type: "human"
  },
  walking: {
    name: "Walking",
    speedKmh: 5,
    type: "human"
  },
  electric: {
    name: "Electric Vehicle",
    speedKmh: 50,
    type: "electric",
    kWhPerKm: 0.15,
    co2PerKWh: 0.7
  }
};

/* Order in which the modes are shown on the page */
const modeOrder = ["car", "bus", "bicycle", "walking", "electric"];

/* Project Eco Score settings.
   The score compares each mode's CO2 per km with a petrol car:
   Score = 100 - (mode CO2 per km / car CO2 per km) x 58
   So a car scores 42 and zero-emission travel scores 100.
   This is a project-created score, NOT an official rating. */
const carCo2PerKm = transportModes.car.co2PerLitre / transportModes.car.mileageKmPerLitre;
const ECO_SCORE_FACTOR = 58;


/* =====================================================
   3. GET PAGE ELEMENTS (all IDs exist in index.html)
   ===================================================== */
const routeForm         = document.getElementById("route-form");
const startInput        = document.getElementById("start-location");
const destinationInput  = document.getElementById("destination");
const locationList      = document.getElementById("location-list");
const formError         = document.getElementById("form-error");
const routeSummary      = document.getElementById("route-summary");
const resultsPlaceholder = document.getElementById("results-placeholder");
const resultsCards      = document.getElementById("results-cards");
const bestOption        = document.getElementById("best-option");
const tableBody         = document.getElementById("comparison-table-body");
const co2Chart          = document.getElementById("co2-chart");
const co2SavedText      = document.getElementById("co2-saved-text");
const resultsSection    = document.getElementById("results");


/* =====================================================
   4. HELPER FUNCTIONS
   ===================================================== */

/* Fill the suggestion list (datalist) with all sample locations */
function fillLocationList() {
  const names = [];

  sampleRoutes.forEach(function (route) {
    if (!names.includes(route.from)) names.push(route.from);
    if (!names.includes(route.to))   names.push(route.to);
  });

  names.sort();

  names.forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    locationList.appendChild(option);
  });
}

/* Make text easy to compare: remove extra spaces and use lowercase */
function cleanText(text) {
  return text.trim().toLowerCase();
}

/* Look for a route between two places (in either direction).
   Returns the route object, or null if it is not found. */

/* Find a route using online map data if it is not in sample routes */
async function findRoute(start, destination) {

  const startClean = cleanText(start);
  const destClean = cleanText(destination);

  /* First check our sample routes */
  for (let i = 0; i < sampleRoutes.length; i++) {
    const route = sampleRoutes[i];

    const fromClean = cleanText(route.from);
    const toClean = cleanText(route.to);

    const forward =
      fromClean === startClean && toClean === destClean;

    const backward =
      fromClean === destClean && toClean === startClean;

    if (forward || backward) {
      return {
        from: forward ? route.from : route.to,
        to: forward ? route.to : route.from,
        distanceKm: route.distanceKm,
        source: "sample"
      };
    }
  }

  /* If the route is not in sample data,
     search the locations using OpenStreetMap */
  try {

    const startLocation = await geocodePlace(start);
    
    /* Wait so we do not send requests too quickly */
    await wait(1100);

    const destinationLocation = await geocodePlace(destination);

    if (!startLocation || !destinationLocation) {
      return null;
    }

    /* Get actual road route using OSRM */
    const routeUrl =
      "https://router.project-osrm.org/route/v1/driving/" +
      startLocation.lon + "," + startLocation.lat +
      ";" +
      destinationLocation.lon + "," + destinationLocation.lat +
      "?overview=false";

    const response = await fetch(routeUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return null;
    }

    const roadRoute = data.routes[0];

    return {
      from: start,
      to: destination,
      distanceKm: roadRoute.distance / 1000,
      routeDurationHours: roadRoute.duration / 3600,
      source: "online"
    };

  } catch (error) {

    console.error("Online route error:", error);
    return null;
  }
}


/* Search a place using OpenStreetMap Nominatim */
async function geocodePlace(place) {

  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?format=jsonv2" +
    "&limit=1" +
    "&q=" +
    encodeURIComponent(place);

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  return {
    lat: data[0].lat,
    lon: data[0].lon
  };
}


/* Small delay between location searches */
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

/* Turn hours into easy text, e.g. 2.3 hours -> "2 h 18 min" */
function formatTime(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return m + " min";
  if (m === 0) return h + " h";
  return h + " h " + m + " min";
}

/* Read which transport checkboxes are ticked */
function getSelectedModes() {
  const ticked = document.querySelectorAll('input[name="transport-mode"]:checked');
  const selected = [];

  ticked.forEach(function (box) {
    selected.push(box.value);
  });

  return selected;
}


/* =====================================================
   5. CALCULATIONS
   ===================================================== */

/* Calculate travel time, fuel, CO2 and Eco Score for ONE transport mode */
function calculateMode(modeKey, distanceKm) {
  const mode = transportModes[modeKey];

  // Travel time = Distance / Speed
  const timeHours = distanceKm / mode.speedKmh;

  let fuelLitres = null;   // null means "not applicable"
  let fuelNote = "Not applicable";
  let co2Kg = 0;

  if (mode.type === "fuel") {
    // Fuel Used = Distance / Vehicle Mileage
    fuelLitres = distanceKm / mode.mileageKmPerLitre;
    // CO2 = Fuel Used x Emission Factor
    co2Kg = fuelLitres * mode.co2PerLitre;
  } else if (mode.type === "shared") {
    // Bus: CO2 = Distance x estimated CO2 per passenger-km
    co2Kg = distanceKm * mode.co2PerPassengerKm;
    fuelNote = "Not applicable (shared transport)";
  } else if (mode.type === "electric") {
    // EV: CO2 = Distance x kWh per km x CO2 per kWh
    co2Kg = distanceKm * mode.kWhPerKm * mode.co2PerKWh;
    fuelNote = "Not applicable (electric)";
  }
  // Walking and bicycle: co2Kg stays 0 for this prototype

  // Project Eco Score (0 to 100)
  const co2PerKm = co2Kg / distanceKm;
  let ecoScore = Math.round(100 - (co2PerKm / carCo2PerKm) * ECO_SCORE_FACTOR);
  if (ecoScore > 100) ecoScore = 100;
  if (ecoScore < 0)   ecoScore = 0;

  return {
    key: modeKey,
    name: mode.name,
    distanceKm: distanceKm,
    timeHours: timeHours,
    timeText: formatTime(timeHours),
    fuelLitres: fuelLitres,
    fuelText: fuelLitres === null ? fuelNote : fuelLitres.toFixed(2) + " L",
    co2Kg: co2Kg,
    co2Text: co2Kg.toFixed(2) + " kg",
    ecoScore: ecoScore
  };
}

/* Find the lowest-emission option.
   If two options tie (e.g. bicycle and walking both 0 kg), the faster one wins. */
function findBestResult(results) {
  let best = results[0];

  results.forEach(function (item) {
    if (item.co2Kg < best.co2Kg) {
      best = item;
    } else if (item.co2Kg === best.co2Kg && item.timeHours < best.timeHours) {
      best = item;
    }
  });

  return best;
}


/* =====================================================
   6. DISPLAY RESULTS
   ===================================================== */

/* Result cards (one per transport mode) */
function showCards(results, best) {
  resultsCards.innerHTML = "";

  results.forEach(function (item) {
    const card = document.createElement("article");
    card.className = "result-card";
    if (item.key === best.key) card.classList.add("best");

    card.innerHTML =
      "<h3>" + item.name + "</h3>" +
      "<p><strong>Distance:</strong> " + item.distanceKm + " km</p>" +
      "<p><strong>Est. travel time:</strong> " + item.timeText + "</p>" +
      "<p><strong>Est. fuel used:</strong> " + item.fuelText + "</p>" +
      "<p><strong>Est. CO₂:</strong> " + item.co2Text + "</p>" +
      "<p><strong>Project Eco Score:</strong> " + item.ecoScore + "/100</p>" +
      (item.key === best.key ? "<p><strong>Lowest-emission option</strong></p>" : "");

    resultsCards.appendChild(card);
  });
}

/* Comparison table rows */
function showTable(results) {
  tableBody.innerHTML = "";

  results.forEach(function (item) {
    const row = document.createElement("tr");

    row.innerHTML =
      "<td>" + item.name + "</td>" +
      "<td>" + item.distanceKm + "</td>" +
      "<td>" + item.timeText + "</td>" +
      "<td>" + item.fuelText + "</td>" +
      "<td>" + item.co2Kg.toFixed(2) + "</td>" +
      "<td>" + item.ecoScore + "/100</td>";

    tableBody.appendChild(row);
  });
}

/* CO2 bar chart: the biggest emitter gets a 100% wide bar */
function showChart(results) {
  co2Chart.innerHTML = "";

  let maxCo2 = 0;
  results.forEach(function (item) {
    if (item.co2Kg > maxCo2) maxCo2 = item.co2Kg;
  });

  results.forEach(function (item) {
    const widthPercent = maxCo2 === 0 ? 0 : (item.co2Kg / maxCo2) * 100;

    const row = document.createElement("div");
    row.className = "chart-row";

    row.innerHTML =
      '<span class="chart-label">' + item.name + "</span>" +
      '<div class="chart-track">' +
        '<div class="chart-bar" style="width: ' + widthPercent.toFixed(1) + '%"></div>' +
      "</div>" +
      '<span class="chart-value">' + item.co2Kg.toFixed(2) + " kg</span>";

    co2Chart.appendChild(row);
  });
}

/* Message about the lowest-emission option */
function showBestOption(best) {
  bestOption.textContent =
    "Lowest-emission option for this route: " + best.name +
    " (estimated " + best.co2Kg.toFixed(2) + " kg CO₂, Project Eco Score " +
    best.ecoScore + "/100).";
}

/* Estimated CO2 saved compared with the highest-emission option shown */
function showCo2Saved(results, best) {
  let worst = results[0];

  results.forEach(function (item) {
    if (item.co2Kg > worst.co2Kg) worst = item;
  });

  const saved = worst.co2Kg - best.co2Kg;

  if (saved <= 0) {
    co2SavedText.textContent =
      "All selected options have the same estimated CO₂ for this route.";
  } else {
    co2SavedText.textContent =
      "Choosing " + best.name + " instead of " + worst.name +
      " could save an estimated " + saved.toFixed(2) +
      " kg of CO₂ on this trip (prototype estimate).";
  }
}


/* =====================================================
   7. FORM EVENT HANDLING (what happens on "Find Route")
   ===================================================== */
async function handleFormSubmit(event) {
  // Stop the page from reloading when the form is submitted
  event.preventDefault();

  const start = startInput.value;
  const destination = destinationInput.value;
  const selectedModes = getSelectedModes();

  // ----- Step 1: Validate the inputs -----
  if (start.trim() === "" || destination.trim() === "") {
    formError.textContent = "Please enter both a starting location and a destination.";
    return;
  }

  if (cleanText(start) === cleanText(destination)) {
    formError.textContent = "The starting location and destination cannot be the same.";
    return;
  }

  if (selectedModes.length === 0) {
    formError.textContent = "Please select at least one transport mode.";
    return;
  }

  // ----- Step 2: Find the distance from the sample data -----
  const route = await findRoute(start, destination);

  if (route === null) {
    formError.textContent =
    "Sorry, we could not find one or both locations. Please check the spelling and try again.";
    return;
  }

  // Everything is valid, so clear any old error
  formError.textContent = "";

  // ----- Steps 3 to 6: Calculate time, fuel, CO2 and Eco Score -----
  // The four checkboxes decide which modes are compared.
  // Electric Vehicle is always included as an extra comparison.
  const modesToShow = modeOrder.filter(function (key) {
    return key === "electric" || selectedModes.includes(key);
  });

  const results = modesToShow.map(function (key) {
    return calculateMode(key, route.distanceKm);
  });

  const best = findBestResult(results);

  // ----- Step 7: Display everything on the page -----
  routeSummary.textContent =
    route.from + " to " + route.to + ": about " + route.distanceKm +
    " km (sample distance). All values are prototype estimates.";

  resultsPlaceholder.style.display = "none";

  showCards(results, best);
  showBestOption(best);
  showTable(results);
  showChart(results);
  showCo2Saved(results, best);

  // Scroll down to the results
  resultsSection.scrollIntoView({ behavior: "smooth" });
}


/* =====================================================
   8. START THE PROGRAM
   ===================================================== */
fillLocationList();
routeForm.addEventListener("submit", handleFormSubmit);