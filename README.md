# Patreon Poetry Worker

A Cloudflare Worker that fetches poetry posts from your Patreon campaign and serves them as structured JSON data.

## Features

- Fetches posts from the Patreon API
- Extracts poetry posts tagged with `#poetry`
- Structures the data with title, category, and content
- Serves data only to requests from `YOUR_DOMAIN` variable

## Prerequisites

- Node.js and npm installed
- Cloudflare account
- Wrangler CLI installed globally (`npm install -g wrangler`)

## Setup Instructions

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/patreon-poetry-worker.git
   cd patreon-poetry-worker
   ```
2. **Install Dependencies**:
   ```
   npm install
   ```
3. **Update `worker.js` with Your Variables**:
   ```javascript
   const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your Patreon Access Token
   const CAMPAIGN_ID = 'YOUR_CAMPAIGN_ID'; // Replace with your Patreon Campaign ID
   const ALLOWED_ORIGIN = 'YOUR_DOMAIN'; // Replace with your allowed CORS origin
   ```
4. **Configure `wrangler.toml`**:
   - Replace `your-account-id` with your Cloudflare account ID.
   - Ensure `compatibility_date` is set to the current date.
   ```toml
   name = "patreon-poetry-worker"
   main = "worker.js"
   compatibility_date = "2023-10-16"
   account_id = "your-account-id"
   ```
5. **Publish the Worker**:
   ```
   wrangler publish
   ```
6. **Test the Worker**:
   Visit `https://patreon-poetry-worker.your-subdomain.workers.dev/patreon-poetry` (replace `patreon-poetry-worker` and `your-subdomain` with your worker's name and domain).
7. **(Optional) Custom Domain**:
   - Configure a route in your Cloudflare dashboard.
   - Update the `wrangler.toml` file:
     ```toml
     routes = [ { pattern = "your.custom.domain/*", custom_domain = true } ]
     ```

## Notes

- The worker only responds to requests from `YOUR_DOMAIN` variable.
- Ensure your Patreon Access Token and Campaign ID are kept secret.
- Do not commit sensitive information to your repository if it's public.

## Support

For any issues or questions, please open an issue on the repository.