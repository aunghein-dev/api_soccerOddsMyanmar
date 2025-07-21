// src/lib/timeHelpers.js

/**
 * Adjusts a given time string by subtracting 90 minutes.
 * This function handles time conversions including AM/PM and wraps around midnight.
 *
 * @param {string} timeStr - The input time string (e.g., "10:30AM", "02:15 PM").
 * @returns {string} The adjusted time string formatted as "HH:MMPM".
 */
export function subtract90Minutes(timeStr) {
  // Normalize the time string to ensure consistent parsing (e.g., "10:30AM" -> "10:30 AM").
  const normalized = timeStr.replace(/(AM|PM)/, ' $1').trim();

  // Split the time and period, then parse hour and minute as numbers.
  const [time, period] = normalized.split(' ');
  let [hour, minute] = time.split(':').map(Number);

  // Adjust hour for PM times, excluding 12 PM.
  if (period === 'PM' && hour !== 12) hour += 12;
  // Adjust hour for 12 AM (midnight) to 00.
  if (period === 'AM' && hour === 12) hour = 0;

  // Calculate total minutes from midnight.
  let totalMinutes = hour * 60 + minute;
  // Subtract 90 minutes.
  totalMinutes -= 90;
  // Handle time wrapping around to the previous day if it becomes negative.
  if (totalMinutes < 0) totalMinutes += 1440; // 1440 minutes = 24 hours

  // Calculate new hour and minute.
  let newHour = Math.floor(totalMinutes / 60);
  let newMinute = totalMinutes % 60;

  // Determine the new AM/PM period.
  const newPeriod = newHour >= 12 ? 'PM' : 'AM';
  // Adjust hour for 12-hour format (12 PM, 12 AM).
  newHour = newHour % 12;
  if (newHour === 0) newHour = 12;

  // Format the new time, ensuring minutes are always two digits.
  return `${String(newHour)}:${String(newMinute).padStart(2, '0')}${newPeriod}`;
}