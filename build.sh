#!/bin/bash
# Build script for Render - Updated for Python + Node environment

echo "=== Installing Node.js dependencies ==="
cd frontend
npm ci --only=production

echo "=== Building React frontend ==="
npm run build

echo "=== Installing Python dependencies ==="
cd ../backend
pip install -r requirements.txt

echo "=== Build complete! ==="
