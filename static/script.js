// Dicionário de Idiomas (PT, EN, ES)
const i18n = {
    pt: {
        subtitle: "Baixe vídeos e áudios de qualquer plataforma em alta qualidade",
        placeholder: "Cole o link ou pesquise o nome do vídeo...",
        btn_analyze: "Analisar",
        search_results: "Resultados da busca:",
        type_label: "Tipo de Download",
        opt_mp4: "Vídeo (MP4)",
        opt_mp3: "Apenas Áudio (MP3)",
        opt_gif: "Extrator de GIF Animado",
        opt_subtitle: "Baixar Legendas (.SRT / .VTT)",
        quality_label: "Selecione a Qualidade",
        sub_label: "Idioma e Formato da Legenda",
        trim_label: "Corte de Trecho (Opcional - Ex: 00:30 até 01:45)",
        trim_start: "Início (ex: 00:30)",
        trim_end: "Fim (ex: 01:45)",
        btn_download: "Baixar Mídia",
        footer: "OmniVideo © 2026 - O seu baixador de mídia universal",
        alert_empty: "Por favor, insira um link ou nome para pesquisar!",
        processing_info: "Analisando...",
        error_analyze: "Erro ao analisar: ",
        no_subtitles: "Nenhuma legenda encontrada",
        alert_no_subs: "Este vídeo não possui legendas disponíveis.",
        processing_server: "Processando no servidor...",
        processing_download: "Baixando arquivo...",
        success_download: "Download concluído com sucesso!",
        error_server: "Ocorreu um erro no servidor ao gerar o arquivo.",
        video_audio: "Vídeo + Áudio",
        video_only: "Apenas Vídeo",
        best_quality: "Melhor Qualidade",
        btn_download_thumb: "Baixar Capa (HD)",
        qr_code_label: "Abrir no Celular:",
        clipboard_permission_error: "Não foi possível acessar a área de transferência."
    },
    en: {
        subtitle: "Download videos and audio from any platform in high quality",
        placeholder: "Paste link or search video title...",
        btn_analyze: "Analyze",
        search_results: "Search results:",
        type_label: "Download Type",
        opt_mp4: "Video (MP4)",
        opt_mp3: "Audio Only (MP3)",
        opt_gif: "Animated GIF Extractor",
        opt_subtitle: "Download Subtitles (.SRT / .VTT)",
        quality_label: "Select Quality",
        sub_label: "Subtitle Language and Format",
        trim_label: "Video Trimming (Optional - e.g., 00:30 to 01:45)",
        trim_start: "Start (e.g., 00:30)",
        trim_end: "End (e.g., 01:45)",
        btn_download: "Download Media",
        footer: "OmniVideo © 2026 - Your universal media downloader",
        alert_empty: "Please paste a link or enter a search query!",
        processing_info: "Analyzing...",
        error_analyze: "Error analyzing: ",
        no_subtitles: "No subtitles found",
        alert_no_subs: "This video does not have available subtitles.",
        processing_server: "Processing on server...",
        processing_download: "Downloading file...",
        success_download: "Download completed successfully!",
        error_server: "A server error occurred while generating the file.",
        video_audio: "Video + Audio",
        video_only: "Video Only",
        best_quality: "Best Quality",
        btn_download_thumb: "Download Cover (HD)",
        qr_code_label: "Scan for Mobile:",
        clipboard_permission_error: "Could not access clipboard."
    },
    es: {
        subtitle: "Descarga videos y audios de cualquier plataforma en alta calidad",
        placeholder: "Pega el enlace o busca el título del video...",
        btn_analyze: "Analizar",
        search_results: "Resultados de búsqueda:",
        type_label: "Tipo de Descarga",
        opt_mp4: "Video (MP4)",
        opt_mp3: "Solo Audio (MP3)",
        opt_gif: "Extractor de GIF Animado",
        opt_subtitle: "Descargar Subtítulos (.SRT / .VTT)",
        quality_label: "Selecciona la Calidad",
        sub_label: "Idioma y Formato de Subtítulos",
        trim_label: "Recorte de Video (Opcional - Ej: 00:30 a 01:45)",
        trim_start: "Inicio (ej: 00:30)",
        trim_end: "Fin (ej: 01:45)",
        btn_download: "Descargar Media",
        footer: "OmniVideo © 2026 - Tu descargador universal de medios",
        alert_empty: "¡Por favor, ingresa un enlace o nombre para buscar!",
        processing_info: "Analizando...",
        error_analyze: "Error al analizar: ",
        no_subtitles: "No se encontraron subtítulos",
        alert_no_subs: "Este video no tiene subtítulos disponibles.",
        processing_server: "Procesando en el servidor...",
        processing_download: "Descargando archivo...",
        success_download: "¡Descarga completada con éxito!",
        error_server: "Ocurrió un error en el servidor al generar el archivo.",
        video_audio: "Vídeo + Audio",
        video_only: "Solo Video",
        best_quality: "Mejor Calidad",
        btn_download_thumb: "Descargar Portada (HD)",
        qr_code_label: "Abrir en Móvil:",
        clipboard_permission_error: "No se pudo acceder al portapapeles."
    }
};

