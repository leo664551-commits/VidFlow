#!/bin/sh
echo "=== Starting VidFlow on Azure App Service ==="

# Sync database schema if needed
echo "Generating Prisma Client..."
npx prisma generate

echo "Starting Next.js Server on port ${PORT:-8080}..."
exec node_modules/.bin/next start -p ${PORT:-8080} -H 0.0.0.0
