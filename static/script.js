let videoData = null;

document.getElementById('btnAnalyze').addEventListener('click', analisarVideo);
document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analisarVideo();
});
document.getElementById('btnDownload').addEventListener('click', baixarMidia);

async function analisarVideo() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) return alert('Por favor, cole uma URL do YouTube.');

    const btn = document.getElementById('btnAnalyze');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analisando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        videoData = data;
        document.getElementById('thumbImg').src = data.thumbnail;
        document.getElementById('videoTitle').innerText = data.title;

        const select = document.getElementById('formatSelect');
        select.innerHTML = '';
        data.formats.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.format_id;
            opt.dataset.ext = f.ext;
            opt.innerText = f.quality;
            select.appendChild(opt);
        });

        document.getElementById('resultArea').style.display = 'block';
    } catch (err) {
        alert('Erro: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Analisar';
        btn.disabled = false;
    }
}

async function baixarMidia() {
    if (!videoData) return;

    const select = document.getElementById('formatSelect');
    const formatId = select.value;
    const isMp3 = formatId.includes('audio');
    
    const btn = document.getElementById('btnDownload');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Baixando do servidor...';
    btn.disabled = true;

    const queryParams = new URLSearchParams({
        url: videoData.original_url,
        format_id: formatId,
        title: videoData.title,
        mp3: isMp3 ? 'true' : 'false'
    });

    try {
        const response = await fetch(`/api/download?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Falha ao gerar arquivo no servidor.');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        let filename = `${videoData.title.replace(/[^\w\s]/gi, '')}.${isMp3 ? 'mp3' : 'mp4'}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
        alert('Erro ao baixar: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-download"></i> Baixar Mídia Agora';
        btn.disabled = false;
    }
}