let currentVideoUrl = '';
let currentEmbedUrl = '';
let videoData = null;
let currentLang = 'pt';

function aplicarTraducao() {
    const userLang = (navigator.language || navigator.userLanguage).slice(0, 2);
    currentLang = i18n[userLang] ? userLang : 'pt';
    const dict = i18n[currentLang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerText = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
}

async function colarDaAreaDeTransferencia() {
    const dict = i18n[currentLang];
    try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = text.trim();
                analisarLink();
            }
        }
    } catch (err) {
        alert(dict.clipboard_permission_error || "Erro ao colar da área de transferência.");
    }
}

function parseHeight(f) {
    if (f.height && !isNaN(f.height)) return parseInt(f.height, 10);
    const searchStr = `${f.resolution || ''} ${f.format_note || ''} ${f.format || ''}`;
    const match = searchStr.match(/(\d{3,4})p?/i);
    return match ? parseInt(match[1], 10) : 0;
}

async function analisarLink() {
    const dict = i18n[currentLang];
    const urlInput = document.getElementById('urlInput');
    const input = urlInput ? urlInput.value.trim() : '';
    
    if (!input) return alert(dict.alert_empty);

    const resultDiv = document.getElementById('result');
    const searchResultsDiv = document.getElementById('searchResults');
    const statusBox = document.getElementById('statusBox');
    
    if (statusBox) statusBox.style.display = 'none';
    if (resultDiv) resultDiv.style.display = 'none';
    if (searchResultsDiv) searchResultsDiv.style.display = 'none';

    const btnAnalyze = document.getElementById('btnAnalyze') || document.querySelector('.btn-analyze');
    const originalBtnHtml = btnAnalyze ? btnAnalyze.innerHTML : '';
    
    if (btnAnalyze) {
        btnAnalyze.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${dict.processing_info}`;
        btnAnalyze.disabled = true;
    }

    try {
        const res = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (data.is_search) {
            renderSearchResults(data.results);
        } else {
            renderVideoDetails(data);
        }
    } catch (e) {
        alert(dict.error_analyze + e.message);
    } finally {
        if (btnAnalyze) {
            btnAnalyze.innerHTML = originalBtnHtml || `<i class="fa-solid fa-magnifying-glass"></i> <span data-i18n="btn_analyze">${dict.btn_analyze}</span>`;
            btnAnalyze.disabled = false;
        }
    }
}

function renderSearchResults(results) {
    const list = document.getElementById('searchResultsList');
    if (!list) return;
    list.innerHTML = '';

    results.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'search-result-item';
        itemDiv.onclick = () => {
            const urlInput = document.getElementById('urlInput');
            if (urlInput) urlInput.value = item.url;
            analisarLink();
        };

        itemDiv.innerHTML = `
            <img src="${item.thumbnail}" alt="Thumbnail">
            <div>
                <h4>${item.title}</h4>
            </div>
        `;
        list.appendChild(itemDiv);
    });

    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.style.display = 'block';
}

function renderVideoDetails(data) {
    const dict = i18n[currentLang];
    videoData = data;
    
    const urlInput = document.getElementById('urlInput');
    currentVideoUrl = data.original_url || (urlInput ? urlInput.value.trim() : '');
    currentEmbedUrl = data.embed_url || '';

    const thumb = document.getElementById('thumb');
    const playOverlay = document.getElementById('playOverlay');
    const iframe = document.getElementById('videoIframe');

    if (thumb) {
        thumb.src = data.thumbnail || 'https://via.placeholder.com/600x330?text=Sem+Thumbnail';
        thumb.style.display = 'block';
    }
    if (iframe) {
        iframe.style.display = 'none';
        iframe.src = '';
    }

    if (playOverlay) playOverlay.style.display = currentEmbedUrl ? 'flex' : 'none';
    
    const videoTitle = document.getElementById('videoTitle');
    if (videoTitle) videoTitle.innerText = data.title;

    const qrImg = document.getElementById('qrCodeImg');
    if (qrImg && currentVideoUrl) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentVideoUrl)}`;
    }

    const select = document.getElementById('formatSelect');
    if (select) {
        select.innerHTML = '';

        if (data.formats && data.formats.length > 0) {
            const videoFormats = data.formats.filter(f => {
                const typeLower = (f.type || '').toLowerCase();
                const vcodec = (f.vcodec || '').toLowerCase();
                const ext = (f.ext || '').toLowerCase();

                if (vcodec === 'none' || ext === 'mp3' || ext === 'm4a') return false;
                if (typeLower.includes('apenas áudio') || typeLower.includes('apenas audio') || typeLower.includes('audio only')) return false;

                return true;
            });

            const formatsToUse = videoFormats.length > 0 ? videoFormats : data.formats;
            formatsToUse.sort((a, b) => parseHeight(b) - parseHeight(a));

            formatsToUse.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.format_id || 'best';
                opt.dataset.ext = f.ext || 'mp4';

                const heightNum = parseHeight(f);
                let res = heightNum ? `${heightNum}p` : (f.format_note || f.resolution || '');

                let typeText = '';
                const typeLower = (f.type || '').toLowerCase();
                if (typeLower.includes('video + audio') || typeLower.includes('vídeo + áudio')) {
                    typeText = dict.video_audio;
                } else if (typeLower.includes('video apenas') || typeLower.includes('video only') || typeLower.includes('apenas vídeo')) {
                    typeText = dict.video_only;
                }

                let label = res || dict.best_quality;
                if (typeText) {
                    label += ` - [${typeText}]`;
                }

                opt.innerText = label;
                select.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = 'best';
            opt.innerText = dict.best_quality;
            select.appendChild(opt);
        }
    }

    const subLangSelect = document.getElementById('subLangSelect');
    if (subLangSelect) {
        subLangSelect.innerHTML = '';
        if (data.subtitles && data.subtitles.length > 0) {
            data.subtitles.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.lang;
                opt.innerText = s.name;
                subLangSelect.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = dict.no_subtitles;
            subLangSelect.appendChild(opt);
        }
    }

    alterarTipoDownload();
    const resultDiv = document.getElementById('result');
    if (resultDiv) resultDiv.style.display = 'block';
}

