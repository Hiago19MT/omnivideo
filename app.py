from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import yt_dlp
import os
import tempfile
import uuid
import shutil
import static_ffmpeg

# Inicializa o FFmpeg embutido
static_ffmpeg.add_paths()

app = Flask(__name__)
CORS(app)

COOKIE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cookies.txt')

def get_base_ydl_opts():
    opts = {
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web', 'web_embedded']
            }
        },
        'geo_bypass': True,
    }
    if os.path.exists(COOKIE_FILE):
        opts['cookiefile'] = COOKIE_FILE
    return opts

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/info', methods=['POST'])
def get_video_info():
    data = request.get_json() or {}
    url = data.get('url', '').strip()

    if not url:
        return jsonify({'error': 'Insira um link válido do YouTube.'}), 400

    ydl_opts = {**get_base_ydl_opts(), 'noplaylist': True}

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Formatos padrões limpos para o usuário escolher
            formats = [
                {'format_id': 'bestvideo+bestaudio/best', 'ext': 'mp4', 'quality': 'Vídeo HD (Melhor Qualidade)'},
                {'format_id': 'best/best', 'ext': 'mp4', 'quality': 'Vídeo Padrão (Compatível)'},
                {'format_id': 'bestaudio/best', 'ext': 'mp3', 'quality': 'Apenas Áudio (MP3)'}
            ]

            video_id = info.get('id')
            embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}" if video_id else None

            return jsonify({
                'title': info.get('title', 'Vídeo do YouTube'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'formats': formats,
                'original_url': url,
                'embed_url': embed_url
            })
    except Exception as e:
        return jsonify({'error': f'Falha ao extrair dados do YouTube: {str(e)}'}), 500

@app.route('/api/download', methods=['GET'])
def download_video():
    video_url = request.args.get('url')
    format_id = request.args.get('format_id', 'bestvideo+bestaudio/best')
    title = request.args.get('title', 'youtube_video')
    is_mp3 = request.args.get('mp3', 'false') == 'true'

    if not video_url:
        return "URL inválida", 400

    temp_dir = tempfile.mkdtemp(prefix="ytdl_")
    unique_id = str(uuid.uuid4())[:8]
    output_template = os.path.join(temp_dir, f"{unique_id}.%(ext)s")

    ydl_opts = {
        **get_base_ydl_opts(),
        'outtmpl': output_template,
        'noplaylist': True,
        'merge_output_format': 'mp4',
    }

    if is_mp3:
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    else:
        ydl_opts['format'] = format_id

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        files = os.listdir(temp_dir)
        if not files:
            shutil.rmtree(temp_dir, ignore_errors=True)
            return "Erro interno ao gerar o arquivo.", 500

        downloaded_file = os.path.join(temp_dir, files[0])
        file_ext = downloaded_file.split('.')[-1]
        
        safe_title = "".join([c for c in title if c.isalnum() or c in (' ', '_', '-')]).strip() or "video"
        final_filename = f"{safe_title}.{file_ext}"

        return send_file(downloaded_file, as_attachment=True, download_name=final_filename)

    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return f"Erro no processamento: {str(e)}", 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)