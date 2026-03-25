// services/cluster-service.js
// Implementiert die cluster-basierte Geolocation-Validierung.
// Kernidee: Kein statischer Raumplan nötig. Stattdessen bilden die
// bereits eingecheckten Studierenden einen dynamischen Cluster.
// Der Dozenten-Standort dient als initialer Anker.

const CLUSTER_TOLERANZ_METER = 100; // Maximale Abweichung vom Centroid
const MIN_CLUSTER_GROESSE = 5;      // Ab dieser Anzahl übernimmt Cluster die Hauptrolle

/**
 * Berechnet die Distanz zwischen zwei GPS-Koordinaten in Metern.
 * Verwendet die Haversine-Formel — ausreichend genau für kurze Distanzen.
 */
function haversineDistanz(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Erdradius in Metern
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Berechnet den geometrischen Mittelpunkt (Centroid) einer Liste
 * von GPS-Koordinaten.
 */
function berechneCentroid(koordinaten) {
  const n = koordinaten.length;
  const sumLat = koordinaten.reduce((s, k) => s + k.lat, 0);
  const sumLon = koordinaten.reduce((s, k) => s + k.lon, 0);
  return { lat: sumLat / n, lon: sumLon / n };
}

/**
 * Prüft ob eine neue GPS-Position innerhalb des gültigen Clusters liegt.
 *
 * @param {number} neuLat - Latitude des einchecken Studierenden
 * @param {number} neuLon - Longitude des einchecken Studierenden
 * @param {object} dozentPos - { lat, lon } — Anker-Position des Dozenten
 * @param {Array}  clusterPositionen - Bereits validierte Positionen [{lat, lon}]
 * @returns {{ valid: boolean, abweichungMeter: number, referenz: string }}
 */
function validierePosition(neuLat, neuLon, dozentPos, clusterPositionen) {
  let referenzPunkt;
  let referenzName;

  if (clusterPositionen.length >= MIN_CLUSTER_GROESSE) {
    // Genug Datenpunkte: Cluster-Centroid als Referenz verwenden
    referenzPunkt = berechneCentroid(clusterPositionen);
    referenzName = 'cluster';
  } else {
    // Zu wenige Einträge: Dozenten-Position als Anker verwenden
    referenzPunkt = dozentPos;
    referenzName = 'dozent';
  }

  const abweichung = haversineDistanz(
    neuLat, neuLon,
    referenzPunkt.lat, referenzPunkt.lon
  );

  return {
    valid: abweichung <= CLUSTER_TOLERANZ_METER,
    abweichungMeter: Math.round(abweichung),
    referenz: referenzName
  };
}

module.exports = { validierePosition, haversineDistanz };