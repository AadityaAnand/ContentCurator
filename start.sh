#!/bin/bash

echo "Content Curator - Startup Script"
echo "=================================="
echo ""

# Check if Ollama is running
echo "Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama is not running!"
    echo "Please start Ollama first:"
    echo "  ollama serve"
    exit 1
fi
echo "✓ Ollama is running"

# Check if required models are installed
echo ""
echo "Checking Ollama models..."
if ! ollama list | grep -q "llama3.2"; then
    echo "Installing llama3.2..."
    ollama pull llama3.2
fi

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "Installing nomic-embed-text..."
    ollama pull nomic-embed-text
fi
echo "✓ Required models installed"

# Start Docker services
echo ""
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
echo "Checking PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U curator > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
echo "✓ PostgreSQL is ready"

# Run migrations
echo ""
echo "Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Check backend health
echo ""
echo "Checking backend API..."
until curl -s http://localhost:8000/health > /dev/null 2>&1; do
    echo "Waiting for backend API..."
    sleep 2
done
echo "✓ Backend API is ready"

# Check frontend
echo ""
echo "Checking frontend..."
until curl -s http://localhost:3000 > /dev/null 2>&1; do
    echo "Waiting for frontend..."
    sleep 2
done
echo "✓ Frontend is ready"

echo ""
echo "=================================="
echo "✓ Content Curator is ready!"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo "=================================="
