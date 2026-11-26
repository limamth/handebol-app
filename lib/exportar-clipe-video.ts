/**
 * Exporta um trecho recortado (tempoInicio -> tempoFim) de um arquivo de vídeo local
 * diretamente no navegador usando MediaRecorder e dispara o download.
 */
export async function baixarClipeRecortado(opts: {
  videoUrl: string;
  tempoInicio: number;
  tempoFim: number;
  nomeArquivo: string;
  onProgresso?: (pct: number) => void;
}): Promise<void> {
  const { videoUrl, tempoInicio, tempoFim, nomeArquivo, onProgresso } = opts;
  const duracao = Math.max(0.5, tempoFim - tempoInicio);

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = false;
    video.volume = 0.001; // mantém faixa de áudio ativa sem estourar o som durante a gravação

    const limpar = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => {
      limpar();
      reject(new Error("Não foi possível carregar o vídeo para recorte."));
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.max(0, tempoInicio);
    };

    let gravacaoIniciada = false;

    video.onseeked = () => {
      if (gravacaoIniciada) return;
      gravacaoIniciada = true;

      let stream: MediaStream | null = null;
      const vAny = video as any;
      if (typeof vAny.captureStream === "function") {
        stream = vAny.captureStream();
      } else if (typeof vAny.mozCaptureStream === "function") {
        stream = vAny.mozCaptureStream();
      }

      // Fallback para Canvas caso captureStream direto do <video> não esteja disponível
      let canvasTimer: number | null = null;
      if (!stream) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          limpar();
          reject(new Error("Navegador não suporta captura de vídeo."));
          return;
        }
        stream = canvas.captureStream(30);
        const desenhar = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          canvasTimer = requestAnimationFrame(desenhar);
        };
        canvasTimer = requestAnimationFrame(desenhar);
      }

      // Escolhe o melhor formato suportado (MP4 se disponível, senão WebM)
      const mimeCandidatos = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = mimeCandidatos.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const extensao = mimeType.includes("mp4") ? "mp4" : "webm";

      const chunks: BlobPart[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })
          : new MediaRecorder(stream);
      } catch (err) {
        if (canvasTimer) cancelAnimationFrame(canvasTimer);
        limpar();
        reject(new Error("Falha ao inicializar gravador de recorte no navegador."));
        return;
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (canvasTimer) cancelAnimationFrame(canvasTimer);
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomeArquivo}.${extensao}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        limpar();
        onProgresso?.(100);
        resolve();
      };

      recorder.start(200);
      video.play().catch((err) => {
        recorder.stop();
        limpar();
        reject(err);
      });

      const checarFim = setInterval(() => {
        const atual = video.currentTime;
        const pct = Math.min(99, Math.max(0, Math.round(((atual - tempoInicio) / duracao) * 100)));
        onProgresso?.(pct);

        if (atual >= tempoFim || video.ended) {
          clearInterval(checarFim);
          video.pause();
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }
      }, 80);
    };
  });
}

/**
 * Grava múltiplos cortes em sequência em um único arquivo de vídeo (Mix da Playlist)
 */
export async function baixarMixPlaylist(opts: {
  videoUrl: string;
  clipes: { tempoInicio: number; tempoFim: number }[];
  nomeArquivo: string;
  onProgresso?: (pct: number, indiceAtual: number, total: number) => void;
}): Promise<void> {
  const { videoUrl, clipes, nomeArquivo, onProgresso } = opts;
  if (clipes.length === 0) throw new Error("A playlist está vazia.");

  const duracaoTotal = clipes.reduce((acc, c) => acc + Math.max(0.5, c.tempoFim - c.tempoInicio), 0);

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = false;
    video.volume = 0.001;

    let audioCtx: AudioContext | null = null;
    let rafId: number | null = null;
    let checkTimer: ReturnType<typeof setInterval> | null = null;

    const limpar = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (checkTimer) clearInterval(checkTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };

    video.onerror = () => {
      limpar();
      reject(new Error("Erro ao carregar vídeo para gerar mix."));
    };

    let indice = 0;
    let acumuladoSeg = 0;
    let recorder: MediaRecorder | null = null;
    let iniciado = false;
    let aguardandoSeek = false;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      // Limita a 1280px de largura para manter gravação rápida e leve
      const escala = w > 1280 ? 1280 / w : 1;
      canvas.width = Math.round(w * escala);
      canvas.height = Math.round(h * escala);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        limpar();
        reject(new Error("Navegador não suporta Canvas 2D."));
        return;
      }

      const canvasStream = canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      // Tenta capturar trilha de áudio contínua via Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtx = new AudioCtx();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          dest.stream.getAudioTracks().forEach((t) => tracks.push(t));
        }
      } catch {
        // Se falhar áudio, segue normalmente apenas com vídeo
      }

      const finalStream = new MediaStream(tracks);
      const mimeCandidatos = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = mimeCandidatos.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const extensao = mimeType.includes("mp4") ? "mp4" : "webm";
      const chunks: BlobPart[] = [];

      try {
        recorder = mimeType
          ? new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: 2_500_000 })
          : new MediaRecorder(finalStream);
      } catch {
        limpar();
        reject(new Error("Falha ao inicializar gravador do mix."));
        return;
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${nomeArquivo}.${extensao}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        limpar();
        onProgresso?.(100, clipes.length, clipes.length);
        resolve();
      };

      const desenharFrame = () => {
        if (!video.paused && !video.ended && !aguardandoSeek) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        rafId = requestAnimationFrame(desenharFrame);
      };
      rafId = requestAnimationFrame(desenharFrame);

      aguardandoSeek = true;
      video.currentTime = Math.max(0, clipes[0].tempoInicio);
    };

    video.onseeked = () => {
      if (!recorder || !aguardandoSeek) return;
      aguardandoSeek = false;

      if (!iniciado) {
        iniciado = true;
        recorder.start(200);
      } else if (recorder.state === "paused") {
        recorder.resume();
      }

      video.play().catch((err) => {
        recorder?.stop();
        limpar();
        reject(err);
      });

      if (!checkTimer) {
        checkTimer = setInterval(() => {
          if (aguardandoSeek || !recorder) return;
          const clipe = clipes[indice];
          if (!clipe) return;

          const atual = video.currentTime;
          const decorridoClipe = Math.max(0, atual - clipe.tempoInicio);
          const pct = Math.min(99, Math.round(((acumuladoSeg + decorridoClipe) / duracaoTotal) * 100));
          onProgresso?.(pct, indice + 1, clipes.length);

          if (atual >= clipe.tempoFim || video.ended) {
            video.pause();
            if (recorder.state === "recording") {
              recorder.pause();
            }
            acumuladoSeg += Math.max(0.5, clipe.tempoFim - clipe.tempoInicio);
            indice++;

            if (indice < clipes.length) {
              aguardandoSeek = true;
              video.currentTime = Math.max(0, clipes[indice].tempoInicio);
            } else {
              if (checkTimer) clearInterval(checkTimer);
              if (recorder.state !== "inactive") {
                recorder.stop();
              }
            }
          }
        }, 80);
      }
    };
  });
}
