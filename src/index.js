// src/index.js

import { getFormattedMatchesAsJson } from './lib/oddsService';

/**
 * Cloudflare Worker entry point.
 * This is the default export that Cloudflare Workers execute for incoming HTTP requests.
 */
export default {
  /**
   * The main fetch handler for the Cloudflare Worker.
   * This function is invoked for every incoming HTTP request to the Worker's URL.
   *
   * @param {Request} request - The incoming HTTP request object.
   * @param {Env} env - An object containing environment variables configured for the Worker.
   * These variables (e.g., `ODDS_PARENT_URL`, `PROXY_URL`) are defined
   * in `wrangler.toml` or via the Cloudflare dashboard.
   * @param {ExecutionContext} ctx - The context object, providing utilities like `waitUntil`
   * for extending the Worker's lifetime for asynchronous tasks.
   * @returns {Response} The HTTP response to be sent back to the client.
   */
  async fetch(request, env, ctx) {
    // Standard CORS headers for allowing cross-origin requests.
    // For production environments, it is highly recommended to restrict
    // `Access-Control-Allow-Origin` to specific frontend domains for security.
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Allows requests from any origin.
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Specifies allowed HTTP methods.
      'Access-Control-Allow-Headers': 'Content-Type', // Specifies allowed request headers.
    };

    // Handle CORS preflight requests (HTTP OPTIONS method).
    // Browsers send an OPTIONS request before the actual request to check CORS policies.
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      // Retrieve environment variables.
      const apiUrlBase = env.ODDS_PARENT_URL;
      const proxyUrl = env.PROXY_URL;

      // Validate that essential environment variables are configured.
      if (!apiUrlBase || !proxyUrl) {
        console.error("[ERROR] Missing environment variables. ODDS_PARENT_URL or PROXY_URL not set.");
        return new Response(JSON.stringify({
          error: "Configuration Error",
          message: "Required API URLs are not configured in the Worker's environment variables. Please check wrangler.toml or Cloudflare dashboard settings."
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 500 // Internal Server Error due to misconfiguration.
        });
      }

      // Fetch and format the odds data. This is the core logic that retrieves and processes the data.
      const oddsData = await getFormattedMatchesAsJson(apiUrlBase, proxyUrl);

      // Return the formatted data as a JSON response.
      return new Response(JSON.stringify(oddsData, null, 2), {
        headers: {
          'Content-Type': 'application/json', // Indicate that the response body is JSON.
          ...corsHeaders // Include CORS headers to allow the frontend to consume this response.
        },
        status: 200 // HTTP OK status.
      });

    } catch (error) {
      // Catch any unhandled exceptions that occur during the Worker's execution.
      console.error("[CRITICAL] Cloudflare Worker Top-Level Execution Error:", error);

      // Return a generic internal server error response to the client.
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error.message || "An unexpected error occurred during Worker execution. Please check Worker logs for details."
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500 // HTTP Internal Server Error.
      });
    }
  },
};