from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from apscheduler.schedulers.background import BackgroundScheduler
import yt_dlp
import os
import tempfile
import static_ffmpeg
import uuid
import subprocess
import re
import shutil
import requests
import time
from io import BytesIO
from urllib.parse import urlparse, parse_qs

# Garante a presença e o registro das bibliotecas do FFmpeg no ambiente
static_ffmpeg.add_paths()

app = Flask(__name__)
CORS(app, expose_headers=["Content-Disposition"])

# -----------------------------------------------------------------------------
# 1. RATE LIMITING (Proteção contra abusos e tráfego automatizado)
# -----------------------------------------------------------------------------
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"  # Em produção com múltiplos workers, pode apontar para Redis: redis://localhost:6379
)

# Handler personalizado para retornos amigáveis quando o limite for excedido
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Muitas requisições. Aguarde um pouco e tente novamente."}), 429

# -----------------------------------------------------------------------------
# 2. CACHE DE METADADOS (Em Memória / Flask-Caching)
# -----------------------------------------------------------------------------
cache = Cache(app, config={
    'CACHE_TYPE': 'SimpleCache',  # Para produção robusta com múltiplos processos, mude para 'RedisCache'
    'CACHE_DEFAULT_TIMEOUT': 1800  # Metadados cacheados por 30 minutos
})

# -----------------------------------------------------------------------------
# 3. LIMPEZA AUTOMÁTICA DE DISCO EM BACKGROUND (APScheduler)
# -----------------------------------------------------------------------------
TEMP_BASE_DIR = tempfile.gettempdir()
OMNIVIDEO_TEMP_PREFIX = "omnivideo_tmp_"

def cleanup_old_files():
    """Worker em background que remove pastas temporárias antigas (mais de 15 min)."""
    now = time.time()
    cutoff = now - (15 * 60)  # 15 minutos em segundos

    try:
        for item in os.listdir(TEMP_BASE_DIR):
            if item.startswith(OMNIVIDEO_TEMP_PREFIX):
                folder_path = os.path.join(TEMP_BASE_DIR, item)
                if os.path.isdir(folder_path):
                    if os.path.getmtime(folder_path) < cutoff:
                        shutil.rmtree(folder_path, ignore_errors=True)
    except Exception as e:
        print(f"[CLEANUP ERROR] Falha na limpeza em background: {e}")

# Inicia o agendador em segundo plano rodando a cada 10 minutos
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(cleanup_old_files, 'interval', minutes=10)
scheduler.start()

# -----------------------------------------------------------------------------
# FUNÇÕES AUXILIARES
# -----------------------------------------------------------------------------
def is_url(text):
    return text.startswith(('http://', 'https://', 'www.'))

def clean_youtube_url(url):
    if 'youtube.com/watch' in url and 'v=' in url:
        parsed = urlparse(url)
        video_id = parse_qs(parsed.query).get('v', [None])[0]
        if video_id:
            return f"https://www.youtube.com/watch?v={video_id}"
    return url

def parse_time_to_seconds(time_str):
    """Converte formatos flexíveis de tempo para segundos numéricos."""
    if not time_str:
        return None
    
    clean_str = str(time_str).strip().lower()

    if clean_str.isdigit():
        return int(clean_str)

    m_s_match = re.match(r'^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$', clean_str)
    if m_s_match and any(m_s_match.groups()):
        h, m, s = m_s_match.groups()
        return (int(h or 0) * 3600) + (int(m or 0) * 60) + int(s or 0)

    parts = re.split(r'[:.,]', clean_str)
    try:
        parts = [int(p) for p in parts if p.strip() != '']
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 1:
            return parts[0]
    except ValueError:
        return None

    return None

