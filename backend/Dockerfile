FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y wget curl ca-certificates libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libx11-6 libx11-xcb1 libxcb1 libxext6 libxshmfence1 libglib2.0-0 fonts-liberation --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install playwright==1.47.0
RUN playwright install chromium
RUN mkdir -p /app/certificados_servidor /app/downloads_temp
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
