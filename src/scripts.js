import { google } from 'googleapis';

const apiKey = 'AIzaSyBLWsl5v2a7kj2ggZnTuAhHt3WzamVNPE0';
const geocodingApi = google.maps.geocoding('v3');
const directionsApi = google.maps.directions('v3');
const placesApi = google.maps.places('v3');

const form = document.getElementById('route-form');
const resultDiv = document.getElementById('result');
const startAddressInput = document.getElementById('start-address');
const goalAddressInput = document.getElementById('goal-address');
const waypointInputs = document.querySelectorAll('#waypoints input[type="text"]');

// Create autocomplete objects for start and goal addresses
const startAutocomplete = new google.maps.places.Autocomplete(startAddressInput, {
  componentRestrictions: { country: 'ca' },
  types: ['address'],
});
const goalAutocomplete = new google.maps.places.Autocomplete(goalAddressInput, {
  componentRestrictions: { country: 'ca' },
  types: ['address'],
});

waypointInputs.forEach((input) => {
  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: 'ca' },
    types: ['address'],
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const startAddress = startAddressInput.value;
  const goalAddress = goalAddressInput.value;
  const cargoCapacity = parseInt(document.getElementById('cargo-capacity').value);
  const numTrucks = parseInt(document.getElementById('num-trucks').value);
  const vehicleType = document.getElementById('vehicle-type').value;
  const waypoints = Array.from(waypointInputs).map((input) => input.value);

  try {
    const startCoords = await geocodeAddress(startAddress);
    const goalCoords = await geocodeAddress(goalAddress);
    const waypointCoords = await Promise.all(waypoints.map(geocodeAddress));

    const graph = createGraph(startCoords, goalCoords, waypointCoords, cargoCapacity, numTrucks, vehicleType);
    const distances = await dijkstra(graph, startCoords, goalCoords, cargoCapacity, numTrucks, vehicleType);
    const optimizedPath = reconstructPath(distances, startCoords, goalCoords, waypointCoords);
    const totalDistance = calculateTotalDistance(graph, optimizedPath);
    const emissions = calculateEmissions(totalDistance, vehicleType);

    resultDiv.innerHTML = `
      <h2>Optimized Route:</h2>
      <p>${optimizedPath.join(' -> ')}</p>
      <h2>Total Distance:</h2>
      <p>${totalDistance.toFixed(2)} km</p>
      <h2>Emissions:</h2>
      <p>${emissions.toFixed(2)} kg CO2</p>
    `;
  } catch (error) {
    console.error(error);
    resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
  }
});

async function geocodeAddress(address) {
  const response = await geocodingApi.geocode({
    address,
    key: apiKey,
  });
  const coords = response.data.results[0].geometry.location;
  return [coords.lat, coords.lng];
}

//... rest of the functions remain the same...