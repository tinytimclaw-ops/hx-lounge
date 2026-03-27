// Constants
const FLIGHT_API = "https://flight.dock-yard.io";

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeForm();
  setupEventListeners();
});

function initializeForm() {
  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split("T")[0];
  document.getElementById("outDate").value = dateString;
  document.getElementById("outDate").setAttribute("min", dateString);

  // Check for URL params
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get("Location") || urlParams.get("location");

  if (locationParam) {
    const airportSelect = document.getElementById("airport");
    if (airportSelect.querySelector(`option[value="${locationParam.toUpperCase()}"]`)) {
      airportSelect.value = locationParam.toUpperCase();
      loadDestinations(locationParam.toUpperCase());
    }
  }
}

function setupEventListeners() {
  const airportSelect = document.getElementById("airport");
  const destinationSelect = document.getElementById("destination");
  const flightSelect = document.getElementById("flight");
  const dateInput = document.getElementById("outDate");
  const form = document.getElementById("loungeForm");

  airportSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      loadDestinations(e.target.value);
    } else {
      destinationSelect.innerHTML = '<option value="">Choose destination</option>';
      document.getElementById("flightGroup").style.display = "none";
    }
  });

  destinationSelect.addEventListener("change", (e) => {
    if (e.target.value && airportSelect.value && dateInput.value) {
      loadFlights(airportSelect.value, e.target.value, dateInput.value);
    }
  });

  dateInput.addEventListener("change", () => {
    if (airportSelect.value && destinationSelect.value && dateInput.value) {
      loadFlights(airportSelect.value, destinationSelect.value, dateInput.value);
    }
  });

  flightSelect.addEventListener("change", (e) => {
    if (e.target.value && e.target.value !== "") {
      updateLoungeEntryTime(e.target.value);
    }
  });

  form.addEventListener("submit", handleFormSubmit);
}

async function loadDestinations(departureCode) {
  const destinationSelect = document.getElementById("destination");
  destinationSelect.innerHTML = '<option value="">Loading destinations...</option>';
  destinationSelect.disabled = true;

  try {
    const response = await fetch(`${FLIGHT_API}/destinations?departure=${departureCode}`);
    const data = await response.json();

    if (data && data.destinations && data.destinations.length > 0) {
      destinationSelect.innerHTML = '<option value="">Choose destination</option>';

      data.destinations.forEach(dest => {
        const option = document.createElement("option");
        option.value = dest.iata || "";
        option.textContent = `${dest.city || dest.airport || ""} (${dest.iata || ""})`;
        destinationSelect.appendChild(option);
      });

      destinationSelect.disabled = false;
    } else {
      destinationSelect.innerHTML = '<option value="">No destinations found</option>';
    }
  } catch (error) {
    console.error("Error loading destinations:", error);
    destinationSelect.innerHTML = '<option value="">Error loading destinations</option>';
  }
}

async function loadFlights(departureCode, arrivalCode, date) {
  const flightSelect = document.getElementById("flight");
  const flightGroup = document.getElementById("flightGroup");

  flightSelect.innerHTML = '<option value="">Loading flights...</option>';
  flightSelect.disabled = true;
  flightGroup.style.display = "block";

  try {
    const response = await fetch(
      `${FLIGHT_API}/searchDayFlights?departure=${departureCode}&arrival=${arrivalCode}&date=${date}&fullResults=false`
    );
    const data = await response.json();

    if (data && data.flights && data.flights.length > 0) {
      flightSelect.innerHTML = '<option value="">Select your flight</option>';

      data.flights.forEach(f => {
        const flightCode = (f.flight && f.flight.code) || "";
        const depTime = (f.departure && f.departure.time) || "";
        const arrTime = (f.arrival && f.arrival.time) || "";

        if (flightCode && depTime) {
          const option = document.createElement("option");
          option.value = JSON.stringify({
            code: flightCode,
            depTime: depTime,
            depDate: date
          });
          option.textContent = `${flightCode} - Departs ${depTime}${arrTime ? ` | Arrives ${arrTime}` : ""}`;
          flightSelect.appendChild(option);
        }
      });

      flightSelect.disabled = false;
    } else {
      flightSelect.innerHTML = '<option value="">No flights found for this date</option>';
    }
  } catch (error) {
    console.error("Error loading flights:", error);
    flightSelect.innerHTML = '<option value="">Error loading flights</option>';
  }
}

function updateLoungeEntryTime(flightDataStr) {
  try {
    const flightData = JSON.parse(flightDataStr);
    const depTime = flightData.depTime; // "HH:MM"

    if (!depTime) return;

    // Parse flight time
    const [hours, minutes] = depTime.split(":").map(Number);

    // Calculate 3 hours before
    let entryHours = hours - 3;
    if (entryHours < 0) entryHours += 24;

    // Format as HH:00
    const entryTime = `${String(entryHours).padStart(2, "0")}:00`;

    // Update the select
    const timeSelect = document.getElementById("outTime");
    timeSelect.value = entryTime;

    // Update hint
    const hint = document.getElementById("timeHint");
    hint.textContent = `Set to 3 hours before your ${depTime} flight`;
    hint.style.color = "#00B0A6";
    hint.style.fontWeight = "600";

  } catch (error) {
    console.error("Error updating lounge entry time:", error);
  }
}

function handleFormSubmit(e) {
  e.preventDefault();

  const airport = document.getElementById("airport").value;
  const outDate = document.getElementById("outDate").value;
  const outTime = document.getElementById("outTime").value;
  const adults = document.getElementById("adults").value;
  const children = document.getElementById("children").value;
  const infants = document.getElementById("infants").value;
  const flightSelect = document.getElementById("flight");

  // Get flight code if selected
  let flightCode = "default";
  if (flightSelect.value && flightSelect.value !== "") {
    try {
      const flightData = JSON.parse(flightSelect.value);
      flightCode = flightData.code || "default";
    } catch (e) {
      flightCode = "default";
    }
  }

  // URL encode time (HH:MM -> HH%3AMM)
  const encodedTime = outTime.replace(":", "%3A");

  // Resolve URL params
  const urlParams = new URLSearchParams(window.location.search);
  const agent = urlParams.get("agent") || "WY992";
  const adcode = urlParams.get("adcode") || "";
  const promotionCode = urlParams.get("promotionCode") || "";

  // Determine base domain
  const host = window.location.host;
  const isLocal = host.startsWith("127") || host.includes("github.io");
  const basedomain = isLocal
    ? "www.holidayextras.com"
    : host.replace("www", "app");

  // Build search URL
  const searchUrl = `https://${basedomain}/static/?selectProduct=lo&#/lounge?agent=${agent}&ppts=&customer_ref=&lang=en&adults=${adults}&children=${children}&infants=${infants}&depart=${airport}&terminal=&arrive=&flight=${flightCode}&from=${outDate}%20${encodedTime}&adcode=${adcode}&promotionCode=${promotionCode}`;

  // Redirect
  window.location.href = searchUrl;
}
