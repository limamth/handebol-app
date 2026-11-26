"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Check,
  X,
  MapPin,
  Pencil,
  ListVideo,
  Link2,
  Grid3X3,
  Crosshair,
  Eye,
  EyeOff,
  Presentation,
} from "lucide-react";
import {
  BOTOES_TAGGING_PADRAO,
  extrairYoutubeId,
  formatarTempo,
  type BotaoTagging,
  type FormaTelestracao,
  type PlaylistVideo,
  type ProjetoVideo,
  type TagVideo,
} from "@/lib/video-tagging";
import {
  alternarCompartilhamentoVideo,
  atualizarPlaylistVideo,
  atualizarTagVideo,
  criarPlaylistVideo,
  criarTagVideo,
  enviarTagParaScout,
  excluirPlaylistVideo,
  excluirTagVideo,
  importarLancesPartidaParaVideo,
  salvarBotoesProjeto,
} from "@/app/(app)/video/actions";
import {
  ROTULO_SETOR_JOGO,
  ROTULO_TIPO_JOGO,
  SETORES_ORIGEM_JOGO,
  TIPOS_ARREMESSO_JOGO,
  type QuadranteBaliza,
  type SetorOrigemJogo,
  type TipoArremessoJogo,
} from "@/lib/scouting";
import { BalizaInterativa } from "@/components/scouting/BalizaInterativa";
import { CanvasTelestracao } from "./CanvasTelestracao";
import { baixarClipeRecortado, baixarMixPlaylist } from "@/lib/exportar-clipe-video";
import {
  adicionarCorteEmApresentacao,
  adicionarPlaylistEmApresentacao,
} from "@/app/(app)/apresentacoes/actions";

interface EquipeScoutSimples {
  id: string;
  nome: string;
  atletas: { id: string; nome: string; numero?: number | null }[];
}

interface EstudioTaggingVideoProps {
  projeto: ProjetoVideo;
  tagsIniciais: TagVideo[];
  playlistsIniciais?: PlaylistVideo[];
  partidasDisponiveis?: { id: string; rotulo: string }[];
  equipesScout?: EquipeScoutSimples[];
  apresentacoesDisponiveis?: { id: string; titulo: string }[];
  podeEditar: boolean;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function EstudioTaggingVideo({
  projeto,
  tagsIniciais,
  playlistsIniciais = [],
  partidasDisponiveis = [],
  equipesScout = [],
  apresentacoesDisponiveis = [],
  podeEditar,
}: EstudioTaggingVideoProps) {
  const [tags, setTags] = useState<TagVideo[]>(tagsIniciais);
  const [playlists, setPlaylists] = useState<PlaylistVideo[]>(playlistsIniciais);
  const [playlistSelecionadaId, setPlaylistSelecionadaId] = useState<string>("");
  const [novaPlaylistNome, setNovaPlaylistNome] = useState("");
  const [mostrarNovaPlaylist, setMostrarNovaPlaylist] = useState(false);
  const [exportandoMix, setExportandoMix] = useState(false);
  const [progressoMix, setProgressoMix] = useState<{ pct: number; atual: number; total: number } | null>(null);
  const [compartilhado, setCompartilhado] = useState(!!projeto.compartilhado_atletas);

  // Modal Enviar para Scout
  const [tagParaScout, setTagParaScout] = useState<TagVideo | null>(null);
  const [scoutEquipeId, setScoutEquipeId] = useState(equipesScout[0]?.id ?? "");
  const [scoutAtletaId, setScoutAtletaId] = useState("");
  const [scoutTipo, setScoutTipo] = useState<TipoArremessoJogo>("giro");
  const [scoutSetor, setScoutSetor] = useState<SetorOrigemJogo>("meio_esq");
  const [scoutQuadrante, setScoutQuadrante] = useState<QuadranteBaliza | null>("sup_esq");
  const [scoutDesfecho, setScoutDesfecho] = useState<"gol" | "defesa" | "trave" | "fora">("gol");

  // Modal Enviar para Apresentação
  const [apresentacoesLocais, setApresentacoesLocais] = useState(apresentacoesDisponiveis);
  const [tagParaApresentacao, setTagParaApresentacao] = useState<TagVideo | null>(null);
  const [playlistParaApresentacao, setPlaylistParaApresentacao] = useState<PlaylistVideo | null>(null);
  const [incluirCapaPlaylist, setIncluirCapaPlaylist] = useState(true);
  const [apresentacaoDestinoId, setApresentacaoDestinoId] = useState(
    apresentacoesDisponiveis[0]?.id ?? "__nova__"
  );
  const [novaApTitulo, setNovaApTitulo] = useState("");
  const [apSlideTitulo, setApSlideTitulo] = useState("");
  const [apSlideConteudo, setApSlideConteudo] = useState("");
  const [botoes, setBotoes] = useState<BotaoTagging[]>(
    projeto.botoes_config && projeto.botoes_config.length > 0
      ? projeto.botoes_config
      : BOTOES_TAGGING_PADRAO
  );

  // Estado do Player
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [ytPronto, setYtPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(projeto.duracao_segundos ?? 0);
  const [velocidade, setVelocidade] = useState(1);

  // Recorte ativo (reprodução de clip) e Playlist contínua
  const [recorteAtivo, setRecorteAtivo] = useState<TagVideo | null>(null);
  const [pararNoFim, setPararNoFim] = useState(true);
  const [playlistAtiva, setPlaylistAtiva] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);

  // Telestração sobre o vídeo
  const [modoDesenho, setModoDesenho] = useState(false);
  const [desenhoEmExibicao, setDesenhoEmExibicao] = useState<FormaTelestracao[] | null>(null);
  const [desenhoJaPausouTagId, setDesenhoJaPausouTagId] = useState<string | null>(null);

  // Sincronização com Análise ao Vivo
  const [mostrarSync, setMostrarSync] = useState(false);
  const [syncPartidaId, setSyncPartidaId] = useState(projeto.partida_analise_id ?? "");
  const [syncSet1Seg, setSyncSet1Seg] = useState<number>(0);
  const [syncSet2Seg, setSyncSet2Seg] = useState<number | null>(null);

  // Tagging rápido
  const [atletaRapido, setAtletaRapido] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroAtleta, setFiltroAtleta] = useState<string>("todos");
  const [mostrarMatriz, setMostrarMatriz] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edição / Ajuste fino do corte de uma tag
  const [tagEditandoId, setTagEditandoId] = useState<string | null>(null);
  const [editInicio, setEditInicio] = useState<number>(0);
  const [editFim, setEditFim] = useState<number>(0);
  const [editAtleta, setEditAtleta] = useState<string>("");
  const [editObs, setEditObs] = useState<string>("");
  const [editCategoria, setEditCategoria] = useState<string>("");

  // Novo botão customizado e edição de botões
  const [mostrarNovoBotao, setMostrarNovoBotao] = useState(false);
  const [editandoBotoes, setEditandoBotoes] = useState(false);
  const [novoBotaoRotulo, setNovoBotaoRotulo] = useState("");
  const [novoBotaoCor, setNovoBotaoCor] = useState("#f97316");
  const [novoBotaoPre, setNovoBotaoPre] = useState(5);
  const [novoBotaoPost, setNovoBotaoPost] = useState(3);

  // Download de clipe recortado
  const [exportandoTagId, setExportandoTagId] = useState<string | null>(null);
  const [progressoClipe, setProgressoClipe] = useState(0);

  const ytId = projeto.tipo_fonte === "youtube" ? extrairYoutubeId(projeto.url_video ?? "") : null;

