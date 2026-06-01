import fetch from "node-fetch";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // set in your .env

/**
 * Get distance and travel time from origin to destination
 * @param {number} originLat 
 * @param {number} originLng 
 * @param {number} destLat 
 * @param {number} destLng 
 * @param {'driving'|'bicycling'|'walking'}  
 * @returns {distance_m, distance_text, duration_s, duration_text}
 */
export const getDistanceAndTime = async (originLat, originLng, destLat, destLng, mode = "driving") => {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") return null;

    const element = data.rows[0].elements[0];
    if (element.status !== "OK") return null;

    return {
      distance_m: element.distance.value,
      distance_text: element.distance.text,
      duration_s: element.duration.value,
      duration_text: element.duration.text,
    };
  } catch (err) {
    console.error("Google Distance API error:", err);
    return null;
  }
};