FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install and build frontend
COPY frontend/package*.json frontend/
RUN npm install --prefix frontend
COPY frontend/ frontend/
RUN npm run build --prefix frontend

# Copy backend source
COPY backend/ backend/

WORKDIR /app/backend

CMD ["sh", "-c", "python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
