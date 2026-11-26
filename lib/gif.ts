// Encoder GIF89a puro em TypeScript (zero dependências externas).
// Produz GIFs animados com looping infinito (Netscape 2.0 extension),
// otimizado para navegadores e compartilhamento em mensageiros (WhatsApp, Telegram).

export interface QuadroAnimacao {
  pixels: Uint8ClampedArray; // RGBA 4 canais
  delayCentisegundos: number; // 100 = 1 segundo, 15 = 150ms
}

export class GifEncoder {
  private width: number;
  private height: number;
  private quadros: QuadroAnimacao[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  adicionarQuadro(pixels: Uint8ClampedArray, delayCentisegundos: number) {
    this.quadros.push({ pixels, delayCentisegundos });
  }

  gerarBlob(): Blob {
    if (this.quadros.length === 0) throw new Error("Nenhum quadro para gerar o GIF.");

    const bytes: number[] = [];
    const escreverBytes = (arr: number[]) => {
      for (let i = 0; i < arr.length; i++) bytes.push(arr[i]);
    };
    const escreverU16 = (val: number) => {
      bytes.push(val & 0xff, (val >> 8) & 0xff);
    };

    // 1. Extrai paleta global de 256 cores a partir dos quadros
    const paleta = this.construirPaletaGlobal();

    // 2. Header GIF89a
    escreverBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'

    // 3. Logical Screen Descriptor
    escreverU16(this.width);
    escreverU16(this.height);
    bytes.push(0xf7); // Global color table presente, 8 bits/pixel (256 cores)
    bytes.push(0x00); // Background color index
    bytes.push(0x00); // Pixel aspect ratio

    // 4. Global Color Table (256 * 3 bytes)
    for (let i = 0; i < 256; i++) {
      const cor = paleta.tabela[i] || [0, 0, 0];
      bytes.push(cor[0], cor[1], cor[2]);
    }

    // 5. Netscape 2.0 Looping Application Extension (looping contínuo)
    escreverBytes([
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // "NETSCAPE2.0"
      0x03, 0x01,
      0x00, 0x00, // loop count = 0 (infinito)
      0x00,
    ]);

    // 6. Codifica cada quadro
    for (const quadro of this.quadros) {
      // Graphic Control Extension
      escreverBytes([
        0x21, 0xf9, 0x04,
        0x04, // Disposal method: 1 (não descartar / sobrepor)
      ]);
      escreverU16(quadro.delayCentisegundos);
      bytes.push(0x00); // Transparent color index
      bytes.push(0x00); // Block terminator

      // Image Descriptor
      bytes.push(0x2c); // Separador de imagem
      escreverU16(0);   // Left
      escreverU16(0);   // Top
      escreverU16(this.width);
      escreverU16(this.height);
      bytes.push(0x00); // Sem tabela local de cores

      // Mapeia pixels RGBA para índices de cor 0..255
      const indices = this.mapearIndices(quadro.pixels, paleta);

      // Compactação LZW
      this.comprimirLZW(indices, bytes);
    }

    // 7. Trailer GIF
    bytes.push(0x3b);

    return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
  }

  private construirPaletaGlobal(): { tabela: number[][]; mapa: Map<number, number> } {
    // Coleta amostra de cores frequentes nos quadros
    const contagens = new Map<number, number>();

    for (const q of this.quadros) {
      const px = q.pixels;
      const step = Math.max(4, Math.floor(px.length / (4 * 15000))); // amostra representativa
      for (let i = 0; i < px.length; i += step * 4) {
        // Reduz para 5 bits por canal (32 níveis cada) para agrupamento rápido
        const r = px[i] & 0xf8;
        const g = px[i + 1] & 0xf8;
        const b = px[i + 2] & 0xf8;
        const chave = (r << 16) | (g << 8) | b;
        contagens.set(chave, (contagens.get(chave) || 0) + 1);
      }
    }

    // Ordena pelas mais frequentes
    const maisFrequentes = Array.from(contagens.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 255)
      .map(([chave]) => [
        (chave >> 16) & 0xff,
        (chave >> 8) & 0xff,
        chave & 0xff,
      ]);

    // Garante que temos as cores principais da quadra mesmo se a amostra variar
    const coresChave = [
      [246, 231, 193], // Areia externa
      [235, 211, 160], // Areia quadra
      [29, 78, 216],   // Azul linha
      [140, 132, 86],  // Baliza
      [47, 84, 150],   // Azul ataque
      [242, 106, 27],  // Laranja defesa
      [255, 255, 255], // Branco bola/texto
      [24, 32, 46],    // Escuro
    ];

    const tabela: number[][] = [];
    const chavesAdicionadas = new Set<number>();

    const addCor = (c: number[]) => {
      const k = (c[0] << 16) | (c[1] << 8) | c[2];
      if (!chavesAdicionadas.has(k) && tabela.length < 256) {
        chavesAdicionadas.add(k);
        tabela.push(c);
      }
    };

    coresChave.forEach(addCor);
    maisFrequentes.forEach(addCor);

    while (tabela.length < 256) {
      tabela.push([0, 0, 0]);
    }

    return { tabela, mapa: new Map() };
  }

  private mapearIndices(
    pixels: Uint8ClampedArray,
    paleta: { tabela: number[][]; mapa: Map<number, number> }
  ): Uint8Array {
    const totalPixels = this.width * this.height;
    const out = new Uint8Array(totalPixels);
    const { tabela, mapa } = paleta;

    for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const chave = ((r & 0xf8) << 16) | ((g & 0xf8) << 8) | (b & 0xf8);

      let idx = mapa.get(chave);
      if (idx === undefined) {
        // Encontra a cor mais próxima no espaço euclidiano RGB
        let menorDist = Infinity;
        let melhorIdx = 0;
        for (let c = 0; c < tabela.length; c++) {
          const cor = tabela[c];
          const dr = r - cor[0];
          const dg = g - cor[1];
          const db = b - cor[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < menorDist) {
            menorDist = dist;
            melhorIdx = c;
            if (dist === 0) break;
          }
        }
        idx = melhorIdx;
        mapa.set(chave, idx);
      }

      out[p] = idx;
    }

    return out;
  }

