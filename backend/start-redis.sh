#!/bin/bash
# Start Redis server in background

echo "🚀 Starting Redis server..."

# Check if Redis is already running
if redis-cli ping &>/dev/null; then
    echo "✅ Redis is already running!"
    redis-cli ping
else
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
fi