  // Limpa ObjectURL ao desmontar
  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  // Inicializa YouTube IFrame API se for YouTube
  useEffect(() => {
    if (projeto.tipo_fonte !== "youtube" || !ytId) return;

    const iniciarPlayer = () => {
      if (!ytContainerRef.current || ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: ytId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e: any) => {
            setYtPronto(true);
            const d = e.target.getDuration?.();
            if (d) setDuracao(d);
          },
          onStateChange: (e: any) => {
            setTocando(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    if (window.YT?.Player) {
      iniciarPlayer();
    } else {
      window.onYouTubeIframeAPIReady = iniciarPlayer;
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
  }, [projeto.tipo_fonte, ytId]);

  const categoriasUnicas = Array.from(new Set(tags.map((t) => t.categoria)));
  const atletasUnicos = Array.from(
    new Set(tags.map((t) => t.atleta_nome).filter((n): n is string => !!n && n.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b));

  const playlistAtivaObj = playlists.find((p) => p.id === playlistSelecionadaId) ?? null;

  const tagsBase = playlistAtivaObj
    ? playlistAtivaObj.tag_ids
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is TagVideo => !!t)
    : tags;

  const tagsFiltradas = tagsBase.filter((t) => {
    if (filtroCategoria !== "todas" && t.categoria !== filtroCategoria) return false;
    if (filtroAtleta !== "todos" && (t.atleta_nome ?? "") !== filtroAtleta) return false;
    return true;
  });

  // Polling de tempo para YouTube, pausa na telestração e parada/avanço no fim do recorte
  useEffect(() => {
    const interval = setInterval(() => {
      let current = tempoAtual;
      if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current?.getCurrentTime) {
        current = ytPlayerRef.current.getCurrentTime() || 0;
        setTempoAtual(current);
        const d = ytPlayerRef.current.getDuration?.();
        if (d && d !== duracao) setDuracao(d);
      } else if (projeto.tipo_fonte === "local" && videoRef.current) {
        current = videoRef.current.currentTime;
      }

      // Se a tag tem desenho tático e chegou no tempo exato do desenho, pausa e exibe!
      if (
        recorteAtivo &&
        recorteAtivo.desenho_dados &&
        recorteAtivo.desenho_dados.length > 0 &&
        recorteAtivo.desenho_tempo !== null &&
        recorteAtivo.desenho_tempo !== undefined &&
        tocando &&
        desenhoJaPausouTagId !== recorteAtivo.id &&
        current >= recorteAtivo.desenho_tempo
      ) {
        pausarVideo();
        setDesenhoEmExibicao(recorteAtivo.desenho_dados);
        setDesenhoJaPausouTagId(recorteAtivo.id);
        return;
      }

      if (recorteAtivo && tocando && current >= recorteAtivo.tempo_fim) {
        if (playlistAtiva) {
          const proxIdx = playlistIndex + 1;
          if (proxIdx < tagsFiltradas.length) {
            const prox = tagsFiltradas[proxIdx];
            setPlaylistIndex(proxIdx);
            setDesenhoEmExibicao(null);
            setDesenhoJaPausouTagId(null);
            setRecorteAtivo(prox);
            irParaTempo(prox.tempo_inicio, true);
          } else {
            pausarVideo();
            setPlaylistAtiva(false);
            setRecorteAtivo(null);
            setFeedback("Playlist finalizada!");
            setTimeout(() => setFeedback(null), 2500);
          }
        } else if (pararNoFim) {
          pausarVideo();
          setRecorteAtivo(null);
          setDesenhoEmExibicao(null);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    projeto.tipo_fonte,
    recorteAtivo,
    pararNoFim,
    tocando,
    duracao,
    tempoAtual,
    playlistAtiva,
    playlistIndex,
    tagsFiltradas,
    desenhoJaPausouTagId,
  ]);

  // Controles unificados de Player
  const obterTempoAtual = (): number => {
    if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current?.getCurrentTime) {
      return ytPlayerRef.current.getCurrentTime() || 0;
    }
    return videoRef.current?.currentTime ?? tempoAtual;
  };

  const irParaTempo = (seg: number, darPlay = false) => {
    const alvo = Math.max(0, duracao > 0 ? Math.min(duracao, seg) : seg);
    setTempoAtual(alvo);
    if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(alvo, true);
      if (darPlay) ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      videoRef.current.currentTime = alvo;
      if (darPlay) videoRef.current.play().catch(() => {});
    }
  };

  const alternarPlayPause = () => {
    if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current) {
      if (tocando) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  };

  const pausarVideo = () => {
    if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
    setTocando(false);
  };

  const alterarVelocidade = (v: number) => {
    setVelocidade(v);
    if (projeto.tipo_fonte === "youtube" && ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(v);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = v;
    }
  };

  const avancarSegundos = (delta: number) => {
    const t = obterTempoAtual();
    irParaTempo(t + delta, false);
  };

  // Criar tag a partir de botão ou tecla de atalho
  const dispararTag = (btn: BotaoTagging) => {
    if (!podeEditar) return;
    const t = obterTempoAtual();
    const inicio = Math.max(0, t - btn.preRoll);
    const fim = duracao > 0 ? Math.min(duracao, t + btn.postRoll) : t + btn.postRoll;

    startTransition(async () => {
      try {
        const nova = await criarTagVideo(projeto.id, {
          categoria: btn.rotulo,
          cor: btn.cor,
          tempoInicio: inicio,
          tempoFim: fim,
          atletaNome: atletaRapido || null,
        });
        setTags((prev) => [...prev, nova].sort((a, b) => a.tempo_inicio - b.tempo_inicio));
        setFeedback(`Tag "${btn.rotulo}" salva (${formatarTempo(inicio)} → ${formatarTempo(fim)})`);
        setTimeout(() => setFeedback(null), 2500);
      } catch (err: any) {
        alert("Erro ao criar tag: " + err.message);
      }
    });
  };

  // Atalhos de teclado: Espaço (Play/Pause), Setas (Seek), 1-9 (Tagging)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        alternarPlayPause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        avancarSegundos(e.shiftKey ? -0.04 : -5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        avancarSegundos(e.shiftKey ? 0.04 : 5);
      } else if (podeEditar && /^[1-9]$/.test(e.key)) {
        const btn = botoes.find((b) => b.atalho === e.key);
        if (btn) {
          e.preventDefault();
          dispararTag(btn);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [botoes, tocando, duracao, atletaRapido, podeEditar]);

  // Reproduzir um recorte específico
  const reproduzirRecorte = (tag: TagVideo) => {
    setPlaylistAtiva(false);
    setDesenhoEmExibicao(null);
    setDesenhoJaPausouTagId(null);
    setRecorteAtivo(tag);
    irParaTempo(tag.tempo_inicio, true);
  };

  // Abrir editor de corte de uma tag
  const abrirEdicaoTag = (tag: TagVideo) => {
    setTagEditandoId(tag.id);
    setEditInicio(tag.tempo_inicio);
    setEditFim(tag.tempo_fim);
    setEditAtleta(tag.atleta_nome ?? "");
    setEditObs(tag.observacao ?? "");
    setEditCategoria(tag.categoria);
  };

  const salvarEdicaoTag = (tagId: string) => {
    const inicioValido = Math.max(0, editInicio);
    const fimValido = Math.max(inicioValido + 0.5, editFim);

    startTransition(async () => {
      try {
        const atualizada = await atualizarTagVideo(projeto.id, tagId, {
          categoria: editCategoria,
          tempoInicio: inicioValido,
          tempoFim: fimValido,
          atletaNome: editAtleta,
          observacao: editObs,
        });
        setTags((prev) =>
          prev.map((t) => (t.id === tagId ? atualizada : t)).sort((a, b) => a.tempo_inicio - b.tempo_inicio)
        );
        if (recorteAtivo?.id === tagId) setRecorteAtivo(atualizada);
        setTagEditandoId(null);
        setFeedback(`Recorte ajustado (${formatarTempo(inicioValido, true)} → ${formatarTempo(fimValido, true)})`);
        setTimeout(() => setFeedback(null), 2500);
      } catch (err: any) {
        alert("Erro ao atualizar recorte: " + err.message);
      }
    });
  };

  const handleExcluirTag = (tagId: string) => {
    startTransition(async () => {
      try {
        await excluirTagVideo(projeto.id, tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        if (tagEditandoId === tagId) setTagEditandoId(null);
        if (recorteAtivo?.id === tagId) setRecorteAtivo(null);
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    });
  };

  const adicionarBotaoCustom = () => {
    if (!novoBotaoRotulo.trim()) return;
    const novo: BotaoTagging = {
      id: `custom_${Date.now()}`,
      rotulo: novoBotaoRotulo.trim(),
      cor: novoBotaoCor,
      preRoll: Math.max(0, novoBotaoPre),
      postRoll: Math.max(1, novoBotaoPost),
      atalho: botoes.length < 9 ? String(botoes.length + 1) : "",
    };
    const novaLista = [...botoes, novo];
    setBotoes(novaLista);
    setNovoBotaoRotulo("");
    setMostrarNovoBotao(false);

    startTransition(async () => {
      await salvarBotoesProjeto(projeto.id, novaLista);
    });
  };

  const exportarCsv = () => {
    let csv = "Nº;Categoria;Início;Fim;Duração(s);Atleta;Observação\n";
    tagsFiltradas.forEach((t, i) => {
      const dur = (t.tempo_fim - t.tempo_inicio).toFixed(1);
      csv += `${i + 1};"${t.categoria}";"${formatarTempo(t.tempo_inicio, true)}";"${formatarTempo(
        t.tempo_fim,
        true
      )}";${dur};"${t.atleta_nome ?? ""}";"${(t.observacao ?? "").replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tags_${projeto.titulo.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarXml = () => {
    const escapeXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const instances = tagsFiltradas
      .map(
        (t, idx) => `    <instance>
      <ID>${idx + 1}</ID>
      <start>${t.tempo_inicio.toFixed(2)}</start>
      <end>${t.tempo_fim.toFixed(2)}</end>
      <code>${escapeXml(t.categoria)}</code>${
          t.atleta_nome
            ? `\n      <label><group>Atleta</group><text>${escapeXml(t.atleta_nome)}</text></label>`
            : ""
        }${
          t.observacao
            ? `\n      <label><group>Observacao</group><text>${escapeXml(t.observacao)}</text></label>`
            : ""
        }
    </instance>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<file>\n  <ALL_INSTANCES>\n${instances}\n  </ALL_INSTANCES>\n</file>`;
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tags_${projeto.titulo.replace(/\s+/g, "_")}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tocarCelulaMatriz = (cat: string, atleta: string | null) => {
    setFiltroCategoria(cat);
    setFiltroAtleta(atleta ?? "todos");
    const selecionadas = tags.filter(
      (t) => (cat === "todas" || t.categoria === cat) && (!atleta || t.atleta_nome === atleta)
    );
    if (selecionadas.length > 0 && videoCarregado) {
      setPlaylistAtiva(true);
      setPlaylistIndex(0);
      setDesenhoEmExibicao(null);
      setDesenhoJaPausouTagId(null);
      setRecorteAtivo(selecionadas[0]);
      irParaTempo(selecionadas[0].tempo_inicio, true);
    }
    setMostrarMatriz(false);
  };

  const iniciarPlaylist = () => {
    if (tagsFiltradas.length === 0) return;
    setPlaylistAtiva(true);
    setPlaylistIndex(0);
    setDesenhoEmExibicao(null);
    setDesenhoJaPausouTagId(null);
    setRecorteAtivo(tagsFiltradas[0]);
    irParaTempo(tagsFiltradas[0].tempo_inicio, true);
  };

  const pararPlaylist = () => {
    setPlaylistAtiva(false);
    setRecorteAtivo(null);
    pausarVideo();
  };

  const abrirDesenho = () => {
    pausarVideo();
    setModoDesenho(true);
  };

  const salvarDesenho = (formas: FormaTelestracao[]) => {
    const t = obterTempoAtual();
    const alvoTag = tagEditandoId
      ? tags.find((x) => x.id === tagEditandoId)
      : recorteAtivo;

    startTransition(async () => {
      try {
        if (alvoTag) {
          const atualizada = await atualizarTagVideo(projeto.id, alvoTag.id, {
            tempoInicio: Math.min(alvoTag.tempo_inicio, Math.max(0, t - 2)),
            tempoFim: Math.max(alvoTag.tempo_fim, t + 2),
            atletaNome: alvoTag.atleta_nome,
            observacao: alvoTag.observacao,
            desenhoTempo: t,
            desenhoDados: formas,
          });
          setTags((prev) =>
            prev.map((x) => (x.id === alvoTag.id ? atualizada : x)).sort((a, b) => a.tempo_inicio - b.tempo_inicio)
          );
          setFeedback(`Desenho salvo na tag "${alvoTag.categoria}"!`);
        } else {
          const nova = await criarTagVideo(projeto.id, {
            categoria: "Telestração Tática",
            cor: "#f97316",
            tempoInicio: Math.max(0, t - 3),
            tempoFim: t + 3,
            atletaNome: atletaRapido || null,
            desenhoTempo: t,
            desenhoDados: formas,
          });
          setTags((prev) => [...prev, nova].sort((a, b) => a.tempo_inicio - b.tempo_inicio));
          setFeedback(`Telestração salva em ${formatarTempo(t, true)}!`);
        }
        setModoDesenho(false);
        setTimeout(() => setFeedback(null), 2500);
      } catch (err: any) {
        alert("Erro ao salvar desenho: " + err.message);
      }
    });
  };

  const executarSyncPartida = () => {
    if (!syncPartidaId) return;
    startTransition(async () => {
      try {
        const novas = await importarLancesPartidaParaVideo(
          projeto.id,
          syncPartidaId,
          syncSet1Seg,
          syncSet2Seg
        );
        setTags((prev) => [...prev, ...novas].sort((a, b) => a.tempo_inicio - b.tempo_inicio));
        setMostrarSync(false);
        setFeedback(`${novas.length} lances da Análise ao Vivo sincronizados no vídeo!`);
        setTimeout(() => setFeedback(null), 3500);
      } catch (err: any) {
        alert("Erro ao sincronizar partida: " + err.message);
      }
    });
  };

  const videoCarregado = projeto.tipo_fonte === "youtube" ? !!ytId : !!localUrl;

  return (
    <div className="space-y-4">
      {/* Barra Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/video"
            className="inline-flex items-center gap-1 text-sm font-medium text-suave hover:text-tinta"
          >
            <ArrowLeft className="h-4 w-4" />
            Projetos
          </Link>
          <span className="text-linha">|</span>
          <h1 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
            <Film className="h-5 w-5 text-bola-500" />
            {projeto.titulo}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedback && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {feedback}
            </span>
          )}

          {podeEditar && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const novo = !compartilhado;
                setCompartilhado(novo);
                startTransition(async () => {
                  await alternarCompartilhamentoVideo(projeto.id, novo);
                  setFeedback(novo ? "Vídeo visível para os atletas!" : "Vídeo restrito à comissão técnica.");
                  setTimeout(() => setFeedback(null), 2500);
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                compartilhado
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-linha bg-fundo text-suave hover:text-tinta"
              }`}
              title="Definir se atletas podem visualizar esta análise"
            >
              {compartilhado ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {compartilhado ? "Visível p/ Atletas" : "Só Comissão"}
            </button>
          )}

          {podeEditar && (
            <button
              type="button"
              onClick={() => setMostrarSync(!mostrarSync)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                mostrarSync
                  ? "border-quadra-600 bg-quadra-100 text-quadra-900"
                  : "border-linha bg-fundo text-tinta hover:bg-cinza-100"
              }`}
            >
              <Link2 className="h-3.5 w-3.5 text-quadra-700" />
              Sincronizar Análise ao Vivo
            </button>
          )}

          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarMatriz(!mostrarMatriz)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                mostrarMatriz
                  ? "border-bola-500 bg-bola-50 text-bola-700"
                  : "border-linha bg-fundo text-tinta hover:bg-cinza-100"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Matriz ({tags.length})
            </button>
          )}

          <button
            type="button"
            onClick={exportarXml}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-100"
            title="Exportar XML compatível com Nacsport / LongoMatch / Sportscode"
          >
            <Download className="h-3.5 w-3.5" />
            XML
          </button>

          <button
            type="button"
            onClick={exportarCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-linha bg-fundo px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-cinza-100"
          >
            <Download className="h-3.5 w-3.5" />
            CSV ({tagsFiltradas.length})
          </button>
        </div>
      </div>

      {/* Matriz Interativa de Cortes (Categoria × Atleta) */}
      {mostrarMatriz && (
        <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-titulo text-sm font-bold text-tinta flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4 text-bola-500" />
                Matriz Interativa de Cortes (Categoria × Atleta)
              </h3>
              <p className="text-[11px] text-suave">
                Clique em qualquer número para filtrar e reproduzir imediatamente a playlist daquela seleção.
              </p>
            </div>
            <button type="button" onClick={() => setMostrarMatriz(false)} className="text-suave hover:text-tinta">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-linha">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-linha bg-fundo text-suave uppercase">
                <tr>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2 text-center">Total</th>
                  {atletasUnicos.map((atl) => (
                    <th key={atl} className="px-3 py-2 text-center">
                      {atl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {categoriasUnicas.map((cat) => {
                  const totalCat = tags.filter((t) => t.categoria === cat).length;
                  return (
                    <tr key={cat} className="hover:bg-fundo/50">
                      <td className="px-3 py-2 font-bold text-tinta">{cat}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => tocarCelulaMatriz(cat, null)}
                          className="rounded bg-quadra-900 px-2 py-0.5 font-bold text-white hover:opacity-90"
                        >
                          {totalCat}
                        </button>
                      </td>
                      {atletasUnicos.map((atl) => {
                        const qtd = tags.filter((t) => t.categoria === cat && t.atleta_nome === atl).length;
                        return (
                          <td key={atl} className="px-3 py-2 text-center">
                            {qtd > 0 ? (
                              <button
                                type="button"
                                onClick={() => tocarCelulaMatriz(cat, atl)}
                                className="rounded bg-bola-100 px-2 py-0.5 font-bold text-bola-800 hover:bg-bola-500 hover:text-white transition"
                              >
                                {qtd}
                              </button>
                            ) : (
                              <span className="text-suave">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Painel de Sincronização Análise ao Vivo ↔ Vídeo */}
      {mostrarSync && (
        <div className="rounded-xl border border-quadra-200 bg-quadra-50 p-4 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-titulo text-sm font-bold text-quadra-900 flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-bola-500" />
              Importar Lances da Análise ao Vivo para a Linha do Tempo
            </h3>
            <button type="button" onClick={() => setMostrarSync(false)} className="text-suave hover:text-tinta">
              <X className="h-4 w-4" />
            </button>
          </div>

          {partidasDisponiveis.length === 0 ? (
            <div className="rounded-lg border border-dashed border-quadra-300 bg-white p-4 text-center space-y-2">
              <p className="text-suave">
                Nenhuma partida registrada na <strong>Análise ao Vivo</strong> ainda.
              </p>
              <Link
                href="/analise-jogo"
                className="inline-block rounded-md bg-bola-500 px-3 py-1.5 font-semibold text-white hover:opacity-90"
              >
                Ir para Análise ao Vivo →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4 items-end">
                <label className="sm:col-span-2 block font-semibold text-tinta">
                  Partida Analisada ao Vivo
                  <select
                    value={syncPartidaId}
                    onChange={(e) => setSyncPartidaId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                  >
                    <option value="">Selecione a partida...</option>
                    {partidasDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.rotulo}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <span className="block font-semibold text-tinta">
                    Início 1º Set: <strong className="font-mono text-bola-600">{formatarTempo(syncSet1Seg)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSyncSet1Seg(obterTempoAtual())}
                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 font-semibold hover:bg-fundo"
                  >
                    📍 Marcar 1º Set aqui
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="block font-semibold text-tinta">
                    Início 2º Set:{" "}
                    <strong className="font-mono text-bola-600">
                      {syncSet2Seg !== null ? formatarTempo(syncSet2Seg) : "Opcional"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSyncSet2Seg(obterTempoAtual())}
                    className="w-full rounded-md border border-linha bg-white px-2.5 py-1.5 font-semibold hover:bg-fundo"
                  >
                    📍 Marcar 2º Set aqui
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!syncPartidaId || isPending}
                  onClick={executarSyncPartida}
                  className="rounded-md bg-bola-500 px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Importando..." : "Importar Lances no Vídeo"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Área Principal: Player (Esquerda) + Lista de Tags & Ajuste de Corte (Direita) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Coluna Esquerda: Player + Controles + Tagging */}
        <div className="lg:col-span-7 space-y-4">
          {/* Player de Vídeo */}
          <div className="overflow-hidden rounded-xl border border-linha bg-black shadow-md">
            {projeto.tipo_fonte === "local" && !localUrl ? (
              <div className="flex aspect-video flex-col items-center justify-center p-6 text-center text-white space-y-3 bg-slate-900">
                <Upload className="h-10 w-10 text-bola-400" />
                <div>
                  <p className="font-titulo text-lg font-bold">Carregar Arquivo de Vídeo Local</p>
                  <p className="text-xs text-slate-300 mt-1 max-w-md">
                    Selecione o vídeo no seu computador/tablet
                    {projeto.nome_arquivo ? ` (${projeto.nome_arquivo})` : ""}. O vídeo roda direto no navegador sem consumir upload.
                  </p>
                </div>
                <label className="cursor-pointer rounded-lg bg-bola-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90">
                  Escolher Arquivo de Vídeo (MP4 / MOV / WEBM)
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (localUrl) URL.revokeObjectURL(localUrl);
                        setLocalUrl(URL.createObjectURL(f));
                      }
                    }}
                  />
                </label>
              </div>
            ) : projeto.tipo_fonte === "local" && localUrl ? (
              <div className="relative aspect-video w-full bg-black">
                <video
                  ref={videoRef}
                  src={localUrl}
                  controls={false}
                  onTimeUpdate={() => {
                    if (videoRef.current) setTempoAtual(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuracao(videoRef.current.duration);
                  }}
                  onPlay={() => setTocando(true)}
                  onPause={() => setTocando(false)}
                  onClick={alternarPlayPause}
                  className="h-full w-full cursor-pointer bg-black"
                />
                {modoDesenho && (
                  <CanvasTelestracao
                    formas={[]}
                    editavel={true}
                    onSalvar={salvarDesenho}
                    onCancelar={() => setModoDesenho(false)}
                  />
                )}
                {!modoDesenho && desenhoEmExibicao && (
                  <CanvasTelestracao
                    formas={desenhoEmExibicao}
                    editavel={false}
                    onContinuarVideo={() => {
                      setDesenhoEmExibicao(null);
                      alternarPlayPause();
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="relative aspect-video w-full bg-black">
                <div ref={ytContainerRef} className="h-full w-full" />
                {modoDesenho && (
                  <CanvasTelestracao
                    formas={[]}
                    editavel={true}
                    onSalvar={salvarDesenho}
                    onCancelar={() => setModoDesenho(false)}
                  />
                )}
                {!modoDesenho && desenhoEmExibicao && (
                  <CanvasTelestracao
                    formas={desenhoEmExibicao}
                    editavel={false}
                    onContinuarVideo={() => {
                      setDesenhoEmExibicao(null);
                      alternarPlayPause();
                    }}
                  />
                )}
              </div>
            )}

            {/* Barra de Progresso + Marcadores Visuais de Tags (Timeline) */}
            {videoCarregado && (
              <div className="bg-slate-900 px-4 py-3 text-white space-y-2.5">
                {/* Timeline clicável com marcadores coloridos */}
                <div
                  className="relative h-4 w-full cursor-pointer rounded-full bg-slate-700 overflow-hidden"
                  onClick={(e) => {
                    if (!duracao) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    irParaTempo(pct * duracao, false);
                  }}
                >
                  {/* Marcadores das Tags */}
                  {duracao > 0 &&
                    tags.map((t) => {
                      const left = (t.tempo_inicio / duracao) * 100;
                      const width = Math.max(0.8, ((t.tempo_fim - t.tempo_inicio) / duracao) * 100);
                      return (
                        <div
                          key={t.id}
                          title={`${t.categoria} (${formatarTempo(t.tempo_inicio)} → ${formatarTempo(t.tempo_fim)})`}
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: t.cor }}
                          className="absolute top-0 bottom-0 opacity-75 hover:opacity-100"
                        />
                      );
                    })}

                  {/* Agulha de tempo atual */}
                  {duracao > 0 && (
                    <div
                      style={{ left: `${(tempoAtual / duracao) * 100}%` }}
                      className="absolute top-0 bottom-0 w-1 bg-white shadow"
                    />
                  )}
                </div>

                {/* Controles de Reprodução Profissional */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={alternarPlayPause}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-bola-500 text-white hover:opacity-90"
                      title="Play / Pause (Espaço)"
                    >
                      {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => avancarSegundos(-5)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="-5 segundos (Seta Esq)"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => avancarSegundos(-1)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="-1 segundo"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      onClick={() => avancarSegundos(-0.04)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="Voltar 1 frame (Shift+Seta Esq)"
                    >
                      -1f
                    </button>
                    <button
                      type="button"
                      onClick={() => avancarSegundos(0.04)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="Avançar 1 frame (Shift+Seta Dir)"
                    >
                      +1f
                    </button>
                    <button
                      type="button"
                      onClick={() => avancarSegundos(1)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="+1 segundo"
                    >
                      +1s
                    </button>
                    <button
                      type="button"
                      onClick={() => avancarSegundos(5)}
                      className="rounded bg-slate-800 px-2 py-1.5 hover:bg-slate-700"
                      title="+5 segundos (Seta Dir)"
                    >
                      +5s
                    </button>

                    {podeEditar && (
                      <button
                        type="button"
                        onClick={abrirDesenho}
                        className="ml-1 inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1.5 font-semibold text-white hover:bg-amber-600"
                        title="Pausar e desenhar setas/anotações táticas sobre o vídeo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Desenhar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-200">
                      {formatarTempo(tempoAtual, true)} / {formatarTempo(duracao)}
                    </span>

                    <div className="flex items-center gap-1 rounded bg-slate-800 p-0.5">
                      {[0.25, 0.5, 1, 1.5, 2].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => alterarVelocidade(v)}
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            velocidade === v ? "bg-bola-500 text-white" : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {v}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Indicador de Recorte Ativo + Trocar arquivo local */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={pararNoFim}
                      onChange={(e) => setPararNoFim(e.target.checked)}
                      className="rounded border-slate-600 text-bola-500"
                    />
                    Pausar automaticamente ao terminar o recorte da tag
                  </label>

                  {recorteAtivo && (
                    <div className="flex items-center gap-2 text-bola-300 font-semibold">
                      <span>
                        Reproduzindo: {recorteAtivo.categoria} ({formatarTempo(recorteAtivo.tempo_inicio)} →{" "}
                        {formatarTempo(recorteAtivo.tempo_fim)})
                      </span>
                      <button
                        type="button"
                        onClick={() => reproduzirRecorte(recorteAtivo)}
                        className="rounded bg-slate-800 px-2 py-0.5 text-white hover:bg-slate-700"
                      >
                        ↻ Repetir
                      </button>
                    </div>
                  )}

                  {projeto.tipo_fonte === "local" && (
                    <label className="cursor-pointer text-slate-400 hover:text-white underline">
                      Trocar vídeo local
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            if (localUrl) URL.revokeObjectURL(localUrl);
                            setLocalUrl(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Painel de Botões de Tagging */}
          {podeEditar && (
            <div className="rounded-xl border border-linha bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-titulo text-base font-bold text-tinta">
                    Botões de Marcação (Tagging)
                  </h2>
                  <p className="text-[11px] text-suave">
                    Clique ou pressione as teclas <strong>1–9</strong> para marcar o lance com pré/pós-roll automático.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Atleta opcional (ex: #10 Bruno)"
                    value={atletaRapido}
                    onChange={(e) => setAtletaRapido(e.target.value)}
                    className="w-40 rounded-md border border-linha bg-fundo px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setEditandoBotoes(!editandoBotoes)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                      editandoBotoes
                        ? "border-quadra-900 bg-quadra-900 text-white"
                        : "border-linha bg-white text-tinta hover:bg-fundo"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {editandoBotoes ? "Concluir Edição" : "Editar Botões"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarNovoBotao(!mostrarNovoBotao)}
                    className="inline-flex items-center gap-1 rounded-md border border-linha bg-white px-2.5 py-1.5 text-xs font-semibold text-tinta hover:bg-fundo"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Botão
                  </button>
                </div>
              </div>

              {mostrarNovoBotao && (
                <div className="grid gap-2 rounded-lg border border-linha bg-fundo p-3 sm:grid-cols-5 items-end text-xs">
                  <label className="sm:col-span-2 block font-semibold">
                    Nome do Botão
                    <input
                      value={novoBotaoRotulo}
                      onChange={(e) => setNovoBotaoRotulo(e.target.value)}
                      placeholder="Ex.: Transição Ofensiva"
                      className="mt-1 w-full rounded border border-linha bg-white px-2 py-1.5"
                    />
                  </label>
                  <label className="block font-semibold">
                    Pré-roll (s)
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={novoBotaoPre}
                      onChange={(e) => setNovoBotaoPre(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-linha bg-white px-2 py-1.5"
                    />
                  </label>
                  <label className="block font-semibold">
                    Pós-roll (s)
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={novoBotaoPost}
                      onChange={(e) => setNovoBotaoPost(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-linha bg-white px-2 py-1.5"
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={novoBotaoCor}
                      onChange={(e) => setNovoBotaoCor(e.target.value)}
                      className="h-8 w-10 rounded border border-linha cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={adicionarBotaoCustom}
                      className="flex-1 rounded bg-quadra-900 px-2 py-1.5 font-semibold text-white"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              )}

              {editandoBotoes ? (
                <div className="space-y-2 rounded-lg border border-quadra-200 bg-fundo p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <span className="text-xs font-bold text-quadra-900">
                      Personalizar Botões (Nome, Cor, Pré/Pós-roll, Atalho e Remover)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBotoes(BOTOES_TAGGING_PADRAO);
                          startTransition(async () => {
                            await salvarBotoesProjeto(projeto.id, BOTOES_TAGGING_PADRAO);
                            setFeedback("Botões restaurados para o padrão!");
                            setTimeout(() => setFeedback(null), 2500);
                          });
                        }}
                        className="rounded border border-linha bg-white px-2.5 py-1 text-[11px] font-semibold text-suave hover:text-tinta"
                      >
                        Restaurar Padrão
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await salvarBotoesProjeto(projeto.id, botoes);
                            setEditandoBotoes(false);
                            setFeedback("Botões salvos!");
                            setTimeout(() => setFeedback(null), 2500);
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" /> Salvar Botões
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {botoes.map((btn, idx) => (
                      <div
                        key={btn.id}
                        className="grid grid-cols-12 gap-2 items-center rounded border border-linha bg-white p-2 text-xs"
                      >
                        <input
                          type="color"
                          value={btn.cor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBotoes((prev) => prev.map((b, i) => (i === idx ? { ...b, cor: val } : b)));
                          }}
                          className="col-span-1 h-7 w-full rounded border border-linha cursor-pointer"
                          title="Cor"
                        />
                        <input
                          type="text"
                          value={btn.rotulo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBotoes((prev) => prev.map((b, i) => (i === idx ? { ...b, rotulo: val } : b)));
                          }}
                          className="col-span-4 rounded border border-linha px-2 py-1 font-semibold"
                          placeholder="Nome"
                        />
                        <label className="col-span-2 flex items-center gap-1">
                          <span className="text-[10px] text-suave">Pré</span>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={btn.preRoll}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setBotoes((prev) => prev.map((b, i) => (i === idx ? { ...b, preRoll: val } : b)));
                            }}
                            className="w-full rounded border border-linha px-1.5 py-1 text-center"
                          />
                        </label>
                        <label className="col-span-2 flex items-center gap-1">
                          <span className="text-[10px] text-suave">Pós</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={btn.postRoll}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setBotoes((prev) => prev.map((b, i) => (i === idx ? { ...b, postRoll: val } : b)));
                            }}
                            className="w-full rounded border border-linha px-1.5 py-1 text-center"
                          />
                        </label>
                        <label className="col-span-2 flex items-center gap-1">
                          <span className="text-[10px] text-suave">Tecla</span>
                          <input
                            type="text"
                            maxLength={1}
                            value={btn.atalho}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBotoes((prev) => prev.map((b, i) => (i === idx ? { ...b, atalho: val } : b)));
                            }}
                            className="w-full rounded border border-linha px-1.5 py-1 text-center font-mono"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setBotoes((prev) => prev.filter((_, i) => i !== idx))}
                          className="col-span-1 flex justify-center rounded p-1 text-rose-600 hover:bg-rose-50"
                          title="Remover botão"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {botoes.map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      disabled={!videoCarregado || isPending}
                      onClick={() => dispararTag(btn)}
                      style={{ borderLeftColor: btn.cor, borderLeftWidth: "5px" }}
                      className="flex items-center justify-between rounded-lg border border-linha bg-fundo px-3 py-2.5 text-left transition hover:bg-white hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-tinta truncate">{btn.rotulo}</p>
                        <p className="text-[10px] text-suave">
                          -{btn.preRoll}s / +{btn.postRoll}s
                        </p>
                      </div>
                      {btn.atalho && (
                        <span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-white border border-linha text-[10px] font-bold text-suave">
                          {btn.atalho}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coluna Direita: Playlists + Lista de Cortes (Tags) + Ajuste Fino */}
        <div className="lg:col-span-5 rounded-xl border border-linha bg-white p-4 shadow-sm flex flex-col max-h-[820px]">
          {/* Seletor de Playlists Personalizadas */}
          <div className="mb-3 rounded-lg border border-linha bg-fundo p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                <ListVideo className="h-4 w-4 text-bola-500 flex-shrink-0" />
                <select
                  value={playlistSelecionadaId}
                  onChange={(e) => {
                    setPlaylistSelecionadaId(e.target.value);
                    setPlaylistAtiva(false);
                  }}
                  className="w-full rounded border border-linha bg-white px-2 py-1 text-xs font-bold text-tinta"
                >
                  <option value="">Todos os Cortes ({tags.length})</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      Playlist: {pl.nome} ({pl.tag_ids.length})
                    </option>
                  ))}
                </select>
              </div>

              {podeEditar && (
                <button
                  type="button"
                  onClick={() => setMostrarNovaPlaylist(!mostrarNovaPlaylist)}
                  className="inline-flex items-center gap-1 rounded border border-linha bg-white px-2 py-1 text-[11px] font-semibold text-tinta hover:bg-cinza-50"
                >
                  <Plus className="h-3 w-3" /> Nova Playlist
                </button>
              )}

              {podeEditar && playlistAtivaObj && (
                <>
                  {playlistAtivaObj.tag_ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlaylistParaApresentacao(playlistAtivaObj);
                        setApresentacaoDestinoId(apresentacoesLocais[0]?.id ?? "__nova__");
                        setNovaApTitulo(playlistAtivaObj.nome);
                        setIncluirCapaPlaylist(true);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-quadra-300 bg-quadra-50 px-2 py-1 text-[11px] font-semibold text-quadra-800 hover:bg-quadra-100"
                      title="Enviar todos os cortes desta playlist para uma Apresentação"
                    >
                      <Presentation className="h-3 w-3" /> p/ Apresentação
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir playlist "${playlistAtivaObj.nome}"?`)) {
                        startTransition(async () => {
                          await excluirPlaylistVideo(projeto.id, playlistAtivaObj.id);
                          setPlaylists((prev) => prev.filter((p) => p.id !== playlistAtivaObj.id));
                          setPlaylistSelecionadaId("");
                        });
                      }
                    }}
                    className="rounded p-1 text-rose-600 hover:bg-rose-50"
                    title="Excluir playlist selecionada"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {mostrarNovaPlaylist && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={novaPlaylistNome}
                  onChange={(e) => setNovaPlaylistNome(e.target.value)}
                  placeholder="Nome da playlist (ex: Melhores Gols)"
                  className="flex-1 rounded border border-linha bg-white px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={!novaPlaylistNome.trim() || isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const nova = await criarPlaylistVideo(projeto.id, novaPlaylistNome);
                        setPlaylists((prev) => [nova, ...prev]);
                        setPlaylistSelecionadaId(nova.id);
                        setNovaPlaylistNome("");
                        setMostrarNovaPlaylist(false);
                        setFeedback(`Playlist "${nova.nome}" criada! Agora clique em "+ Playlist" nos cortes para incluir.`);
                        setTimeout(() => setFeedback(null), 3500);
                      } catch (err: any) {
                        alert("Erro: " + err.message);
                      }
                    });
                  }}
                  className="rounded bg-quadra-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            )}

            {/* Barra de ações da Playlist (Tocar e Baixar Mix) */}
            {tagsFiltradas.length > 0 && videoCarregado && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {playlistAtiva ? (
                  <button
                    type="button"
                    onClick={pararPlaylist}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <Pause className="h-3 w-3" />
                    Parar ({playlistIndex + 1}/{tagsFiltradas.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={iniciarPlaylist}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    title="Reproduzir todos os recortes exibidos em sequência"
                  >
                    <ListVideo className="h-3.5 w-3.5" />
                    Tocar Playlist ({tagsFiltradas.length})
                  </button>
                )}

                {projeto.tipo_fonte === "local" && localUrl && (
                  <button
                    type="button"
                    disabled={exportandoMix}
                    onClick={async () => {
                      setExportandoMix(true);
                      setProgressoMix({ pct: 0, atual: 1, total: tagsFiltradas.length });
                      try {
                        const nomeMix = (playlistAtivaObj ? `mix_${playlistAtivaObj.nome}` : `mix_${projeto.titulo}`)
                          .replace(/[^a-zA-Z0-9_-]/g, "_");
                        await baixarMixPlaylist({
                          videoUrl: localUrl,
                          clipes: tagsFiltradas.map((t) => ({
                            tempoInicio: t.tempo_inicio,
                            tempoFim: t.tempo_fim,
                          })),
                          nomeArquivo: nomeMix,
                          onProgresso: (pct, atual, total) => setProgressoMix({ pct, atual, total }),
                        });
                        setFeedback("Mix da playlist baixado com sucesso!");
                        setTimeout(() => setFeedback(null), 3000);
                      } catch (err: any) {
                        alert("Erro ao gerar mix: " + err.message);
                      } finally {
                        setExportandoMix(false);
                        setProgressoMix(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-quadra-300 bg-white px-2.5 py-1 text-xs font-semibold text-quadra-900 hover:bg-quadra-50 disabled:opacity-50"
                    title="Baixar um único vídeo juntando todos os cortes desta lista/playlist"
                  >
                    <Download className="h-3.5 w-3.5 text-bola-500" />
                    {exportandoMix && progressoMix
                      ? `Gerando Mix ${progressoMix.pct}% (${progressoMix.atual}/${progressoMix.total})`
                      : "Baixar Mix da Playlist"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linha pb-3">
            <h2 className="font-titulo text-base font-bold text-tinta flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-bola-500" />
              {playlistAtivaObj ? playlistAtivaObj.nome : "Cortes / Lances"} ({tagsFiltradas.length})
            </h2>

            <div className="flex items-center gap-2">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="rounded-md border border-linha bg-fundo px-2 py-1 text-xs font-medium text-tinta"
              >
                <option value="todas">Todas categorias</option>
                {categoriasUnicas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {atletasUnicos.length > 0 && (
                <select
                  value={filtroAtleta}
                  onChange={(e) => setFiltroAtleta(e.target.value)}
                  className="rounded-md border border-linha bg-fundo px-2 py-1 text-xs font-medium text-tinta"
                >
                  <option value="todos">Todos atletas</option>
                  {atletasUnicos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-linha mt-2 pr-1">
            {tagsFiltradas.length === 0 ? (
              <div className="py-12 text-center text-xs text-suave">
                Nenhum corte registrado ainda. Dê play no vídeo e clique em um botão de marcação (ou tecla 1–9).
              </div>
            ) : (
              tagsFiltradas.map((t, idx) => {
                const estaEditando = tagEditandoId === t.id;
                const estaTocando = recorteAtivo?.id === t.id;
                const duracaoTag = (t.tempo_fim - t.tempo_inicio).toFixed(1);

                return (
                  <div
                    key={t.id}
                    className={`py-3 px-2 rounded-lg transition ${
                      estaTocando ? "bg-bola-50/70" : "hover:bg-fundo/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => reproduzirRecorte(t)}
                        className="flex-1 text-left group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: t.cor }}
                          />
                          <span className="text-xs font-bold text-tinta group-hover:text-bola-600">
                            #{idx + 1} · {t.categoria}
                          </span>
                          <span className="rounded bg-cinza-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-tinta">
                            {formatarTempo(t.tempo_inicio, true)} → {formatarTempo(t.tempo_fim, true)} ({duracaoTag}s)
                          </span>
                          {t.desenho_dados && t.desenho_dados.length > 0 && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Desenho
                            </span>
                          )}
                        </div>
                        {(t.atleta_nome || t.observacao) && (
                          <p className="text-[11px] text-suave mt-1 pl-4">
                            {t.atleta_nome && <strong className="text-tinta">{t.atleta_nome}</strong>}
                            {t.atleta_nome && t.observacao ? " · " : ""}
                            {t.observacao}
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => reproduzirRecorte(t)}
                          className="rounded p-1.5 text-bola-600 hover:bg-bola-100"
                          title="Assistir recorte"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>

                        {projeto.tipo_fonte === "local" && localUrl && (
                          <button
                            type="button"
                            disabled={exportandoTagId !== null}
                            onClick={async () => {
                              setExportandoTagId(t.id);
                              setProgressoClipe(0);
                              try {
                                const nomeBase = `${t.categoria}_${formatarTempo(t.tempo_inicio).replace(":", "-")}`
                                  .replace(/[^a-zA-Z0-9_-]/g, "_");
                                await baixarClipeRecortado({
                                  videoUrl: localUrl,
                                  tempoInicio: t.tempo_inicio,
                                  tempoFim: t.tempo_fim,
                                  nomeArquivo: nomeBase,
                                  onProgresso: (pct) => setProgressoClipe(pct),
                                });
                                setFeedback(`Clipe "${t.categoria}" baixado!`);
                                setTimeout(() => setFeedback(null), 2500);
                              } catch (err: any) {
                                alert("Erro ao baixar clipe: " + err.message);
                              } finally {
                                setExportandoTagId(null);
                                setProgressoClipe(0);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            title="Baixar clipe recortado em vídeo"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {exportandoTagId === t.id && (
                              <span className="text-[10px] font-bold">{progressoClipe}%</span>
                            )}
                          </button>
                        )}

                        {podeEditar && (
                          <>
                            {playlists.length > 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  const plId = e.target.value;
                                  if (!plId) return;
                                  const pl = playlists.find((p) => p.id === plId);
                                  if (!pl) return;
                                  const jaTem = pl.tag_ids.includes(t.id);
                                  const novosIds = jaTem
                                    ? pl.tag_ids.filter((id) => id !== t.id)
                                    : [...pl.tag_ids, t.id];
                                  startTransition(async () => {
                                    const atualizada = await atualizarPlaylistVideo(projeto.id, pl.id, novosIds);
                                    setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? atualizada : p)));
                                    setFeedback(
                                      jaTem
                                        ? `Removido da playlist "${pl.nome}"`
                                        : `Adicionado à playlist "${pl.nome}"!`
                                    );
                                    setTimeout(() => setFeedback(null), 2000);
                                  });
                                }}
                                className="rounded border border-linha bg-white px-1.5 py-1 text-[10px] font-semibold text-quadra-800 max-w-[92px]"
                                title="Adicionar ou remover este corte de uma playlist"
                              >
                                <option value="">+ Playlist</option>
                                {playlists.map((pl) => {
                                  const tem = pl.tag_ids.includes(t.id);
                                  return (
                                    <option key={pl.id} value={pl.id}>
                                      {tem ? `✓ ${pl.nome}` : `+ ${pl.nome}`}
                                    </option>
                                  );
                                })}
                              </select>
                            )}

                            {podeEditar && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTagParaApresentacao(t);
                                  setApresentacaoDestinoId(
                                    apresentacoesLocais[0]?.id ?? "__nova__"
                                  );
                                  setNovaApTitulo("");
                                  setApSlideTitulo(
                                    `${t.categoria}${t.atleta_nome ? ` — ${t.atleta_nome}` : ""}`
                                  );
                                  setApSlideConteudo(t.observacao ?? "");
                                }}
                                className="rounded p-1.5 text-quadra-600 hover:bg-quadra-50"
                                title="Adicionar corte a uma Apresentação"
                              >
                                <Presentation className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {equipesScout.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTagParaScout(t);
                                  setScoutAtletaId("");
                                }}
                                className="rounded p-1.5 text-bola-600 hover:bg-bola-100"
                                title="Enviar arremesso deste corte para o Scout"
                              >
                                <Crosshair className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => (estaEditando ? setTagEditandoId(null) : abrirEdicaoTag(t))}
                              className={`rounded p-1.5 text-xs font-semibold ${
                                estaEditando
                                  ? "bg-quadra-900 text-white"
                                  : "text-quadra-700 hover:bg-quadra-100"
                              }`}
                              title="Ajeitar / Ajustar tamanho do recorte"
                            >
                              <Scissors className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExcluirTag(t.id)}
                              className="rounded p-1.5 text-suave hover:bg-rose-50 hover:text-rose-600"
                              title="Excluir corte"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Painel Inline de Ajuste Fino do Recorte (Aumentar / Diminuir) */}
                    {estaEditando && (
                      <div className="mt-3 rounded-lg border border-quadra-200 bg-fundo p-3 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-quadra-900 flex items-center gap-1">
                            <Scissors className="h-3.5 w-3.5" />
                            Ajustar Recorte ({(Math.max(0.5, editFim - editInicio)).toFixed(1)}s)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRecorteAtivo({ ...t, tempo_inicio: editInicio, tempo_fim: editFim });
                              irParaTempo(editInicio, true);
                            }}
                            className="inline-flex items-center gap-1 rounded bg-bola-500 px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                          >
                            <Play className="h-3 w-3" /> Testar corte
                          </button>
                        </div>

                        {/* Controle de INÍCIO */}
                        <div className="rounded bg-white p-2 border border-linha space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-tinta">
                              Início: <span className="font-mono text-bola-600">{formatarTempo(editInicio, true)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = obterTempoAtual();
                                setEditInicio(Math.min(cur, editFim - 0.5));
                              }}
                              className="inline-flex items-center gap-1 rounded bg-quadra-100 px-2 py-0.5 text-[10px] font-bold text-quadra-900 hover:bg-quadra-200"
                              title="Definir o início exatamente no segundo atual do vídeo"
                            >
                              <MapPin className="h-3 w-3" /> Início aqui ({formatarTempo(tempoAtual, true)})
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {[-5, -2, -0.5, 0.5, 2, 5].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setEditInicio((v) => Math.max(0, Math.min(editFim - 0.5, v + d)))}
                                className="flex-1 rounded border border-linha bg-fundo py-1 text-[11px] font-semibold hover:bg-cinza-100"
                              >
                                {d > 0 ? `+${d}s` : `${d}s`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Controle de FIM */}
                        <div className="rounded bg-white p-2 border border-linha space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-tinta">
                              Fim: <span className="font-mono text-bola-600">{formatarTempo(editFim, true)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = obterTempoAtual();
                                setEditFim(Math.max(editInicio + 0.5, cur));
                              }}
                              className="inline-flex items-center gap-1 rounded bg-quadra-100 px-2 py-0.5 text-[10px] font-bold text-quadra-900 hover:bg-quadra-200"
                              title="Definir o fim exatamente no segundo atual do vídeo"
                            >
                              <MapPin className="h-3 w-3" /> Fim aqui ({formatarTempo(tempoAtual, true)})
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {[-5, -2, -0.5, 0.5, 2, 5].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setEditFim((v) => Math.max(editInicio + 0.5, v + d))}
                                className="flex-1 rounded border border-linha bg-fundo py-1 text-[11px] font-semibold hover:bg-cinza-100"
                              >
                                {d > 0 ? `+${d}s` : `${d}s`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Categoria, Atleta e Observação */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={editCategoria}
                            onChange={(e) => setEditCategoria(e.target.value)}
                            placeholder="Categoria"
                            className="rounded border border-linha bg-white px-2 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={editAtleta}
                            onChange={(e) => setEditAtleta(e.target.value)}
                            placeholder="Atleta"
                            className="rounded border border-linha bg-white px-2 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={editObs}
                            onChange={(e) => setEditObs(e.target.value)}
                            placeholder="Observação tática..."
                            className="sm:col-span-2 rounded border border-linha bg-white px-2 py-1.5 text-xs"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setTagEditandoId(null)}
                            className="inline-flex items-center gap-1 rounded border border-linha bg-white px-3 py-1.5 font-semibold text-suave hover:text-tinta"
                          >
                            <X className="h-3.5 w-3.5" /> Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => salvarEdicaoTag(t.id)}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Salvar Recorte
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Enviar Lance do Vídeo para o Scout */}
      {tagParaScout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-linha bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-linha pb-3">
              <div>
                <h3 className="font-titulo text-lg font-bold text-tinta flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-bola-500" />
                  Enviar Lance para o Scout
                </h3>
                <p className="text-xs text-suave">
                  Tag: {tagParaScout.categoria} ({formatarTempo(tagParaScout.tempo_inicio)} →{" "}
                  {formatarTempo(tagParaScout.tempo_fim)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTagParaScout(null)}
                className="rounded-full p-1 text-suave hover:bg-fundo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <label className="block font-semibold text-tinta">
                Equipe no Scout
                <select
                  value={scoutEquipeId}
                  onChange={(e) => {
                    setScoutEquipeId(e.target.value);
                    setScoutAtletaId("");
                  }}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                >
                  {equipesScout.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block font-semibold text-tinta">
                Atleta no Scout
                <select
                  value={scoutAtletaId}
                  onChange={(e) => setScoutAtletaId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                >
                  <option value="">
                    {tagParaScout.atleta_nome
                      ? `Usar "${tagParaScout.atleta_nome}" (auto)`
                      : "Não identificado"}
                  </option>
                  {(equipesScout.find((eq) => eq.id === scoutEquipeId)?.atletas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.numero ? `#${a.numero} ` : ""}
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block font-semibold text-tinta">
                Tipo de Arremesso
                <select
                  value={scoutTipo}
                  onChange={(e) => setScoutTipo(e.target.value as TipoArremessoJogo)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                >
                  {TIPOS_ARREMESSO_JOGO.map((tp) => (
                    <option key={tp} value={tp}>
                      {ROTULO_TIPO_JOGO[tp].rotulo}
                    </option>
                  ))}
                </select>
              </label>

              {scoutTipo !== "6m" && (
                <label className="block font-semibold text-tinta">
                  Setor de Origem
                  <select
                    value={scoutSetor}
                    onChange={(e) => setScoutSetor(e.target.value as SetorOrigemJogo)}
                    className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                  >
                    {SETORES_ORIGEM_JOGO.map((st) => (
                      <option key={st} value={st}>
                        {ROTULO_SETOR_JOGO[st]}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="sm:col-span-2 block font-semibold text-tinta">
                Desfecho
                <select
                  value={scoutDesfecho}
                  onChange={(e) => setScoutDesfecho(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2"
                >
                  <option value="gol">Gol (Convertido)</option>
                  <option value="defesa">Defesa do Goleiro (Perdido)</option>
                  <option value="trave">Trave (Perdido)</option>
                  <option value="fora">Para Fora (Perdido)</option>
                </select>
              </label>
            </div>

            <BalizaInterativa
              modo="selecao"
              selecionado={scoutQuadrante}
              aoSelecionar={(q) => setScoutQuadrante(q)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-linha">
              <button
                type="button"
                onClick={() => setTagParaScout(null)}
                className="rounded-md border border-linha bg-white px-4 py-2 text-xs font-semibold text-suave"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !scoutEquipeId}
                onClick={() => {
                  const tagAtual = tagParaScout;
                  startTransition(async () => {
                    try {
                      await enviarTagParaScout(projeto.id, {
                        equipeAdversariaId: scoutEquipeId,
                        atletaAdversarioId: scoutAtletaId || null,
                        atletaNomeFallback: tagAtual.atleta_nome,
                        tipoFinalizacao: scoutTipo,
                        zonaCampo: scoutTipo === "6m" ? null : scoutSetor,
                        quadranteBaliza: scoutQuadrante,
                        resultado: scoutDesfecho === "gol" ? "convertido" : "perdido",
                        desfechoDetalhe: scoutDesfecho,
                        observacao: `${projeto.titulo} (${formatarTempo(tagAtual.tempo_inicio)})`,
                      });
                      setTagParaScout(null);
                      setFeedback("Arremesso enviado para o Scout com sucesso!");
                      setTimeout(() => setFeedback(null), 3000);
                    } catch (err: any) {
                      alert("Erro ao enviar para o Scout: " + err.message);
                    }
                  });
                }}
                className="rounded-md bg-bola-500 px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Enviando..." : "Salvar no Scout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Corte a uma Apresentação */}
      {tagParaApresentacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-linha bg-superficie p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-linha pb-2">
              <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                <Presentation className="h-4 w-4 text-quadra-600" />
                Adicionar Corte à Apresentação
              </h3>
              <button
                type="button"
                onClick={() => setTagParaApresentacao(null)}
                className="text-suave hover:text-tinta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-md bg-fundo p-2.5 text-xs text-suave">
              Corte: <strong className="text-tinta">{tagParaApresentacao.categoria}</strong>{" "}
              ({formatarTempo(tagParaApresentacao.tempo_inicio)} →{" "}
              {formatarTempo(tagParaApresentacao.tempo_fim)})
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-suave">Apresentação de Destino</span>
                <select
                  value={apresentacaoDestinoId}
                  onChange={(e) => setApresentacaoDestinoId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                >
                  {apresentacoesLocais.map((ap) => (
                    <option key={ap.id} value={ap.id}>
                      {ap.titulo}
                    </option>
                  ))}
                  <option value="__nova__">+ Criar nova apresentação...</option>
                </select>
              </label>

              {apresentacaoDestinoId === "__nova__" && (
                <label className="block">
                  <span className="font-semibold text-suave">Título da Nova Apresentação *</span>
                  <input
                    type="text"
                    value={novaApTitulo}
                    onChange={(e) => setNovaApTitulo(e.target.value)}
                    placeholder="Ex: Análise Vídeo — Próximo Adversário"
                    className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                  />
                </label>
              )}

              <label className="block">
                <span className="font-semibold text-suave">Título do Slide</span>
                <input
                  type="text"
                  value={apSlideTitulo}
                  onChange={(e) => setApSlideTitulo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-suave">Anotações Táticas no Slide (opcional)</span>
                <textarea
                  rows={3}
                  value={apSlideConteudo}
                  onChange={(e) => setApSlideConteudo(e.target.value)}
                  placeholder="Pontos-chave para destacar aos atletas..."
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-linha">
              <button
                type="button"
                onClick={() => setTagParaApresentacao(null)}
                className="rounded-md border border-linha bg-white px-4 py-2 text-xs font-semibold text-suave"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  (apresentacaoDestinoId === "__nova__" && !novaApTitulo.trim())
                }
                onClick={() => {
                  const tagAtual = tagParaApresentacao;
                  const criandoNova = apresentacaoDestinoId === "__nova__";
                  startTransition(async () => {
                    try {
                      const res = await adicionarCorteEmApresentacao({
                        apresentacaoId: criandoNova ? null : apresentacaoDestinoId,
                        novaApresentacaoTitulo: criandoNova ? novaApTitulo.trim() : null,
                        projetoVideoId: projeto.id,
                        tagVideoId: tagAtual.id,
                        tituloSlide: apSlideTitulo.trim() || tagAtual.categoria,
                        conteudo: apSlideConteudo.trim() || null,
                        tempoInicio: tagAtual.tempo_inicio,
                        tempoFim: tagAtual.tempo_fim,
                      });
                      if (criandoNova && res.apresentacaoId) {
                        const novaId = res.apresentacaoId;
                        setApresentacoesLocais((prev) => [
                          { id: novaId, titulo: novaApTitulo.trim() },
                          ...prev,
                        ]);
                      }
                      setTagParaApresentacao(null);
                      setFeedback("Corte adicionado à apresentação com sucesso!");
                      setTimeout(() => setFeedback(null), 3500);
                    } catch (err: any) {
                      alert("Erro ao adicionar corte à apresentação: " + err.message);
                    }
                  });
                }}
                className="rounded-md bg-quadra-500 px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Adicionando..." : "Adicionar Slide"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Playlist Inteira para uma Apresentação */}
      {playlistParaApresentacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-linha bg-superficie p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-linha pb-2">
              <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                <Presentation className="h-4 w-4 text-quadra-600" />
                Enviar Playlist à Apresentação
              </h3>
              <button
                type="button"
                onClick={() => setPlaylistParaApresentacao(null)}
                className="text-suave hover:text-tinta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-md bg-fundo p-2.5 text-xs text-suave">
              Playlist: <strong className="text-tinta">{playlistParaApresentacao.nome}</strong> ·{" "}
              {playlistParaApresentacao.tag_ids.length} corte(s) serão adicionados como slides
              sequenciais.
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-suave">Apresentação de Destino</span>
                <select
                  value={apresentacaoDestinoId}
                  onChange={(e) => setApresentacaoDestinoId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                >
                  {apresentacoesLocais.map((ap) => (
                    <option key={ap.id} value={ap.id}>
                      {ap.titulo}
                    </option>
                  ))}
                  <option value="__nova__">+ Criar nova apresentação...</option>
                </select>
              </label>

              {apresentacaoDestinoId === "__nova__" ? (
                <label className="block">
                  <span className="font-semibold text-suave">Título da Nova Apresentação *</span>
                  <input
                    type="text"
                    value={novaApTitulo}
                    onChange={(e) => setNovaApTitulo(e.target.value)}
                    placeholder="Ex: Melhores Momentos — Análise"
                    className="mt-1 w-full rounded-md border border-linha bg-white px-2.5 py-2 text-sm text-tinta"
                  />
                </label>
              ) : (
                <label className="flex items-center gap-2 text-xs text-tinta cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirCapaPlaylist}
                    onChange={(e) => setIncluirCapaPlaylist(e.target.checked)}
                  />
                  Criar um slide de capa antes dos cortes da playlist
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-linha">
              <button
                type="button"
                onClick={() => setPlaylistParaApresentacao(null)}
                className="rounded-md border border-linha bg-white px-4 py-2 text-xs font-semibold text-suave"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  (apresentacaoDestinoId === "__nova__" && !novaApTitulo.trim())
                }
                onClick={() => {
                  const plAtual = playlistParaApresentacao;
                  const criandoNova = apresentacaoDestinoId === "__nova__";
                  startTransition(async () => {
                    try {
                      const res = await adicionarPlaylistEmApresentacao({
                        apresentacaoId: criandoNova ? null : apresentacaoDestinoId,
                        novaApresentacaoTitulo: criandoNova ? novaApTitulo.trim() : null,
                        projetoVideoId: projeto.id,
                        playlistId: plAtual.id,
                        incluirCapaPlaylist,
                      });
                      if (criandoNova && res.apresentacaoId) {
                        const novaId = res.apresentacaoId;
                        setApresentacoesLocais((prev) => [
                          { id: novaId, titulo: novaApTitulo.trim() },
                          ...prev,
                        ]);
                      }
                      setPlaylistParaApresentacao(null);
                      setFeedback(
                        `${res.slidesCriados.length} slide(s) da playlist adicionados à apresentação!`
                      );
                      setTimeout(() => setFeedback(null), 3500);
                    } catch (err: any) {
                      alert("Erro ao enviar playlist: " + err.message);
                    }
                  });
                }}
                className="rounded-md bg-quadra-500 px-5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Enviando..." : "Enviar Playlist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