function baixarThumbnail() {
    if (!videoData || !videoData.thumbnail) return;

    const title = videoData.title || 'capa';
    const thumbUrl = videoData.thumbnail;

    // Redireciona via endpoint no backend Flask para evitar CORS e forçar o download direto no navegador
    const downloadApi = `/api/download-thumb?url=${encodeURIComponent(thumbUrl)}&title=${encodeURIComponent(title)}`;

    const a = document.createElement('a');
    a.href = downloadApi;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function playVideo() {
    if (!currentEmbedUrl) return;

    const thumb = document.getElementById('thumb');
    const playOverlay = document.getElementById('playOverlay');
    const iframe = document.getElementById('videoIframe');

    if (thumb) thumb.style.display = 'none';
    if (playOverlay) playOverlay.style.display = 'none';
    
    if (iframe) {
        iframe.src = currentEmbedUrl + (currentEmbedUrl.includes('?') ? '&autoplay=1' : '?autoplay=1');
        iframe.style.display = 'block';
    }
}

function alterarTipoDownload() {
    const downloadType = document.getElementById('downloadType');
    if (!downloadType) return;

    const type = downloadType.value;
    const formatGroup = document.getElementById('formatGroup');
    const subtitleGroup = document.getElementById('subtitleGroup');
    const trimGroup = document.getElementById('trimGroup');

    if (formatGroup) formatGroup.style.display = (type === 'mp4') ? 'block' : 'none';
    if (subtitleGroup) subtitleGroup.style.display = (type === 'subtitle') ? 'block' : 'none';
    if (trimGroup) trimGroup.style.display = (type !== 'subtitle') ? 'block' : 'none';
}

async function baixar() {
    const dict = i18n[currentLang];
    const downloadType = document.getElementById('downloadType');
    const type = downloadType ? downloadType.value : 'mp4';
    
    const videoTitle = document.getElementById('videoTitle');
    const title = videoTitle ? videoTitle.innerText : 'video';
    
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    const start = startTime ? startTime.value.trim() : '';
    const end = endTime ? endTime.value.trim() : '';

    if (!currentVideoUrl) return;

    let ext = 'mp4';
    let downloadApi = `/api/download?url=${encodeURIComponent(currentVideoUrl)}&title=${encodeURIComponent(title)}`;

    if (start) downloadApi += `&start=${encodeURIComponent(start)}`;
    if (end) downloadApi += `&end=${encodeURIComponent(end)}`;

    if (type === 'mp4') {
        const formatSelect = document.getElementById('formatSelect');
        const formatId = formatSelect ? formatSelect.value : 'best';
        ext = 'mp4';
        downloadApi += `&format_id=${encodeURIComponent(formatId)}&ext=mp4`;
    } else if (type === 'mp3') {
        ext = 'mp3';
        downloadApi += `&ext=mp3`;
    } else if (type === 'gif') {
        ext = 'gif';
        downloadApi += `&ext=gif`;
    } else if (type === 'subtitle') {
        const subLangSelect = document.getElementById('subLangSelect');
        const subExtSelect = document.getElementById('subExtSelect');
        const lang = subLangSelect ? subLangSelect.value : '';
        ext = subExtSelect ? subExtSelect.value : 'srt';
        if (!lang) return alert(dict.alert_no_subs);
        downloadApi += `&sub_lang=${encodeURIComponent(lang)}&ext=${ext}`;
    }

    const statusBox = document.getElementById('statusBox');
    const statusText = document.getElementById('statusText');
    const progressPercent = document.getElementById('progressPercent');
    const progressBarFill = document.getElementById('progressBarFill');

    if (statusBox) statusBox.style.display = 'flex';
    if (statusText) {
        statusText.innerText = dict.processing_server;
        statusText.style.color = '#fff';
    }
    if (progressPercent) progressPercent.innerText = '0%';
    if (progressBarFill) progressBarFill.style.width = '0%';

    const downloadBtn = document.querySelector('.download-btn');
    if (downloadBtn) downloadBtn.disabled = true;

    try {
        const response = await fetch(downloadApi);

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(errorMsg || dict.error_server);
        }

        if (statusText) statusText.innerText = dict.processing_download;

        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            if (total > 0) {
                const percent = Math.min(Math.round((loaded / total) * 100), 100);
                if (progressPercent) progressPercent.innerText = `${percent}%`;
                if (progressBarFill) progressBarFill.style.width = `${percent}%`;
            } else {
                const mb = (loaded / (1024 * 1024)).toFixed(1);
                if (progressPercent) progressPercent.innerText = `${mb} MB`;
                if (progressBarFill) progressBarFill.style.width = '100%';
            }
        }

        if (progressPercent) progressPercent.innerText = '100%';
        if (progressBarFill) progressBarFill.style.width = '100%';

        let filename = '';
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;'"\n]*)['"]?/i);
            if (filenameMatch && filenameMatch[1]) {
                filename = decodeURIComponent(filenameMatch[1]);
            }
        }

        if (!filename) {
            const safeTitle = title.replace(/[^\w\s\-_]/gi, '').trim() || 'omnivideo';
            filename = `${safeTitle}.${ext}`;
        }

        const blob = new Blob(chunks);
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        if (statusText) {
            statusText.innerText = dict.success_download;
            statusText.style.color = '#10b981';
        }
    } catch (err) {
        if (statusText) {
            statusText.innerText = err.message;
            statusText.style.color = '#f87171';
        }
    } finally {
        if (downloadBtn) downloadBtn.disabled = false;
    }
}

