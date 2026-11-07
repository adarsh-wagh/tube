// Small localStorage helpers. Data stays in this browser on this device.
window.BunnyStorage = {
  get(key, fallback) { try { const value = localStorage.getItem("sasatube_" + key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem("sasatube_" + key, JSON.stringify(value)); } catch (error) { console.warn("Could not save preference", error); } },
  position(id) { return this.get("positions", {})[id] || 0; },
  savePosition(id, seconds) { const all=this.get("positions",{}); all[id]=seconds; this.set("positions",all); },
  favorites() { return this.get("favorites", []); },
  history() { return this.get("history", []); },
  addHistory(id) { const items=this.history().filter(x=>x!==id); items.unshift(id); this.set("history",items.slice(0,30)); }
};
