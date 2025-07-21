// src/lib/oddsService.js

import { subtract90Minutes } from './timeHelpers';
import { addCacheBusting, formatOdds } from './formatHelpers';

// Global Set to collect unique league names.
// In a Cloudflare Worker, this Set is re-initialized with each new Worker invocation (cold start).
// For persistent storage of league data across invocations, Cloudflare KV or Durable Objects would be required.
const leagueCollection = new Set();

/**
 * Fetches raw data from an external API via a Google Apps Script proxy.
 * This function includes extensive logging to aid in debugging the API response structure,
 * which is crucial for identifying issues like `undefined` data.
 *
 * @param {string} apiUrlBase - The base URL of the primary odds API.
 * @param {string} proxyUrl - The URL of the Google Apps Script proxy.
 * @param {number} lid - The League ID to be appended to the base API URL. Defaults to 1.
 * @returns {Promise<Array>} A Promise that resolves to the specific part of the parsed API data (index 3),
 * or an empty array if any fetching, parsing, or data structure validation fails.
 */
async function fetchAndProcessData(apiUrlBase, proxyUrl, lid = 1) {
  try {
    // Construct the full URL for the proxy, encoding the actual API URL.
    const fullUrl = proxyUrl + encodeURIComponent(addCacheBusting(apiUrlBase + lid));
    console.log("[DEBUG] Fetching from fullUrl:", fullUrl); // Log the URL being requested.

    // Perform the fetch request to the proxy.
    const response = await fetch(fullUrl);

    // Check if the HTTP response was successful (status 200-299).
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to fetch from Google Apps Script proxy. Status: ${response.status} ${response.statusText}. Response Body: ${errorText.substring(0, 500)}...`);
      throw new Error(`Failed to fetch from Google Apps Script proxy. Status: ${response.status}`);
    }

    // Read the raw response text.
    const rawText = await response.text();
    console.log("[DEBUG] Raw response text (first 500 chars):", rawText.substring(0, 500) + '...'); // Log a snippet for inspection.

    // Replace single quotes with double quotes to ensure valid JSON, if necessary.
    const cleaned = rawText.replace(/'/g, '"');
    console.log("[DEBUG] Cleaned text (first 500 chars):", cleaned.substring(0, 500) + '...'); // Log cleaned text.

    let parsed;
    try {
      // Attempt to parse the cleaned text as JSON.
      parsed = JSON.parse(cleaned);
      // Log the full parsed object for debugging, truncated to prevent excessively large logs.
      console.log("[DEBUG] Parsed JSON (type:", typeof parsed, ", full):", JSON.stringify(parsed, null, 2).substring(0, 1000) + '...');
    } catch (parseError) {
      console.error("[ERROR] JSON Parsing failed:", parseError.message);
      return []; // Return empty array if parsing fails.
    }

    // Crucial validation: Ensure 'parsed' is an array and contains at least 4 elements.
    // The original code expects the relevant data at index 3.
    if (parsed && Array.isArray(parsed) && parsed.length > 3) {
      console.log("[DEBUG] Data successfully found at parsed[3]. Type:", typeof parsed[3]);
      return parsed[3]; // Return the specific data segment.
    } else {
      console.error("[ERROR] Parsed data is not an array or does not have enough elements at index 3.", {
        parsedLength: parsed && Array.isArray(parsed) ? parsed.length : 'not array',
        parsedType: typeof parsed
      });
      // Return an empty array to prevent downstream `forEach of undefined` errors.
      return [];
    }

  } catch (error) {
    console.error("[ERROR] API Fetching/Processing Error in fetchAndProcessData:", error.message);
    return []; // Ensure an array is always returned on error.
  }
}

/**
 * Organizes raw match data fetched from the API, ensuring uniqueness of matches
 * and populating the global league collection.
 * This function handles the structure of the API response where each entry is
 * `[leagueMeta, matchesArray]`.
 *
 * @param {string} apiUrlBase - The base URL for the odds API.
 * @param {string} proxyUrl - The URL of the Google Apps Script proxy.
 * @param {number} lid - The League ID. Defaults to 1.
 * @returns {Promise<Array<Object>>} A Promise that resolves to an array of unique match objects,
 * each augmented with its league name.
 */
async function fetchOddsData(apiUrlBase, proxyUrl, lid = 1) {
  // `fetchAndProcessData` is designed to always return an array (possibly empty),
  // preventing `forEach of undefined` errors here.
  const result = await fetchAndProcessData(apiUrlBase, proxyUrl, lid);
  const uniqueMatchIds = new Set(); // Tracks unique match IDs to avoid duplicates.
  const finalArr = []; // Stores the processed and unique match objects.

  // Iterate over the top-level result array. Each item is expected to be [leagueMeta, matches].
  result.forEach(([leagueMeta, matches]) => {
    // Validate that 'matches' is an array before attempting to iterate over it.
    if (!Array.isArray(matches)) {
        console.warn("[WARN] 'matches' array within API response is not valid for leagueMeta:", leagueMeta, "Received:", matches);
        return; // Skip processing this league's matches if the structure is unexpected.
    }

    // Iterate over individual match entries within the 'matches' array.
    matches.forEach(match => {
      // Augment the match object with the league name for easier access.
      match.league = leagueMeta[1]; // Assuming leagueMeta[1] holds the league name.

      const matchId = match[3]; // Assuming match[3] is the unique identifier for a match.
      // Add match to final array only if its ID has not been encountered before.
      if (!uniqueMatchIds.has(matchId)) {
        uniqueMatchIds.add(matchId);
        finalArr.push(match);
      }

      // Add the league name to the global `leagueCollection` Set.
      // This collection is ephemeral per Worker invocation.
      if (!leagueCollection.has(match.league)) {
        leagueCollection.add(match.league);
      }
    });
  });

  return finalArr;
}

/**
 * Fetches the organized odds data and transforms it into a highly structured JSON format.
 * Each match object in the output will contain clearly named properties.
 *
 * @param {string} apiUrlBase - The base URL for the odds API.
 * @param {string} proxyUrl - The URL of the Google Apps Script proxy.
 * @returns {Promise<Array<Object>>} A Promise that resolves to an array of structured match objects.
 * Returns an empty array if no match data is available or an error occurs during formatting.
 */
export async function getFormattedMatchesAsJson(apiUrlBase, proxyUrl) {
  try {
    // Fetch the processed and unique match data.
    const data = await fetchOddsData(apiUrlBase, proxyUrl);
    const formattedJson = [];

    if (data.length === 0) {
      console.log('No match data available from source (after filtering/processing). Returning empty array.');
      return [];
    }

    // Iterate over each match to transform it into the desired JSON structure.
    data.forEach(eachMatch => {
      // Extract and default league name.
      const league = eachMatch.league || "Unknown League";
      // Calculate `valG` and `formatVal` for goal points.
      const valG = eachMatch[51] / 100;
      const formatVal = valG >= 0 ? `+${valG}` : valG;
      // Calculate `finalGP` (Final Goal Points), handling a specific "0-0.01" case.
      const finalGP = `${eachMatch[55]}${formatVal}` === '0-0.01' ? '' : `${eachMatch[55]}${formatVal}`;

      // Determine which team is highlighted based on the value at `eachMatch[34]`.
      const highlightedTeamName = eachMatch[34] === 1 ? eachMatch[16] : eachMatch[20];

      // Push a new structured object into the `formattedJson` array.
      formattedJson.push({
        league: league,
        time: subtract90Minutes(eachMatch[8]), // Adjusted match time.
        homeTeam: eachMatch[16], // Home team name.
        awayTeam: eachMatch[20], // Away team name.
        // Boolean flags indicating which team is highlighted, for programmatic use.
        isHomeTeamHighlighted: highlightedTeamName === eachMatch[16],
        isAwayTeamHighlighted: highlightedTeamName === eachMatch[20],
        odds: formatOdds(eachMatch[52], eachMatch[50]), // Formatted odds.
        finalGoalPoints: finalGP // Final goal points.
      });
    });

    return formattedJson;

  } catch (error) {
    console.error("[ERROR] Error generating formatted JSON in getFormattedMatchesAsJson:", error);
    return []; // Return empty array on error during formatting.
  }
}