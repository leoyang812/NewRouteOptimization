import { google } from 'googleapis';

const apiKey = 'AIzaSyBLWsl5v2a7kj2ggZnTuAhHt3WzamVNPE0';
const geocodingApi = google.maps.geocoding('v3');
const directionsApi = google.maps.directions('v3');

const form = document.getElementById('route-form');
const resultDiv = document.getElementById('result');
const startAddressInput = document.getElementById('start-address');
const goalAddressInput = document.getElementById('goal-address');

// Create autocomplete objects for start and goal addresses
const startAutocomplete = new google.maps.places.Autocomplete(startAddressInput, {
  componentRestrictions: { country: 'ca' },
  types: ['address'],
});
const goalAutocomplete = new google.maps.places.Autocomplete(goalAddressInput, {
  componentRestrictions: { country: 'ca' },
  types: ['address'],
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const startAddress = startAddressInput.value;
  const goalAddress = goalAddressInput.value;
  const cargoCapacity = parseInt(document.getElementById('cargo-capacity').value);
  const numTrucks = parseInt(document.getElementById('num-trucks').value);
  const vehicleType = document.getElementById('vehicle-type').value;

  try {
    const startCoords = await geocodeAddress(startAddress);
    const goalCoords = await geocodeAddress(goalAddress);

    const graph = createGraph(startCoords, goalCoords, cargoCapacity, numTrucks, vehicleType);
    const distances = await dijkstra(graph, startCoords, goalCoords, cargoCapacity, numTrucks, vehicleType);
    const optimizedPath = reconstructPath(distances, startCoords, goalCoords);
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

function createGraph(startCoords, goalCoords, cargoCapacity, numTrucks, vehicleType) {
  const graph = {};
  graph.nodes = [startCoords, goalCoords];
  graph.edges = {};
  graph.distances = {};

  // Add edges and distances to the graph
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const fromNode = graph.nodes[i];
      const toNode = graph.nodes[j];
      const distance = haversine(fromNode, toNode);
      graph.edges[fromNode] = graph.edges[fromNode] || [];
      graph.edges[fromNode].push(toNode);
      graph.distances[[fromNode, toNode]] = distance;
      graph.distances[[toNode, fromNode]] = distance;
    }
  }

  return graph;
}

function haversine(coord1, coord2) {
  const R = 6371; // Earth radius in kilometers
  const lat1 = degToRad(coord1[0]);
  const lon1 = degToRad(coord1[1]);
  const lat2 = degToRad(coord2[0]);
  const lon2 = degToRad(coord2[1]);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

async function dijkstra(graph, startNode, goalNode, cargoCapacity, numTrucks, vehicleType) {
  const distances = {};
  const paths = {};
  const queue = [startNode];

  distances[startNode] = 0;
  paths[startNode] = [];

  while (queue.length > 0) {
    const currentNode = queue.shift();
    const currentDistance = distances[currentNode];

    for(const neighbor of graph.edges[currentNode]) {
      const distance = currentDistance + graph.distances[[currentNode, neighbor]];
      const newCargo = cargoCapacity - numTrucks * vehicleType;

      if (!distances[neighbor] || distance < distances[neighbor] && newCargo >= 0) {
        distances[neighbor] = distance;
        paths[neighbor] = [...paths[currentNode], neighbor];
        queue.push(neighbor);
      }
    }
  }

  return distances;
}

// Add the event listener to the optimize-button element after the DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('optimize-button').addEventListener('click', () => {
    document.getElementById('haulstream-image').style.display = 'block';
  });
});