def get_base_ydl_opts():
    """Retorna as opções base do yt-dlp, injetando clientes alternativos e cookies."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        # Força clientes alternativos do YouTube para evitar bloqueio de "bot" em IPs de nuvem
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'mweb', 'web']
            }
        }
    }
    
    cookies_content = os.environ.get("YT_COOKIES_CONTENT")
    if cookies_content:
        try:
            cookie_file = tempfile.NamedTemporaryFile(delete=False, mode='w', encoding='utf-8')
            cookie_file.write(cookies_content)
            cookie_file.close()
            ydl_opts['cookiefile'] = cookie_file.name
        except Exception as e:
            print(f"[DEBUG ERROR] Falha ao criar arquivo de cookies: {e}")

    return ydl_opts

# Chave customizada para isolar o cache com base estrita na URL informada
def make_cache_key():
    data = request.get_json() or {}
    return f"info_url:{data.get('url', '').strip()}"

# -----------------------------------------------------------------------------
# ROTAS
# -----------------------------------------------------------------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/info', methods=['POST'])
@limiter.limit("15 per minute")  # Limite específico para buscas/análises
@cache.cached(timeout=1800, key_prefix=make_cache_key)  # Retorna instantaneamente se já foi buscado recentemente
def get_video_info():
    data = request.get_json() or {}
    user_input = data.get('url', '').strip()

    if not user_input:
        return jsonify({'error': 'Digite um nome ou cole uma URL válida.'}), 400

    ydl_opts = get_base_ydl_opts()

    if not is_url(user_input):
        ydl_opts['extract_flat'] = True
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_results = ydl.extract_info(f"ytsearch5:{user_input}", download=False)
                results = []
                for entry in search_results.get('entries', []):
                    results.append({
                        'title': entry.get('title'),
                        'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                        'thumbnail': entry.get('thumbnails', [{}])[-1].get('url'),
                        'duration': entry.get('duration')
                    })
                return jsonify({'is_search': True, 'results': results})
        except Exception as e:
            return jsonify({'error': f'Erro ao realizar busca: {str(e)}'}), 500

    url = clean_youtube_url(user_input)
    ydl_opts['noplaylist'] = True

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = [
                {'format_id': 'bestvideo+bestaudio/best', 'ext': 'mp4', 'quality': 'Melhor Qualidade', 'type': 'Vídeo + Áudio'},
                {'format_id': 'bestaudio/best', 'ext': 'mp3', 'quality': 'Áudio MP3', 'type': 'Apenas Áudio'}
            ]

            subtitles = []
            all_subs = {**info.get('subtitles', {}), **info.get('automatic_captions', {})}
            for lang in sorted(all_subs.keys()):
                subtitles.append({'lang': lang, 'name': lang.upper()})

            video_id = info.get('id')
            extractor = info.get('extractor', '').lower()
            embed_url = None

            if video_id and ('youtube' in extractor or 'youtube' in url or 'youtu.be' in url):
                embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}"

            return jsonify({
                'is_search': False,
                'title': info.get('title', 'video_omnivideo'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'formats': formats,
                'subtitles': subtitles,
                'original_url': url,
                'embed_url': embed_url
            })
    except Exception as e:
        return jsonify({'error': f'Falha ao processar o vídeo: {str(e)}'}), 500

@app.route('/api/download-thumb')
@limiter.limit("20 per minute")
def download_thumb():
    thumb_url = request.args.get('url')
    title = request.args.get('title', 'capa')
    
    if not thumb_url:
        return "URL da imagem inválida", 400

    try:
        response = requests.get(thumb_url, timeout=10)
        response.raise_for_status()

        safe_title = "".join([c for c in title if c.isalnum() or c in (' ', '_', '-')]).strip() or "capa"
        filename = f"{safe_title}_capa.jpg"

        return send_file(
            BytesIO(response.content),
            mimetype='image/jpeg',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return f"Erro ao baixar imagem: {str(e)}", 500

@app.route('/api/download')
@limiter.limit("5 per minute")  # Protege o processamento pesado de conversão/vídeo no servidor
def download_file():
    raw_video_url = request.args.get('url')
    format_id = request.args.get('format_id', 'bestvideo+bestaudio/best')
    title = request.args.get('title', 'omnivideo')
    ext_req = request.args.get('ext', 'mp4')
    
    start_time = parse_time_to_seconds(request.args.get('start'))
    end_time = parse_time_to_seconds(request.args.get('end'))
    sub_lang = request.args.get('sub_lang')

    if not raw_video_url:
        return "URL inválida", 400

    video_url = clean_youtube_url(raw_video_url)
    
    # Cria pasta temporária usando o prefixo gerenciado pelo background worker
    temp_dir = tempfile.mkdtemp(prefix=OMNIVIDEO_TEMP_PREFIX)
    unique_id = str(uuid.uuid4())[:8]
    output_template = os.path.join(temp_dir, f"{unique_id}.%(ext)s")

    ydl_opts = get_base_ydl_opts()
    ydl_opts.update({
        'outtmpl': output_template,
        'noplaylist': True,
        'merge_output_format': 'mp4'
    })

    if start_time is not None and end_time is not None and end_time > start_time:
        ydl_opts['download_ranges'] = lambda info_dict, ydl: [{'start_time': start_time, 'end_time': end_time}]
        ydl_opts['force_keyframes_at_cuts'] = True

    if ext_req in ['srt', 'vtt'] and sub_lang:
        ydl_opts.update({
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': [sub_lang],
            'subtitlesformat': ext_req,
            'outtmpl': os.path.join(temp_dir, f"{unique_id}")
        })
    elif ext_req == 'gif':
        ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    elif ext_req == 'mp3' or format_id == 'bestaudio/best':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
        })
    else:
        ydl_opts['format'] = format_id

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        files = os.listdir(temp_dir)
        if not files:
            shutil.rmtree(temp_dir, ignore_errors=True)
            return "Erro ao gerar arquivo.", 500

        downloaded_file_path = os.path.join(temp_dir, files[0])

        if ext_req == 'gif':
            gif_path = os.path.join(temp_dir, f"{unique_id}.gif")
            cmd = [
                'ffmpeg', '-y',
                '-i', downloaded_file_path,
                '-vf', 'fps=10,scale=480:-1:flags=lanczos',
                gif_path
            ]
            subprocess.run(cmd, check=True)
            downloaded_file_path = gif_path

        file_ext = downloaded_file_path.split('.')[-1]
        safe_title = "".join([c for c in title if c.isalnum() or c in (' ', '_', '-')]).strip() or "omnivideo"
        final_filename = f"{safe_title}.{file_ext}"

        return send_file(downloaded_file_path, as_attachment=True, download_name=final_filename)

    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return f"Erro ao processar: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)