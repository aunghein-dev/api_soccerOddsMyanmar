# API Soccer Odds

This is a Cloudflare Worker that acts as a simple proxy to fetch and format sports odds data. It's built with JavaScript for better code organization and error checking.

**This project is for educational purposes only.**

## How It Works

1.  **Receives Request**: The Worker receives an HTTP request.
2.  **Fetches Data**: It then makes a request to a Google Apps Script proxy, which in turn fetches data from an external odds API.
3.  **Processes Data**: The raw data is cleaned, parsed, and transformed into a more user-friendly JSON format.
4.  **Returns JSON**: The formatted JSON data is sent back as the response.

## Getting Started

### Prerequisites

- Node.js and npm
- Wrangler (Cloudflare Workers CLI): `npm install -g wrangler`
- A Cloudflare account
- The URL of a Google Apps Script proxy.
- The base URL of the external odds API.

## Deployment

1.  Ensure the Worker is built (if applicable, e.g., `npm run build`).
2.  Log in to Wrangler: `wrangler login`
3.  Deploy: `npm run deploy`

The deployed Worker will be accessible at: [https://odd.aunghein-mm.workers.dev/](https://odd.aunghein-mm.workers.dev/)

## API Usage

Make a `GET` request to the Worker's URL. It will return formatted odds data in JSON.

**Example Response:**

```json
[
  {
    "league": "ICELAND PREMIER LEAGUE",
    "time": "1:45AM",
    "homeTeam": "Vikingur Reykjavik",
    "awayTeam": "Valur Reykjavik",
    "isHomeTeamHighlighted": true,
    "isAwayTeamHighlighted": false,
    "odds": "0-70",
    "finalGoalPoints": "3+14"
  }
]
```