// Torna as funções globais para suporte a onclick inline no HTML
window.colarDaAreaDeTransferencia = colarDaAreaDeTransferencia;
window.analisarLink = analisarLink;
window.baixarThumbnail = baixarThumbnail;
window.playVideo = playVideo;
window.alterarTipoDownload = alterarTipoDownload;
window.baixar = baixar;

// Inicialização dos Eventos DOM
document.addEventListener('DOMContentLoaded', () => {
    aplicarTraducao();

    // Associação de eventos com verificação preventiva de seletores
    document.querySelector('.btn-paste')?.addEventListener('click', colarDaAreaDeTransferencia);
    document.getElementById('btnAnalyze')?.addEventListener('click', analisarLink);
    document.querySelector('.btn-thumb-download')?.addEventListener('click', baixarThumbnail);
    document.getElementById('playOverlay')?.addEventListener('click', playVideo);
    document.getElementById('downloadType')?.addEventListener('change', alterarTipoDownload);
    document.querySelector('.download-btn')?.addEventListener('click', baixar);

    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                analisarLink();
            }
        });

        urlInput.addEventListener('paste', () => {
            setTimeout(() => {
                const val = urlInput.value.trim();
                if (val.startsWith('http://') || val.startsWith('https://')) {
                    analisarLink();
                }
            }, 100);
        });
    }
});