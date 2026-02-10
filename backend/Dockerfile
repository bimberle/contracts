FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Docker CLI for self-update capability
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && rm get-docker.sh \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Start server with migrations via entrypoint
CMD ["python", "entrypoint.py"]
