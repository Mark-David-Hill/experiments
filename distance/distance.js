function haversine(coord1, coord2) {
  const R = 3959;
  const lat1 = toRadians(coord1[0]);
  const lat2 = toRadians(coord2[0]);
  const deltaLat = toRadians(coord2[0] - coord1[0]);
  const deltaLon = toRadians(coord2[1] - coord1[1]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

const distance = haversine([40.7128, -74.006], [34.0522, -118.2437]);
const byu_provo_coord = [40.2518, -111.6493];
const byu_idaho_coord = [43.8145, -111.7833];

alert(
  "The distance between BYU Provo and BYU Idaho is " +
    haversine(byu_provo_coord, byu_idaho_coord) +
    " miles"
);

// Takeaways - this gets the distance of a straight line between 2 points. Google Maps does it differently,
// where it's the total distance travelled on the route between 2 points.
// Also, the only free Geocoding services I've seen so far have a limited amount of requests at the free tier.
// One possible option is Radar:
// Free for up to 100,000 requests per month, and then $0.50 per 1,000 requests after that.
// Radar offers volume discounts and claims to be up to 90% cheaper than Google Maps
// https://radar.com
