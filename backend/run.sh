#!/bin/bash

# Run the FastAPI app with uvicorn using Python directly
echo "Starting FastAPI server..."
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 