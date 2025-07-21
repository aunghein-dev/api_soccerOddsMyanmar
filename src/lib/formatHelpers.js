// src/lib/formatHelpers.js

/**
 * Appends a cache-busting timestamp to a given URL.
 * This helps in preventing browser or proxy caching of the API response.
 *
 * @param {string} url - The URL to which the timestamp will be added.
 * @returns {string} The URL with the appended timestamp query parameter.
 */
export function addCacheBusting(url) {
  const timestamp = new Date().getTime();
  return `${url}&_=${timestamp}`;
}

/**
 * Formats two numerical values into a specific odds string representation.
 * The second number is treated as a decimal value (divided by 100).
 *
 * @param {number} num1 - The integer part of the odds.
 * @param {number} num2 - The decimal part of the odds, expected to be in cents (e.g., 50 for 0.50).
 * @returns {string} The formatted odds string (e.g., "1+0.5", "2", "0"). Returns an empty string for "0-0.01".
 */
export function formatOdds(num1, num2) {
  const val = num2 / 100; // Convert cents to a decimal value.
  // Construct the formatted string. Adds '+' if val is positive, empty string if -0.01, otherwise just val.
  const formatted = `${num1}${val > 0 ? `+${val}` : val === -0.01 ? '' : val}`;
  // Handle a specific edge case where the formatted string becomes "0-0.01".
  return formatted === '0-0.01' ? '' : formatted;
}