  private comprimirLZW(indices: Uint8Array, bytes: number[]) {
    const minCodeSize = 8;
    bytes.push(minCodeSize);

    const clearCode = 1 << minCodeSize; // 256
    const eoiCode = clearCode + 1;       // 257

    let codeSize = minCodeSize + 1;      // 9
    let nextCode = clearCode + 2;        // 258

    const dict = new Map<number, number>();

    let curAccum = 0;
    let curBits = 0;
    const packet: number[] = [];

    const flushPacket = () => {
      if (packet.length > 0) {
        bytes.push(packet.length);
        for (let i = 0; i < packet.length; i++) bytes.push(packet[i]);
        packet.length = 0;
      }
    };

    const emitCode = (code: number) => {
      curAccum |= code << curBits;
      curBits += codeSize;
      while (curBits >= 8) {
        packet.push(curAccum & 0xff);
        if (packet.length === 254) flushPacket();
        curAccum >>= 8;
        curBits -= 8;
      }
    };

    // Emite Clear Code inicial
    emitCode(clearCode);

    let prefix = indices[0];

    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const chave = (prefix << 8) | k;

      if (dict.has(chave)) {
        prefix = dict.get(chave)!;
      } else {
        emitCode(prefix);

        if (nextCode < 4096) {
          dict.set(chave, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          emitCode(clearCode);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = clearCode + 2;
        }

        prefix = k;
      }
    }

    emitCode(prefix);
    emitCode(eoiCode);

    // Despeja bits remanescentes
    if (curBits > 0) {
      packet.push(curAccum & 0xff);
    }
    flushPacket();

    // Terminador de bloco LZW
    bytes.push(0x00);
  }
}
