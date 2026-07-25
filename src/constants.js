// Angle conversion and time constants shared across all solar calculations.
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Solar elevation angles (in degrees) that define the key prayer-time
 * boundaries. Centralising them here keeps every salah module in agreement on
 * the geometry and avoids re-declaring the same magic numbers per file.
 */

// Apparent sunrise/sunset: the sun's upper limb on the horizon. The centre then
// sits 0.833° below the true horizon (semi-diameter ≈ 0.267° + refraction ≈ 0.567°).
// This is the Sharia definition of sunset used for Magrib across the Sunni schools.
export const HORIZON_ELEVATION = -0.833;

// Red twilight ends when the sun is 12° below the horizon (লাল আলো শেষ).
// In the evening this marks Magrib's end; the morning counterpart is unused.
export const RED_SKY_ELEVATION = -12;

// Astronomical twilight: the sun is 18° below the horizon. This marks the
// start of subhe sadiq (true dawn) in the morning and the start of isha at night.
export const ASTRONOMICAL_TWILIGHT_ELEVATION = -18;
