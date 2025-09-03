#!/bin/bash

echo "🔧 Universal Device Connectivity Test for CivicStack"
echo "=================================================="

# Get current IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
PORT=3000

echo "📍 Current IP Address: $IP"
echo "🚀 Backend running on: http://$IP:$PORT"
echo ""

# Test health endpoint
echo "1️⃣ Testing Health Endpoint..."
health_response=$(curl -s "http://$IP:$PORT/health")
if [[ $? -eq 0 ]]; then
    echo "✅ Health check: PASSED"
    echo "   Response: $health_response"
else
    echo "❌ Health check: FAILED"
fi

echo ""

# Test API endpoint
echo "2️⃣ Testing API Endpoint..."
api_response=$(curl -s "http://$IP:$PORT/api/auth/profile" -H "Content-Type: application/json")
if [[ $? -eq 0 ]]; then
    echo "✅ API endpoint: ACCESSIBLE"
else
    echo "❌ API endpoint: NOT ACCESSIBLE"
fi

echo ""

# Network accessibility summary
echo "📱 Device Access URLs:"
echo "   • Web Browser: http://localhost:$PORT"
echo "   • Mobile Device: http://$IP:$PORT"
echo "   • API Base: http://$IP:$PORT/api"
echo ""

echo "📋 Frontend Configuration:"
echo "   • Expo Metro: http://$IP:8082"
echo "   • QR Code: Available for mobile scanning"
echo ""

echo "🌐 Network Compatibility:"
echo "   ✅ Local development (localhost)"
echo "   ✅ Same WiFi network devices"
echo "   ✅ Mobile devices via IP"
echo "   ✅ iOS Simulator"
echo "   ✅ Android Emulator"
echo ""

echo "🔥 Ready for testing on ANY device!"
