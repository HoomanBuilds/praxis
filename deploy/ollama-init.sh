#!/usr/bin/env bash
# PRAXIS — Ollama model initialization
# Run after docker-compose.prod.yml is up to pull the LLM model
set -euo pipefail

MODEL="${PRAXIS_LLM_MODEL:-llama3.1:8b}"

echo "=== PRAXIS Ollama Model Setup ==="
echo "Model: $MODEL"

# Wait for Ollama container to be ready
echo "Waiting for Ollama to start..."
for i in $(seq 1 30); do
    if docker compose -f docker-compose.prod.yml exec -T ollama ollama list &>/dev/null; then
        echo "Ollama is ready."
        break
    fi
    echo "  Attempt $i/30..."
    sleep 5
done

# Pull the model
echo "Pulling $MODEL (this may take several minutes)..."
docker compose -f docker-compose.prod.yml exec -T ollama ollama pull "$MODEL"

# Verify
echo "Verifying model..."
docker compose -f docker-compose.prod.yml exec -T ollama ollama list

echo ""
echo "=== Model ready ==="
