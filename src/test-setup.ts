// Node ortaminda calisan birim testleri icin minimal storage taklidi.
// Store modulleri import aninda localStorage'a yazmaz ama bazi fonksiyonlar
// ilk cagride okur; bu yuzden bos bir in-memory uygulama yeterlidir.
class MemoryStorage {
  private _map = new Map<string, string>();

  get length(): number {
    return this._map.size;
  }

  key(index: number): string | null {
    return Array.from(this._map.keys())[index] ?? null;
  }

  getItem(anahtar: string): string | null {
    return this._map.get(anahtar) ?? null;
  }

  setItem(anahtar: string, deger: string): void {
    this._map.set(anahtar, String(deger));
  }

  removeItem(anahtar: string): void {
    this._map.delete(anahtar);
  }

  clear(): void {
    this._map.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage;
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new MemoryStorage() as unknown as Storage;
}
// Store modulleri pagehide/visibilitychange dinleyicisi ekler; node'da
// window EventTarget API'si bulunmayabilir -> no-op taklidi yeterlidir.
if (typeof globalThis.window === 'undefined') {
  const sahte = globalThis as unknown as Record<string, unknown>;
  globalThis.window = sahte as unknown as Window & typeof globalThis;
  if (typeof sahte.addEventListener !== 'function') {
    sahte.addEventListener = () => {};
    sahte.removeEventListener = () => {};
  }
}
