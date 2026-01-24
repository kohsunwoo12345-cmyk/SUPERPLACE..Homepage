#!/bin/bash
if [ -f ".cloudflare-auth.json" ]; then
  export CLOUDFLARE_API_TOKEN=$(jq -r '.api_token' .cloudflare-auth.json)
fi
npx wrangler pages deploy dist --project-name=superplace-academy
