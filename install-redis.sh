#!/bin/bash
# Install and start Redis in GitHub Codespace

echo "📦 Installing Redis..."

# Update package list and install Redis
sudo apt-get update -qq
sudo apt-get install -y redis-server

echo "🚀 Starting Redis server..."

# Start Redis in daemon mode
redis-server --daemonize yes

# Wait a moment for it to start
sleep 1

# Verify it started
if redis-cli ping &>/dev/null; then
    echo "✅ Redis started successfully!"
    redis-cli ping
else
    echo "❌ Failed to start Redis"
    exit 1
fi

echo ""
echo "Redis is now running on localhost:6379"
echo "You can now run: npm run dev"
