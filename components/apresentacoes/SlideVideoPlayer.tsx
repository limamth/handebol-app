"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Upload } from "lucide-react";
import { extrairYoutubeId, formatarTempo, type FormaTelestracao } from "@/lib/video-tagging";
import { CanvasTelestracao } from "@/components/video/CanvasTelestracao";

interface SlideVideoPlayerProps {
  projetoVideo: {
    id: string;
    titulo: string;
    tipo_fonte: "local" | "youtube";
    url_video?: string | null;
    nome_arquivo?: string | null;
  };
  tempoInicio: number;
  tempoFim: number;
  desenhoTempo?: number | null;
  desenhoDados?: FormaTelestracao[] | null;
  localUrl?: string | null;
  onSelecionarArquivoLocal?: (projetoId: string, url: string) => void;
  autoPlay?: boolean;
}

export function SlideVideoPlayer({
  projetoVideo,
  tempoInicio,
  tempoFim,
  desenhoTempo,
  desenhoDados,
  localUrl,
  onSelecionarArquivoLocal,
  autoPlay = false,
}: SlideVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(tempoInicio);
  const [desenhoVisivel, setDesenhoVisivel] = useState<FormaTelestracao[] | null>(null);
  const [desenhoJaPausou, setDesenhoJaPausou] = useState(false);

  const ytId = projetoVideo.tipo_fonte === "youtube" ? extrairYoutubeId(projetoVideo.url_video ?? "") : null;

  // Reinicia ao trocar de slide/corte
  useEffect(() => {
    setDesenhoVisivel(null);
    setDesenhoJaPausou(false);
    setTempoAtual(tempoInicio);

    if (projetoVideo.tipo_fonte === "local" && videoRef.current) {
      videoRef.current.currentTime = tempoInicio;
      if (autoPlay) {
        videoRef.current.play().catch(() => {});
      }
    } else if (projetoVideo.tipo_fonte === "youtube" && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(tempoInicio, true);
      if (autoPlay) ytPlayerRef.current.playVideo();
    }
  }, [projetoVideo.id, projetoVideo.tipo_fonte, tempoInicio, tempoFim, autoPlay]);

  // Inicializa YouTube IFrame API
  useEffect(() => {
    if (projetoVideo.tipo_fonte !== "youtube" || !ytId) return;

    const iniciar = () => {
      if (!ytContainerRef.current || ytPlayerRef.current) return;
      ytPlayerRef.current = new (window as any).YT.Player(ytContainerRef.current, {
        videoId: ytId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(tempoInicio) },
        events: {
          onReady: (e: any) => {
            e.target.seekTo(tempoInicio, true);
            if (autoPlay) e.target.playVideo();
          },
          onStateChange: (e: any) => {
            setTocando(e.data === (window as any).YT?.PlayerState?.PLAYING);
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      iniciar();
    } else {
      (window as any).onYouTubeIframeAPIReady = iniciar;
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    }

    return () => {
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [projetoVideo.tipo_fonte, ytId]);

  // Controle de fim do recorte e pausa automática na telestração
  useEffect(() => {
    const timer = setInterval(() => {
      let cur = tempoAtual;
      if (projetoVideo.tipo_fonte === "youtube" && ytPlayerRef.current?.getCurrentTime) {
        cur = ytPlayerRef.current.getCurrentTime() || 0;
        setTempoAtual(cur);
      } else if (projetoVideo.tipo_fonte === "local" && videoRef.current) {
        cur = videoRef.current.currentTime;
      }

      if (
        desenhoDados &&
        desenhoDados.length > 0 &&
        desenhoTempo !== null &&
        desenhoTempo !== undefined &&
        tocando &&
        !desenhoJaPausou &&
        cur >= desenhoTempo
      ) {
        pausar();
        setDesenhoVisivel(desenhoDados);
        setDesenhoJaPausou(true);
        return;
      }

      if (tocando && tempoFim > tempoInicio && cur >= tempoFim) {
        pausar();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [projetoVideo.tipo_fonte, tocando, tempoInicio, tempoFim, desenhoDados, desenhoTempo, desenhoJaPausou, tempoAtual]);

  const pausar = () => {
    if (projetoVideo.tipo_fonte === "youtube" && ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    setTocando(false);
  };

  const alternarPlay = () => {
    if (projetoVideo.tipo_fonte === "youtube" && ytPlayerRef.current) {
      if (tocando) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  };

  const repetirCorte = () => {
    setDesenhoVisivel(null);
    setDesenhoJaPausou(false);
    setTempoAtual(tempoInicio);
    if (projetoVideo.tipo_fonte === "youtube" && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(tempoInicio, true);
      ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      videoRef.current.currentTime = tempoInicio;
      videoRef.current.play().catch(() => {});
    }
  };

  if (projetoVideo.tipo_fonte === "local" && !localUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-white space-y-3">
        <Upload className="h-8 w-8 text-bola-400" />
        <div>
          <p className="font-titulo text-base font-bold">
            Selecionar Vídeo Local: {projetoVideo.titulo}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Escolha o arquivo no computador uma única vez para reproduzir todos os cortes deste jogo nesta apresentação.
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-bola-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
          Carregar Arquivo (.mp4 / .mov)
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onSelecionarArquivoLocal) {
                onSelecionarArquivoLocal(projetoVideo.id, URL.createObjectURL(f));
              }
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-black shadow-lg">
      <div className="relative aspect-video w-full bg-black">
        {projetoVideo.tipo_fonte === "local" && localUrl ? (
          <video
            ref={videoRef}
            src={localUrl}
            onTimeUpdate={() => {
              if (videoRef.current) setTempoAtual(videoRef.current.currentTime);
            }}
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onClick={alternarPlay}
            className="h-full w-full cursor-pointer object-contain"
          />
        ) : (
          <div ref={ytContainerRef} className="h-full w-full" />
        )}

        {desenhoVisivel && (
          <CanvasTelestracao
            formas={desenhoVisivel}
            editavel={false}
            onContinuarVideo={() => {
              setDesenhoVisivel(null);
              alternarPlay();
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-3 py-2 text-xs text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={alternarPlay}
            className="inline-flex items-center gap-1 rounded bg-bola-500 px-2.5 py-1 font-semibold hover:opacity-90"
          >
            {tocando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {tocando ? "Pausar" : "Play"}
          </button>

          <button
            type="button"
            onClick={repetirCorte}
            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Repetir Corte
          </button>
        </div>

        <span className="font-mono text-[11px] text-slate-300">
          {formatarTempo(tempoAtual, true)} · Corte: {formatarTempo(tempoInicio)} → {formatarTempo(tempoFim)}
        </span>
      </div>
    </div>
  );
}
