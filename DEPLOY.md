# Deploy na Oracle Cloud — passo a passo

## 1. Suba o código normalmente (git, docker build, etc.)
O `.gitignore` continua ignorando `cookies.txt` de propósito — cookies são
credenciais e nunca devem passar pelo repositório.

## 2. Gere o arquivo de cookies (fora do git)
1. Instale a extensão "Get cookies.txt LOCALLY" no navegador.
2. Logado no YouTube, exporte os cookies daquele domínio.
3. Sem sair da mesma extensão/aba, faça login no Instagram e exporte os
   cookies dele também — pode ficar tudo no **mesmo arquivo** `cookies.txt`
   (o formato Netscape guarda o domínio linha a linha).
4. Envie esse arquivo direto para o servidor, por fora do deploy:
   ```bash
   scp cookies.txt usuario@seu-servidor-oracle:/caminho/da/app/cookies.txt
   ```
   Se usar Docker, monte como volume em vez de copiar pra dentro da imagem:
   ```bash
   docker run -v /caminho/local/cookies.txt:/app/cookies.txt ...
   ```

## 3. Cookies expiram — tenha uma rotina
Cookies de sessão ficam inválidos com o tempo (e o Instagram é mais agressivo
nisso que o YouTube). Refaça o passo 2 sempre que os downloads voltarem a
falhar com erro de login/bot.

## 4. Mantenha o yt-dlp atualizado
O YouTube muda o extractor com frequência. Rode isso periodicamente no
servidor (ou automatize num cron/job):
```bash
pip install -U yt-dlp --break-system-packages
```
Depois reinicie o serviço (`systemctl restart` ou o que estiver usando).

## 5. Sobre o "download rápido"
O `/api/info` agora retorna, quando possível, uma URL direta do CDN do
YouTube/TikTok/X para o formato progressivo de melhor qualidade disponível.
O navegador baixa esse arquivo sozinho, sem passar pelo seu servidor — isso
não resolve bloqueio de bot na extração (que ainda depende dos cookies acima),
mas tira carga e tempo de resposta do seu servidor Oracle nos downloads mais
simples. Corte de trecho, GIF, MP3 e Instagram continuam passando pelo
`/api/download` normalmente, porque exigem processamento no servidor.
