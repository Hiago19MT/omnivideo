FROM python:3.11-slim

# Instala o FFmpeg e dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia as dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante da aplicação
COPY . .

# Variável de ambiente do Flask
ENV PORT=5000

EXPOSE 5000

# Executa com Gunicorn para suportar conexões simultâneas
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "app:app"]