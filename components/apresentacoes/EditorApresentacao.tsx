"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Download,
  Eye,
  EyeOff,
  FileText,
  Film,
  Globe,
  HardDriveDownload,
  Link2,
  ListVideo,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  converterUrlDriveParaEmbed,
  type Apresentacao,
  type ApresentacaoSlide,
} from "@/lib/apresentacoes";
import { formatarTempo } from "@/lib/video-tagging";
import { criarClienteBrowser } from "@/lib/supabase/client";
import {
  obterPdfOffline,
  removerPdfOffline,
  salvarPdfOffline,
} from "@/lib/offline-pdf-cache";
import {
  adicionarPlaylistEmApresentacao,
  atualizarMetadadosApresentacao,
  criarSlide,
  excluirSlide,
  reordenarSlides,
} from "@/app/(app)/apresentacoes/actions";
import { SlideVideoPlayer } from "./SlideVideoPlayer";

interface ProjetoVideoComTags {
  id: string;
  titulo: string;
  tipo_fonte: "local" | "youtube";
  url_video?: string | null;
  nome_arquivo?: string | null;
  tags: {
    id: string;
    categoria: string;
    cor: string;
    tempo_inicio: number;
    tempo_fim: number;
    atleta_nome?: string | null;
    observacao?: string | null;
    desenho_tempo?: number | null;
    desenho_dados?: any;
  }[];
  playlists?: {
    id: string;
    nome: string;
    tag_ids: string[];
  }[];
}

interface EditorApresentacaoProps {
  apresentacaoInicial: Apresentacao;
  slidesIniciais: ApresentacaoSlide[];
  projetosVideo: ProjetoVideoComTags[];
  podeEditar: boolean;
}

type ModoPalco = "drive" | "pdf" | "video";

function formatarBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function EditorApresentacao({
  apresentacaoInicial,
  slidesIniciais,
  projetosVideo,
  podeEditar,
}: EditorApresentacaoProps) {
  const [apresentacao, setApresentacao] = useState<Apresentacao>(apresentacaoInicial);
  const [slides, setSlides] = useState<ApresentacaoSlide[]>(
    slidesIniciais.filter((s) => s.tipo === "video_corte" || s.projeto_video_id)
  );
  const [corteIdx, setCorteIdx] = useState(0);

  // Estado de rede (online / offline)
  const [estaOnline, setEstaOnline] = useState(true);

  // Link Google Drive / Slides
  const [driveUrlInput, setDriveUrlInput] = useState(apresentacaoInicial.google_slides_url ?? "");
  const embedDriveUrl = useMemo(
    () => converterUrlDriveParaEmbed(apresentacao.google_slides_url),
    [apresentacao.google_slides_url]
  );

  // Cache Offline PDF (IndexedDB + Supabase Storage)
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfCacheInfo, setPdfCacheInfo] = useState<{
    nome: string;
    tamanhoBytes: number;
    salvoEm: number;
  } | null>(null);
  const [carregandoPdf, setCarregandoPdf] = useState(false);

  // Modo de exibição no palco
  const [modoPalco, setModoPalco] = useState<ModoPalco>(() => {
    if (apresentacaoInicial.google_slides_url) return "drive";
    if (apresentacaoInicial.pdf_storage_path) return "pdf";
    return "video";
  });

  // Tela Cheia
  const [modoApresentacao, setModoApresentacao] = useState(false);
  const palcoFullscreenRef = useRef<HTMLDivElement>(null);

  // Arquivos de vídeo locais selecionados nesta sessão
  const [localFilesMap, setLocalFilesMap] = useState<Record<string, string>>({});

  // Formulário para vincular novo corte ou playlist
  const [novoProjetoId, setNovoProjetoId] = useState(projetosVideo[0]?.id ?? "");
  const [novoTagId, setNovoTagId] = useState(projetosVideo[0]?.tags?.[0]?.id ?? "");
  const [importPlaylistId, setImportPlaylistId] = useState(
    projetosVideo[0]?.playlists?.[0]?.id ?? ""
  );

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mostrarFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Monitora status online/offline do navegador
  useEffect(() => {
    const atualizar = () => {
      const online = navigator.onLine;
      setEstaOnline(online);
      if (!online) {
        setModoPalco((atual) => (atual === "drive" ? (pdfObjectUrl ? "pdf" : "video") : atual));
      }
    };
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, [pdfObjectUrl]);

  // Carrega PDF do cache offline (IndexedDB) ao abrir; se não tiver e houver no Storage + online, baixa automaticamente
  useEffect(() => {
    let cancelado = false;
    let urlCriada: string | null = null;

    const carregar = async () => {
      try {
        const cached = await obterPdfOffline(apresentacao.id);
        if (cached && !cancelado) {
          urlCriada = URL.createObjectURL(cached.blob);
          setPdfObjectUrl(urlCriada);
          setPdfCacheInfo({
            nome: cached.nome,
            tamanhoBytes: cached.tamanhoBytes,
            salvoEm: cached.salvoEm,
          });
          return;
        }

        // Se ainda não está em cache local, mas existe no Supabase Storage e estamos online, baixa para o cache offline
        if (apresentacao.pdf_storage_path && navigator.onLine) {
          setCarregandoPdf(true);
          const supabase = criarClienteBrowser();
          const { data, error } = await supabase.storage
            .from("apresentacoes")
            .download(apresentacao.pdf_storage_path);
          if (!error && data && !cancelado) {
            const reg = await salvarPdfOffline(
              apresentacao.id,
              data,
              apresentacao.pdf_nome ?? "apresentacao.pdf"
            );
            urlCriada = URL.createObjectURL(reg.blob);
            setPdfObjectUrl(urlCriada);
            setPdfCacheInfo({
              nome: reg.nome,
              tamanhoBytes: reg.tamanhoBytes,
              salvoEm: reg.salvoEm,
            });
          }
        }
      } catch {
        // Ignora erro silencioso de cache inicial
      } finally {
        if (!cancelado) setCarregandoPdf(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
  }, [apresentacao.id, apresentacao.pdf_storage_path, apresentacao.pdf_nome]);

  // Sincroniza saída do modo fullscreen nativo do navegador (ex: ESC)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && modoApresentacao) {
        setModoApresentacao(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [modoApresentacao]);

  // Navegação por teclado na Tela Cheia (para cortes de vídeo e ESC)
  useEffect(() => {
    if (!modoApresentacao) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        sairTelaCheia();
      } else if (modoPalco === "video" && slides.length > 0) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setCorteIdx((i) => Math.min(slides.length - 1, i + 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setCorteIdx((i) => Math.max(0, i - 1));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modoApresentacao, modoPalco, slides.length]);

  const entrarTelaCheia = (modoInicial?: ModoPalco) => {
    if (modoInicial) setModoPalco(modoInicial);
    setModoApresentacao(true);
    requestAnimationFrame(() => {
      try {
        const el = palcoFullscreenRef.current ?? document.documentElement;
        el.requestFullscreen?.().catch(() => {});
      } catch {}
    });
  };

  const sairTelaCheia = () => {
    setModoApresentacao(false);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  const salvarLinkDrive = () => {
    const urlLimpa = driveUrlInput.trim() || null;
    startTransition(async () => {
      try {
        await atualizarMetadadosApresentacao(apresentacao.id, {
          googleSlidesUrl: urlLimpa,
        });
        setApresentacao((p) => ({ ...p, google_slides_url: urlLimpa }));
        if (urlLimpa && estaOnline) setModoPalco("drive");
        mostrarFeedback(urlLimpa ? "Link do Google Drive salvo!" : "Link removido.");
      } catch (err: any) {
        alert("Erro ao salvar link: " + err.message);
      }
    });
  };

  const handleUploadPdf = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Selecione um arquivo PDF (.pdf).");
      return;
    }

    setCarregandoPdf(true);
    try {
      // 1. Salva imediatamente no Cache Offline (IndexedDB) deste navegador
      const reg = await salvarPdfOffline(apresentacao.id, file, file.name);
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
      const novaUrl = URL.createObjectURL(reg.blob);
      setPdfObjectUrl(novaUrl);
      setPdfCacheInfo({
        nome: reg.nome,
        tamanhoBytes: reg.tamanhoBytes,
        salvoEm: reg.salvoEm,
      });

      // 2. Se estiver online, envia também para o Supabase Storage para outros dispositivos
      if (navigator.onLine) {
        const supabase = criarClienteBrowser();
        const storagePath = `${apresentacao.clube_id}/${apresentacao.id}/apresentacao.pdf`;
        const { error: errUp } = await supabase.storage
          .from("apresentacoes")
          .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

        if (errUp) {
          alert(
            `O PDF foi salvo no cache offline deste navegador, mas houve um erro ao enviar para a nuvem (${errUp.message}). Verifique se a migração 030 foi executada no Supabase.`
          );
        } else {
          await atualizarMetadadosApresentacao(apresentacao.id, {
            pdfStoragePath: storagePath,
            pdfNome: file.name,
            pdfTamanhoBytes: file.size,
          });
          setApresentacao((p) => ({
            ...p,
            pdf_storage_path: storagePath,
            pdf_nome: file.name,
            pdf_tamanho_bytes: file.size,
          }));
          mostrarFeedback("PDF enviado e salvo no cache offline!");
        }
      } else {
        mostrarFeedback("PDF salvo no cache offline deste navegador!");
      }

      if (!embedDriveUrl || !estaOnline) setModoPalco("pdf");
    } catch (err: any) {
      alert("Erro ao processar PDF: " + err.message);
    } finally {
      setCarregandoPdf(false);
    }
  };

  const baixarParaCacheOffline = async () => {
    if (!apresentacao.pdf_storage_path) return;
    setCarregandoPdf(true);
    try {
      const supabase = criarClienteBrowser();
      const { data, error } = await supabase.storage
        .from("apresentacoes")
        .download(apresentacao.pdf_storage_path);
      if (error || !data) throw new Error(error?.message ?? "Erro ao baixar PDF.");

      const reg = await salvarPdfOffline(
        apresentacao.id,
        data,
        apresentacao.pdf_nome ?? "apresentacao.pdf"
      );
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl(URL.createObjectURL(reg.blob));
      setPdfCacheInfo({
        nome: reg.nome,
        tamanhoBytes: reg.tamanhoBytes,
        salvoEm: reg.salvoEm,
      });
      mostrarFeedback("PDF salvo no cache offline deste dispositivo!");
    } catch (err: any) {
      alert("Erro ao baixar PDF: " + err.message);
    } finally {
      setCarregandoPdf(false);
    }
  };

  const handleRemoverPdf = async () => {
    if (!confirm("Remover o PDF desta apresentação e limpar o cache offline?")) return;
    setCarregandoPdf(true);
    try {
      await removerPdfOffline(apresentacao.id);
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl(null);
      setPdfCacheInfo(null);

      if (apresentacao.pdf_storage_path && navigator.onLine) {
        const supabase = criarClienteBrowser();
        await supabase.storage.from("apresentacoes").remove([apresentacao.pdf_storage_path]);
        await atualizarMetadadosApresentacao(apresentacao.id, {
          pdfStoragePath: null,
          pdfNome: null,
          pdfTamanhoBytes: null,
        });
        setApresentacao((p) => ({
          ...p,
          pdf_storage_path: null,
          pdf_nome: null,
          pdf_tamanho_bytes: null,
        }));
      }
      if (modoPalco === "pdf") {
        setModoPalco(embedDriveUrl ? "drive" : "video");
      }
      mostrarFeedback("PDF removido.");
    } catch (err: any) {
      alert("Erro ao remover PDF: " + err.message);
    } finally {
      setCarregandoPdf(false);
    }
  };

  const vincularCorteUnico = () => {
    const proj = projetosVideo.find((p) => p.id === novoProjetoId);
    const tag = proj?.tags.find((t) => t.id === novoTagId);
    if (!proj || !tag) {
      alert("Selecione um projeto de vídeo e um corte.");
      return;
    }

    startTransition(async () => {
      try {
        const criado = await criarSlide(apresentacao.id, {
          tipo: "video_corte",
          ordem: slides.length,
          titulo: `${tag.categoria}${tag.atleta_nome ? ` — ${tag.atleta_nome}` : ""}`,
          conteudo: tag.observacao ?? null,
          projetoVideoId: proj.id,
          tagVideoId: tag.id,
          videoTempoInicio: tag.tempo_inicio,
          videoTempoFim: tag.tempo_fim,
        });
        setSlides((prev) => [...prev, criado]);
        setCorteIdx(slides.length);
        mostrarFeedback("Corte de vídeo vinculado à apresentação!");
      } catch (err: any) {
        alert("Erro ao vincular corte: " + err.message);
      }
    });
  };

  const importarPlaylistParaApresentacao = () => {
    if (!novoProjetoId || !importPlaylistId) return;
    startTransition(async () => {
      try {
        const res = await adicionarPlaylistEmApresentacao({
          apresentacaoId: apresentacao.id,
          projetoVideoId: novoProjetoId,
          playlistId: importPlaylistId,
          incluirCapaPlaylist: false,
        });
        setSlides((prev) => [...prev, ...res.slidesCriados]);
        setCorteIdx(slides.length);
        mostrarFeedback(`${res.slidesCriados.length} corte(s) da playlist vinculados!`);
      } catch (err: any) {
        alert("Erro ao importar playlist: " + err.message);
      }
    });
  };

  const moverCorte = (idx: number, direcao: -1 | 1) => {
    const alvo = idx + direcao;
    if (alvo < 0 || alvo >= slides.length) return;
    const copia = [...slides];
    const [movido] = copia.splice(idx, 1);
    copia.splice(alvo, 0, movido);
    setSlides(copia);
    setCorteIdx(alvo);
    startTransition(async () => {
      await reordenarSlides(
        apresentacao.id,
        copia.map((s) => s.id)
      );
    });
  };

  const removerCorte = (slideId: string, idx: number) => {
    startTransition(async () => {
      await excluirSlide(apresentacao.id, slideId);
      const nova = slides.filter((s) => s.id !== slideId);
      setSlides(nova);
      setCorteIdx(Math.max(0, Math.min(idx, nova.length - 1)));
    });
  };

  const corteAtivo = slides[corteIdx] ?? null;
  const projDoCorteAtivo = corteAtivo
    ? projetosVideo.find((p) => p.id === corteAtivo.projeto_video_id) ?? corteAtivo.projeto_video ?? null
    : null;
  const tagDoCorteAtivo = corteAtivo
    ? (projDoCorteAtivo && "tags" in projDoCorteAtivo
        ? (projDoCorteAtivo as ProjetoVideoComTags).tags.find((t) => t.id === corteAtivo.tag_video_id)
        : null) ?? corteAtivo.tag_video ?? null
    : null;

  const renderPalcoConteudo = (emTelaCheia: boolean) => {
    if (modoPalco === "drive") {
      if (!embedDriveUrl) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-300 space-y-2">
            <Globe className="h-10 w-10 text-sky-400" />
            <p className="font-titulo text-lg font-bold text-white">
              Nenhum link do Google Drive configurado
            </p>
            <p className="text-xs max-w-md">
              Cole o link de compartilhamento do Google Apresentações abaixo para apresentar online com todas as animações.
            </p>
          </div>
        );
      }

      if (!estaOnline) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-300 space-y-3">
            <WifiOff className="h-10 w-10 text-amber-400" />
            <p className="font-titulo text-lg font-bold text-white">Sem conexão com a internet</p>
            <p className="text-xs max-w-md">
              O Google Drive precisa de internet. Use o <strong>Cache PDF (Offline)</strong> ou os{" "}
              <strong>Cortes de Vídeo</strong> vinculados!
            </p>
            {pdfObjectUrl && (
              <button
                type="button"
                onClick={() => setModoPalco("pdf")}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                Abrir PDF Offline Agora
              </button>
            )}
          </div>
        );
      }

      return (
        <iframe
          src={embedDriveUrl}
          className="h-full w-full border-0 bg-black"
          allowFullScreen
          title={apresentacao.titulo}
        />
      );
    }

    if (modoPalco === "pdf") {
      if (!pdfObjectUrl) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-300 space-y-3">
            <CloudOff className="h-10 w-10 text-amber-400" />
            <p className="font-titulo text-lg font-bold text-white">
              {apresentacao.pdf_storage_path
                ? "PDF ainda não salvo no cache offline deste navegador"
                : "Nenhum PDF enviado para modo offline"}
            </p>
            {apresentacao.pdf_storage_path && estaOnline && (
              <button
                type="button"
                disabled={carregandoPdf}
                onClick={baixarParaCacheOffline}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                <HardDriveDownload className="h-4 w-4" />
                {carregandoPdf ? "Baixando..." : "Baixar PDF p/ Cache Offline"}
              </button>
            )}
          </div>
        );
      }

      return (
        <iframe
          src={`${pdfObjectUrl}#toolbar=1&navpanes=0&view=Fit`}
          className="h-full w-full border-0 bg-slate-900"
          title={`${apresentacao.titulo} (PDF Offline)`}
        />
      );
    }

    // modoPalco === "video"
    if (!corteAtivo || !projDoCorteAtivo) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-300 space-y-2">
          <Film className="h-10 w-10 text-bola-400" />
          <p className="font-titulo text-lg font-bold text-white">
            Nenhum corte de vídeo vinculado
          </p>
          <p className="text-xs max-w-md">
            Vincule cortes ou playlists do módulo Vídeo & Tagging abaixo (ou direto da página do vídeo) para reproduzir mesmo offline.
          </p>
        </div>
      );
    }

    const tIni = corteAtivo.video_tempo_inicio ?? tagDoCorteAtivo?.tempo_inicio ?? 0;
    const tFim = corteAtivo.video_tempo_fim ?? tagDoCorteAtivo?.tempo_fim ?? 15;

    return (
      <div className="flex h-full w-full flex-col p-4 sm:p-6 space-y-3 min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div>
            <h3 className="font-titulo text-lg sm:text-2xl font-bold text-white">
              {corteAtivo.titulo || tagDoCorteAtivo?.categoria || "Corte de Vídeo"}
            </h3>
            {corteAtivo.conteudo && (
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{corteAtivo.conteudo}</p>
            )}
          </div>
          {tagDoCorteAtivo && (
            <span className="rounded-full bg-bola-500/20 px-3 py-1 text-xs font-bold text-bola-400">
              {tagDoCorteAtivo.categoria}
              {tagDoCorteAtivo.atleta_nome ? ` · ${tagDoCorteAtivo.atleta_nome}` : ""}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className={emTelaCheia ? "w-full max-w-5xl max-h-[calc(100vh-11rem)]" : "w-full max-w-4xl"}>
            <SlideVideoPlayer
              key={`${corteAtivo.id}-${projDoCorteAtivo.id}`}
              projetoVideo={projDoCorteAtivo}
              tempoInicio={tIni}
              tempoFim={tFim}
              desenhoTempo={tagDoCorteAtivo?.desenho_tempo}
              desenhoDados={tagDoCorteAtivo?.desenho_dados}
              localUrl={localFilesMap[projDoCorteAtivo.id] ?? null}
              onSelecionarArquivoLocal={(id, url) =>
                setLocalFilesMap((prev) => ({ ...prev, [id]: url }))
              }
              autoPlay={emTelaCheia}
            />
          </div>
        </div>
      </div>
    );
  };

  // MODO APRESENTAÇÃO (TELA CHEIA)
  if (modoApresentacao) {
    return (
      <div
        ref={palcoFullscreenRef}
        className="fixed inset-0 z-[100] flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white"
      >
        <div className="flex-1 min-h-0 w-full">{renderPalcoConteudo(true)}</div>

        {/* Barra Inferior do Apresentador */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/85 px-4 sm:px-6 py-2.5 text-xs text-white backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-bola-400 hidden sm:inline">{apresentacao.titulo}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                estaOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {estaOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {estaOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Seletor de Modo dentro da Tela Cheia */}
          <div className="flex items-center gap-1.5">
            {embedDriveUrl && (
              <button
                type="button"
                onClick={() => setModoPalco("drive")}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-semibold ${
                  modoPalco === "drive"
                    ? "bg-sky-600 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Drive (Online)
              </button>
            )}
            {(pdfObjectUrl || apresentacao.pdf_storage_path) && (
              <button
                type="button"
                onClick={() => setModoPalco("pdf")}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-semibold ${
                  modoPalco === "pdf"
                    ? "bg-amber-600 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> PDF (Offline)
              </button>
            )}
            {slides.length > 0 && (
              <button
                type="button"
                onClick={() => setModoPalco("video")}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-semibold ${
                  modoPalco === "video"
                    ? "bg-bola-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <Film className="h-3.5 w-3.5" /> Vídeos ({slides.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {modoPalco === "video" && slides.length > 0 && (
              <>
                <button
                  type="button"
                  disabled={corteIdx === 0}
                  onClick={() => setCorteIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 font-semibold hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <span className="font-mono text-[11px] text-white/70">
                  {corteIdx + 1}/{slides.length}
                </span>
                <button
                  type="button"
                  disabled={corteIdx === slides.length - 1}
                  onClick={() => setCorteIdx((i) => Math.min(slides.length - 1, i + 1))}
                  className="inline-flex items-center gap-1 rounded-md bg-bola-500 px-2.5 py-1.5 font-semibold hover:opacity-90 disabled:opacity-30"
                >
                  Próximo <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={sairTelaCheia}
              className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 font-semibold hover:bg-white/10"
            >
              <Minimize2 className="h-3.5 w-3.5" /> Sair (ESC)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const projetoSelecionado = projetosVideo.find((p) => p.id === novoProjetoId);

  return (
    <div className="space-y-5">
      {/* Barra Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/apresentacoes"
            className="inline-flex items-center gap-1 text-sm font-medium text-suave hover:text-tinta"
          >
            <ArrowLeft className="h-4 w-4" />
            Apresentações
          </Link>
          <span className="text-linha">|</span>
          {podeEditar ? (
            <input
              type="text"
              value={apresentacao.titulo}
              onChange={(e) => setApresentacao((p) => ({ ...p, titulo: e.target.value }))}
              onBlur={() =>
                startTransition(async () => {
                  await atualizarMetadadosApresentacao(apresentacao.id, {
                    titulo: apresentacao.titulo,
                  });
                })
              }
              className="font-titulo text-lg font-bold text-tinta bg-transparent border-b border-transparent hover:border-linha focus:border-bola-500 focus:outline-none"
            />
          ) : (
            <h1 className="font-titulo text-lg font-bold text-tinta">{apresentacao.titulo}</h1>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedback && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {feedback}
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              estaOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {estaOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {estaOnline ? "Online" : "Modo Offline"}
          </span>

          {podeEditar && (
            <button
              type="button"
              onClick={() => {
                const novo = !apresentacao.compartilhado_atletas;
                setApresentacao((p) => ({ ...p, compartilhado_atletas: novo }));
                startTransition(async () => {
                  await atualizarMetadadosApresentacao(apresentacao.id, {
                    compartilhadoAtletas: novo,
                  });
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                apresentacao.compartilhado_atletas
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-linha bg-fundo text-suave"
              }`}
            >
              {apresentacao.compartilhado_atletas ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              {apresentacao.compartilhado_atletas ? "Visível p/ Atletas" : "Só Comissão"}
            </button>
          )}

          <button
            type="button"
            onClick={() => entrarTelaCheia()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bola-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Apresentar (Tela Cheia)
          </button>
        </div>
      </div>

      {/* Configuração: Google Drive (Online) + Cache PDF (Offline) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1: Link Google Drive / Slides (Online) */}
        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-titulo text-sm font-bold text-tinta flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-sky-600" />
              Apresentação Online (Google Slides / Drive)
            </h2>
            {embedDriveUrl && (
              <button
                type="button"
                onClick={() => entrarTelaCheia("drive")}
                className="inline-flex items-center gap-1 rounded bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                <Play className="h-3 w-3" /> Apresentar Online
              </button>
            )}
          </div>

          {podeEditar ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-suave" />
                  <input
                    type="url"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/presentation/d/..."
                    className="w-full rounded-md border border-linha bg-fundo pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={salvarLinkDrive}
                  className="inline-flex items-center gap-1 rounded-md bg-quadra-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Salvar
                </button>
              </div>
              <p className="text-[11px] text-suave">
                No Google Slides/Drive, deixe o link como{" "}
                <strong>&ldquo;Qualquer pessoa com o link pode ver&rdquo;</strong>. Mantém animações e
                vídeos online.
              </p>
            </>
          ) : (
            <p className="text-xs text-suave">
              {embedDriveUrl
                ? "Link do Google Drive configurado para apresentação online."
                : "Nenhum link do Google Drive configurado."}
            </p>
          )}
        </div>

        {/* Card 2: Cache PDF (Offline) */}
        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-titulo text-sm font-bold text-tinta flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-amber-600" />
              Cache Offline (PDF)
            </h2>
            {pdfObjectUrl && (
              <button
                type="button"
                onClick={() => entrarTelaCheia("pdf")}
                className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                <Play className="h-3 w-3" /> Apresentar PDF Offline
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {pdfCacheInfo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Em cache offline: {pdfCacheInfo.nome} ({formatarBytes(pdfCacheInfo.tamanhoBytes)})
              </span>
            ) : apresentacao.pdf_storage_path ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                <Download className="h-3.5 w-3.5" />
                PDF na nuvem ({apresentacao.pdf_nome}) — clique para salvar offline
              </span>
            ) : (
              <span className="text-[11px] text-suave">
                Exporte a apresentação como PDF no Google Slides / PowerPoint e envie aqui para rodar sem internet.
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {podeEditar && (
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-100">
                <Upload className="h-3.5 w-3.5" />
                {carregandoPdf
                  ? "Processando..."
                  : apresentacao.pdf_storage_path || pdfCacheInfo
                    ? "Atualizar PDF"
                    : "Enviar PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPdf(f);
                  }}
                />
              </label>
            )}

            {apresentacao.pdf_storage_path && !pdfCacheInfo && estaOnline && (
              <button
                type="button"
                disabled={carregandoPdf}
                onClick={baixarParaCacheOffline}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <HardDriveDownload className="h-3.5 w-3.5" />
                Salvar p/ Offline neste Dispositivo
              </button>
            )}

            {podeEditar && (apresentacao.pdf_storage_path || pdfCacheInfo) && (
              <button
                type="button"
                onClick={handleRemoverPdf}
                className="text-xs font-semibold text-rose-600 hover:underline ml-auto"
              >
                Remover PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Palco de Pré-visualização */}
      <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModoPalco("drive")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                modoPalco === "drive"
                  ? "bg-sky-600 text-white"
                  : "bg-fundo text-suave hover:text-tinta"
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> Online (Google Drive)
            </button>
            <button
              type="button"
              onClick={() => setModoPalco("pdf")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                modoPalco === "pdf"
                  ? "bg-amber-600 text-white"
                  : "bg-fundo text-suave hover:text-tinta"
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Offline (Cache PDF)
            </button>
            <button
              type="button"
              onClick={() => setModoPalco("video")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                modoPalco === "video"
                  ? "bg-bola-500 text-white"
                  : "bg-fundo text-suave hover:text-tinta"
              }`}
            >
              <Film className="h-3.5 w-3.5" /> Cortes de Vídeo ({slides.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => entrarTelaCheia(modoPalco)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-bola-600 hover:underline"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Abrir este modo em Tela Cheia
          </button>
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
          {renderPalcoConteudo(false)}
        </div>
      </div>

      {/* Cortes de Vídeo & Playlists Vinculados (Funcionam Offline com arquivo local) */}
      <div className="rounded-xl border border-linha bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha pb-3">
          <div>
            <h2 className="font-titulo text-base font-bold text-tinta flex items-center gap-2">
              <Film className="h-4 w-4 text-bola-500" />
              Cortes de Vídeo e Playlists Vinculados ({slides.length})
            </h2>
            <p className="text-xs text-suave">
              Disponíveis na barra inferior durante a apresentação (inclusive no modo offline com vídeo local).
            </p>
          </div>
        </div>

        {/* Lista de Cortes Vinculados */}
        {slides.length === 0 ? (
          <div className="rounded-lg border border-dashed border-linha bg-fundo/50 p-6 text-center text-xs text-suave">
            Nenhum corte vinculado ainda. Adicione abaixo ou envie direto pela página{" "}
            <Link href="/video" className="font-semibold text-bola-600 hover:underline">
              Vídeo &amp; Tagging
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((s, idx) => {
              const ativo = modoPalco === "video" && idx === corteIdx;
              const tIni = s.video_tempo_inicio ?? s.tag_video?.tempo_inicio ?? 0;
              const tFim = s.video_tempo_fim ?? s.tag_video?.tempo_fim ?? 15;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setCorteIdx(idx);
                    setModoPalco("video");
                  }}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition ${
                    ativo
                      ? "border-bola-500 bg-bola-50/70 shadow-sm"
                      : "border-linha bg-fundo/40 hover:bg-fundo"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-suave">
                      <span>#{idx + 1}</span>
                      <span>·</span>
                      <span className="font-mono text-bola-600">
                        {formatarTempo(tIni)} → {formatarTempo(tFim)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-tinta truncate mt-0.5">
                      {s.titulo || s.tag_video?.categoria || "Corte de Vídeo"}
                    </p>
                    {s.projeto_video?.titulo && (
                      <p className="text-[11px] text-suave truncate">{s.projeto_video.titulo}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setCorteIdx(idx);
                        entrarTelaCheia("video");
                      }}
                      className="rounded p-1.5 text-bola-600 hover:bg-bola-100"
                      title="Reproduzir em Tela Cheia"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    {podeEditar && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moverCorte(idx, -1)}
                          className="rounded p-1 text-suave hover:bg-white disabled:opacity-30"
                          title="Subir"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === slides.length - 1}
                          onClick={() => moverCorte(idx, 1)}
                          className="rounded p-1 text-suave hover:bg-white disabled:opacity-30"
                          title="Descer"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerCorte(s.id, idx)}
                          className="rounded p-1 text-suave hover:bg-rose-50 hover:text-rose-600"
                          title="Desvincular corte"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulários para vincular Corte ou Playlist */}
        {podeEditar && projetosVideo.length > 0 && (
          <div className="grid gap-4 border-t border-linha pt-4 lg:grid-cols-2 text-xs">
            {/* Vincular Corte Individual */}
            <div className="rounded-lg border border-linha bg-fundo/50 p-3 space-y-2.5">
              <p className="font-bold text-tinta flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-bola-500" />
                Vincular Corte de Vídeo
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={novoProjetoId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setNovoProjetoId(pId);
                    const p = projetosVideo.find((x) => x.id === pId);
                    setNovoTagId(p?.tags?.[0]?.id ?? "");
                    setImportPlaylistId(p?.playlists?.[0]?.id ?? "");
                  }}
                  className="rounded border border-linha bg-white px-2.5 py-1.5"
                >
                  {projetosVideo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo} ({p.tipo_fonte === "local" ? "Local / Offline" : "YouTube"})
                    </option>
                  ))}
                </select>

                <select
                  value={novoTagId}
                  onChange={(e) => setNovoTagId(e.target.value)}
                  className="rounded border border-linha bg-white px-2.5 py-1.5"
                >
                  <option value="">Selecione um corte...</option>
                  {(projetoSelecionado?.tags ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.categoria} ({formatarTempo(t.tempo_inicio)} → {formatarTempo(t.tempo_fim)})
                      {t.atleta_nome ? ` · ${t.atleta_nome}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={isPending || !novoTagId}
                onClick={vincularCorteUnico}
                className="rounded-md bg-bola-500 px-3.5 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Vincular Corte
              </button>
            </div>

            {/* Importar Playlist Inteira */}
            <div className="rounded-lg border border-quadra-200 bg-quadra-50/50 p-3 space-y-2.5">
              <p className="font-bold text-quadra-900 flex items-center gap-1.5">
                <ListVideo className="h-3.5 w-3.5 text-quadra-600" />
                Vincular Playlist Completa
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={novoProjetoId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setNovoProjetoId(pId);
                    const p = projetosVideo.find((x) => x.id === pId);
                    setNovoTagId(p?.tags?.[0]?.id ?? "");
                    setImportPlaylistId(p?.playlists?.[0]?.id ?? "");
                  }}
                  className="rounded border border-linha bg-white px-2.5 py-1.5"
                >
                  {projetosVideo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>

                <select
                  value={importPlaylistId}
                  onChange={(e) => setImportPlaylistId(e.target.value)}
                  className="rounded border border-linha bg-white px-2.5 py-1.5"
                >
                  <option value="">Selecione uma playlist...</option>
                  {(projetoSelecionado?.playlists ?? []).map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.nome} ({pl.tag_ids.length} cortes)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={isPending || !importPlaylistId}
                onClick={importarPlaylistParaApresentacao}
                className="rounded-md bg-quadra-600 px-3.5 py-1.5 font-semibold text-white hover:bg-quadra-700 disabled:opacity-50"
              >
                Importar Playlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
