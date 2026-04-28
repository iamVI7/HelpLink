// Haversine formula
const toRad = (v) => (v * Math.PI) / 180;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const calculateETA = (distanceKm) => {
  const speed = 30;
  const eta = Math.round((distanceKm / speed) * 60);
  return eta < 1 ? 1 : eta; // 🔥 minimum 1 min
};

module.exports = { calculateDistance, calculateETA };