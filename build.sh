#!/bin/bash
# Build script for Render

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Building frontend..."
npm run build

echo "Installing backend dependencies..."
cd ../backend
pip install -r requirements.txt

echo "Build complete!"
