const DB_NAME = "handebol-hub-offline-pdfs";
const STORE_NAME = "pdfs";
const DB_VERSION = 1;

export interface PdfOfflineRegistro {
  apresentacaoId: string;
  blob: Blob;
  nome: string;
  tamanhoBytes: number;
  salvoEm: number;
}

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível neste navegador."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "apresentacaoId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Erro ao abrir cache offline."));
  });
}

export async function salvarPdfOffline(
  apresentacaoId: string,
  blob: Blob,
  nome: string
): Promise<PdfOfflineRegistro> {
  const db = await abrirBanco();
  const registro: PdfOfflineRegistro = {
    apresentacaoId,
    blob,
    nome,
    tamanhoBytes: blob.size,
    salvoEm: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(registro);
    tx.oncomplete = () => {
      db.close();
      resolve(registro);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Erro ao salvar PDF offline."));
    };
  });
}

export async function obterPdfOffline(
  apresentacaoId: string
): Promise<PdfOfflineRegistro | null> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(apresentacaoId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as PdfOfflineRegistro | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Erro ao ler PDF offline."));
    };
  });
}

export async function removerPdfOffline(apresentacaoId: string): Promise<void> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(apresentacaoId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Erro ao remover PDF offline."));
    };
  });
}
