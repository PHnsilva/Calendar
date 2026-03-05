// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PSEUDO (fluxo):
 * 1) Renderiza mês atual em grade.
 * 2) Clique em um dia -> abre modal:
 *    - carrega slots em /api/servicos/available?date=YYYY-MM-DD&slotMinutes=60
 *    - usuário escolhe slot + preenche form
 *    - POST /api/servicos com payload "tolerante" (start/end + date/startTime/slotMinutes + campos)
 * 3) Salva manageToken retornado (se existir) e habilita "Meus agendamentos".
 * 4) Fallback: se API falhar, usa armazenamento local (dummy).
 */

type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELED" | "UNKNOWN";

type Booking = {
  id: string;
  date: string;          // YYYY-MM-DD
  start: string;         // ISO string (preferido) ou "HH:mm"
  end: string;           // ISO string (preferido) ou "HH:mm"
  name?: string;
  phone?: string;
  service?: string;
  notes?: string;
  status?: BookingStatus;
  manageToken?: string;
  createdAt?: string;    // ISO
  raw?: any;
};

type Slot = {
  label: string;         // "09:00"
  startISO: string;      // "YYYY-MM-DDTHH:mm:00"
  endISO: string;        // "YYYY-MM-DDTHH:mm:00"
};

type ToastKind = "success" | "error" | "info";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8080";

const ENDPOINTS = {
  available: "/api/servicos/available",
  create: "/api/servicos",
  myCandidates: ["/api/servicos/me", "/api/servicos/my"],
  adminListCandidates: ["/api/servicos/admin", "/api/admin/servicos", "/api/servicos"],
  adminDeleteCandidates: (id: string) => [`/api/servicos/${id}`, `/api/admin/servicos/${id}`, `/api/servicos/admin/${id}`],

  // opcionais (se existirem no seu backend)
  cepCandidates: (cep: string) => [`/api/cep/${cep}`, `/api/cep?cep=${encodeURIComponent(cep)}`],
  verifyStart: "/api/verify/start",
  verifyConfirm: "/api/verify/confirm",
  verifyResend: "/api/verify/resend",
  recoverStart: "/api/recover/start",
  recoverConfirm: "/api/recover/confirm",
  routesCompute: "/api/routes/compute",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toISODateTime(dateISO: string, hhmm: string) {
  return `${dateISO}T${hhmm}:00`;
}

function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

function extractHHmm(input: string) {
  // aceita "2026-02-20T09:00:00" ou "09:00"
  const m = input.match(/(\d{2}:\d{2})/);
  return m ? m[1] : input;
}

function isValidISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function uid(prefix = "b") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clampStr(s: string, max = 140) {
  const v = (s || "").trim();
  return v.length > max ? v.slice(0, max) : v;
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return initial;
    const parsed = safeJsonParse<T>(raw);
    return parsed ?? initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

async function fetchJson(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data: any; text?: string }> {
  const timeoutMs = init?.timeoutMs ?? 9000;
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const status = res.status;
    const text = await res.text();
    const data = safeJsonParse<any>(text) ?? text;
    return { ok: res.ok, status, data, text };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, text: e?.message || "network_error" };
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * Tenta várias rotas até achar uma que responda OK.
 */
async function tryMany<T>(
  candidates: string[],
  init: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data: any; used?: string }> {
  for (const path of candidates) {
    const res = await fetchJson(`${API_BASE}${path}`, init);
    if (res.ok) return { ok: true, status: res.status, data: res.data, used: path };
    // se for 404, tenta próxima; se for 401/403, também tenta próxima (às vezes muda header/rota)
    if (![404, 401, 403].includes(res.status)) {
      // erros diferentes também podem indicar rota certa, mas payload errado
      // ainda assim seguimos tentando pra dar chance
    }
  }
  // se nenhuma OK, retorna a última tentativa (mais contexto)
  const last = candidates[candidates.length - 1];
  const r = await fetchJson(`${API_BASE}${last}`, init);
  return { ok: r.ok, status: r.status, data: r.data, used: last };
}

/**
 * Normaliza resposta de "available" em lista de Slot.
 * Aceita formatos comuns:
 * - ["09:00","10:00"] (slots por horário)
 * - ["2026-02-20T09:00:00", ...]
 * - { slots: ["09:00"] }
 * - { available: ["09:00"] }
 * - { items: [...] }
 */
function normalizeSlots(dateISO: string, slotMinutes: number, data: any): Slot[] {
  const rawList =
    Array.isArray(data) ? data :
    Array.isArray(data?.slots) ? data.slots :
    Array.isArray(data?.available) ? data.available :
    Array.isArray(data?.items) ? data.items :
    Array.isArray(data?.data) ? data.data :
    null;

  const list: string[] = (rawList ?? [])
    .map((x: any) => typeof x === "string" ? x : (x?.start || x?.time || ""))
    .filter(Boolean);

  // fallback: se veio objeto do tipo {start:"...", end:"..."}
  const list2 =
    Array.isArray(rawList) && rawList.some((x: any) => typeof x === "object")
      ? (rawList as any[]).map((x) => x?.start || x?.time).filter(Boolean)
      : list;

  const finalList = (list2.length ? list2 : list).slice(0, 200);

  const slots: Slot[] = finalList.map((v) => {
    const hhmm = extractHHmm(v);
    const startISO = toISODateTime(dateISO, hhmm);
    const endISO = addMinutesToISO(startISO, slotMinutes);
    return { label: hhmm, startISO, endISO };
  });

  // se não veio nada, retorna vazio (UI mostra fallback local)
  return slots;
}

function makeLocalSlots(dateISO: string, slotMinutes: number) {
  // 08:00 até 18:00
  const slots: Slot[] = [];
  for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += slotMinutes) {
      const hhmm = `${pad2(h)}:${pad2(m)}`;
      const startISO = toISODateTime(dateISO, hhmm);
      const endISO = addMinutesToISO(startISO, slotMinutes);
      slots.push({ label: hhmm, startISO, endISO });
    }
  }
  return slots;
}

function bookingTimeLabel(b: Booking) {
  const s = extractHHmm(b.start);
  const e = extractHHmm(b.end);
  return `${s}–${e}`;
}

function statusLabel(s?: BookingStatus) {
  if (s === "CONFIRMED") return "Confirmado";
  if (s === "PENDING") return "Pendente";
  if (s === "CANCELED") return "Cancelado";
  return "—";
}

function statusPillClass(s?: BookingStatus) {
  if (s === "CONFIRMED") return "pill pill-ok";
  if (s === "PENDING") return "pill pill-warn";
  if (s === "CANCELED") return "pill pill-bad";
  return "pill";
}

type FormState = {
  name: string;
  phone: string;
  service: string;
  notes: string;

  cep: string;
  address: string;
  city: string;
  state: string;

  durationMinutes: number;   // slotMinutes
};

const LS_KEYS = {
  manageToken: "calendar_manage_token",
  adminToken: "calendar_admin_token",
  dummyBookings: "calendar_dummy_bookings_v1",
  dummyHistory: "calendar_dummy_history_v1",
  apiHealth: "calendar_api_health_v1",
};

type DummyHistoryItem = {
  id: string;
  at: string;      // ISO
  kind: "CREATE" | "DELETE" | "INFO";
  title: string;
  detail?: string;
};

function pushHistory(
  setHistory: (fn: (prev: DummyHistoryItem[]) => DummyHistoryItem[]) => void,
  item: Omit<DummyHistoryItem, "id" | "at">
) {
  setHistory((prev) => [
    { id: uid("h"), at: new Date().toISOString(), ...item },
    ...prev,
  ].slice(0, 300));
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateISO, setSelectedDateISO] = useState(() => isoDate(today));

  const [manageToken, setManageToken] = useLocalStorageState<string>(LS_KEYS.manageToken, "");
  const [adminToken, setAdminToken] = useLocalStorageState<string>(LS_KEYS.adminToken, "");

  const [dummyBookings, setDummyBookings] = useLocalStorageState<Booking[]>(LS_KEYS.dummyBookings, []);
  const [dummyHistory, setDummyHistory] = useLocalStorageState<DummyHistoryItem[]>(LS_KEYS.dummyHistory, []);

  const [apiOk, setApiOk] = useLocalStorageState<boolean>(LS_KEYS.apiHealth, true);

  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"CAL" | "MY" | "HIST" | "ADMIN" | "SETTINGS">("CAL");

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    name: "",
    phone: "",
    service: "Atendimento",
    notes: "",
    cep: "",
    address: "",
    city: "",
    state: "",
    durationMinutes: 60,
  }));

  const monthGrid = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    // week starts Monday (1). JS getDay: Sun=0..Sat=6
    const firstDow = (first.getDay() + 6) % 7; // Mon=0..Sun=6
    const daysInMonth = last.getDate();

    const cells: Array<{ date: Date; inMonth: boolean; iso: string }> = [];

    // start from previous month to fill first row
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(y, m, 1);
      d.setDate(d.getDate() - (i + 1));
      cells.push({ date: d, inMonth: false, iso: isoDate(d) });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      cells.push({ date: d, inMonth: true, iso: isoDate(d) });
    }

    while (cells.length % 7 !== 0) {
      const d = new Date(y, m, daysInMonth);
      d.setDate(d.getDate() + (cells.length % 7 === 0 ? 0 : (7 - (cells.length % 7))));
      // acima é meio chato; simplifica:
      const lastCell = cells[cells.length - 1].date;
      const nd = new Date(lastCell);
      nd.setDate(nd.getDate() + 1);
      cells.push({ date: nd, inMonth: false, iso: isoDate(nd) });
    }

    // 6 semanas para estabilidade visual
    while (cells.length < 42) {
      const lastCell = cells[cells.length - 1].date;
      const nd = new Date(lastCell);
      nd.setDate(nd.getDate() + 1);
      cells.push({ date: nd, inMonth: false, iso: isoDate(nd) });
    }

    return cells;
  }, [monthCursor]);

  function showToast(kind: ToastKind, msg: string) {
    setToast({ kind, msg });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  function openCreateModal(dateISO: string) {
    if (!isValidISODate(dateISO)) return;
    setSelectedDateISO(dateISO);
    setSelectedSlot(null);
    setSlots([]);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function setFormField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function localDayBookings(dateISO: string) {
    return dummyBookings
      .filter((b) => b.date === dateISO)
      .sort((a, b) => (extractHHmm(a.start) > extractHHmm(b.start) ? 1 : -1));
  }

  async function loadSlots(dateISO: string, slotMinutes: number) {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);

    const query = `?date=${encodeURIComponent(dateISO)}&slotMinutes=${encodeURIComponent(String(slotMinutes))}`;
    const url = `${API_BASE}${ENDPOINTS.available}${query}`;

    const res = await fetchJson(url, { method: "GET", headers: { "Accept": "application/json" }, timeoutMs: 9000 });

    if (res.ok) {
      const parsed = normalizeSlots(dateISO, slotMinutes, res.data);
      setSlots(parsed);
      setApiOk(true);
      if (!parsed.length) showToast("info", "A API respondeu, mas não retornou slots. Usei fallback local se precisar.");
      return;
    }

    setApiOk(false);
    setSlots([]); // UI mostra fallback local
    showToast("error", `Não consegui buscar slots na API (status ${res.status}). Você pode testar pelo fallback local.`);
  }

  async function createBooking() {
    if (!selectedSlot) {
      showToast("error", "Selecione um horário (slot) antes de salvar.");
      return;
    }
    const name = clampStr(form.name, 80);
    const phone = clampStr(form.phone, 30);
    const service = clampStr(form.service, 60);

    if (!name || !phone) {
      showToast("error", "Preencha nome e telefone.");
      return;
    }

    const slotMinutes = Math.max(15, Math.min(240, Number(form.durationMinutes) || 60));
    const startISO = selectedSlot.startISO;
    const endISO = addMinutesToISO(startISO, slotMinutes);

    // Payload “tolerante” (backend ignora campos extras)
    const payload: any = {
      // formatos comuns
      date: selectedDateISO,
      startTime: extractHHmm(startISO),
      slotMinutes,

      // também manda ISO completo
      start: startISO,
      end: endISO,

      // dados do cliente
      name,
      nome: name,
      phone,
      telefone: phone,

      // serviço
      service,
      servico: service,

      // extras (se seu backend tiver)
      notes: clampStr(form.notes, 400),
      observacao: clampStr(form.notes, 400),

      cep: clampStr(form.cep, 12),
      address: clampStr(form.address, 120),
      endereco: clampStr(form.address, 120),
      city: clampStr(form.city, 60),
      cidade: clampStr(form.city, 60),
      state: clampStr(form.state, 30),
      estado: clampStr(form.state, 30),

      // token (se a API aceitar associar)
      manageToken: manageToken || undefined,
      token: manageToken || undefined,
    };

    const res = await fetchJson(`${API_BASE}${ENDPOINTS.create}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(manageToken ? { "Authorization": `Bearer ${manageToken}`, "X-MANAGE-TOKEN": manageToken } : {}),
      },
      body: JSON.stringify(payload),
      timeoutMs: 12000,
    });

    if (res.ok) {
      setApiOk(true);

      // tenta extrair campos comuns da resposta
      const data = res.data ?? {};
      const id = String(data.id || data.servicoId || data.bookingId || uid("srv"));
      const token = String(data.manageToken || data.token || data.manage_token || manageToken || "");

      const created: Booking = {
        id,
        date: selectedDateISO,
        start: startISO,
        end: endISO,
        name,
        phone,
        service,
        notes: form.notes?.trim() || "",
        status: (data.status as BookingStatus) || "CONFIRMED",
        manageToken: token || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        raw: data,
      };

      // atualiza UI local (mesmo que a API tenha criado, guardamos cache pra cards)
      setDummyBookings((prev) => {
        const next = [created, ...prev].slice(0, 500);
        return next;
      });

      if (token && token !== manageToken) setManageToken(token);

      pushHistory(setDummyHistory, {
        kind: "CREATE",
        title: `Agendamento criado ${selectedDateISO} ${extractHHmm(startISO)}`,
        detail: `${name} • ${phone} • ${service}`,
      });

      showToast("success", "Agendamento criado!");
      closeModal();

      // refresh
      await refreshDayBookings(selectedDateISO);
      if (token || manageToken) await refreshMyBookings(token || manageToken);
      return;
    }

    // fallback local (dummy)
    setApiOk(false);
    const localId = uid("local");
    const local: Booking = {
      id: localId,
      date: selectedDateISO,
      start: startISO,
      end: endISO,
      name,
      phone,
      service,
      notes: form.notes?.trim() || "",
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
      raw: { apiError: res.data, apiStatus: res.status },
    };

    setDummyBookings((prev) => [local, ...prev].slice(0, 500));
    pushHistory(setDummyHistory, {
      kind: "INFO",
      title: "Fallback local usado (API indisponível)",
      detail: `Salvei localmente: ${selectedDateISO} ${extractHHmm(startISO)} • ${name}`,
    });

    showToast("error", `API não respondeu (status ${res.status}). Salvei localmente (dummy).`);
    closeModal();
    await refreshDayBookings(selectedDateISO);
  }

  async function refreshDayBookings(dateISO: string) {
    // por enquanto, mostramos cache local (dummyBookings).
    // Quando você tiver endpoint "listar por data", dá pra trocar aqui.
    setDayBookings(localDayBookings(dateISO));
  }

  async function refreshMyBookings(token: string) {
    const t = (token || "").trim();
    if (!t) {
      setMyBookings([]);
      return;
    }

    const headers = {
      "Accept": "application/json",
      "Authorization": `Bearer ${t}`,
      "X-MANAGE-TOKEN": t,
    };

    // tenta /me e /my
    const res = await tryMany(ENDPOINTS.myCandidates, { method: "GET", headers, timeoutMs: 10000 });

    if (res.ok) {
      setApiOk(true);
      const data = res.data;

      const arr =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data?.servicos) ? data.servicos :
        [];

      const normalized: Booking[] = arr.map((x: any) => {
        const id = String(x?.id || x?.servicoId || x?.bookingId || uid("my"));
        const date = String(x?.date || x?.data || selectedDateISO);
        const start = String(x?.start || x?.inicio || x?.startTime || x?.horaInicio || "");
        const end = String(x?.end || x?.fim || x?.endTime || x?.horaFim || "");
        const status = (x?.status as BookingStatus) || "UNKNOWN";
        return {
          id,
          date: isValidISODate(date) ? date : selectedDateISO,
          start: start.includes("T") ? start : (start ? toISODateTime(date, extractHHmm(start)) : ""),
          end: end.includes("T") ? end : (end ? toISODateTime(date, extractHHmm(end)) : ""),
          name: x?.name || x?.nome,
          phone: x?.phone || x?.telefone,
          service: x?.service || x?.servico,
          notes: x?.notes || x?.observacao,
          status,
          manageToken: t,
          createdAt: x?.createdAt || x?.criadoEm,
          raw: x,
        };
      });

      setMyBookings(normalized);
      return;
    }

    setApiOk(false);
    // fallback local: filtra por telefone (melhor que nada)
    const byPhone = dummyBookings.filter((b) => (b.phone || "").trim() && (b.phone || "").trim() === (form.phone || "").trim());
    setMyBookings(byPhone);
    showToast("error", `Não consegui carregar "Meus agendamentos" na API (status ${res.status}). Usei fallback local.`);
  }

  async function refreshAdminBookings() {
    const t = adminToken.trim();
    if (!t) {
      setAdminBookings([]);
      return;
    }

    const headers = {
      "Accept": "application/json",
      "X-ADMIN-TOKEN": t,
    };

    const res = await tryMany(ENDPOINTS.adminListCandidates, { method: "GET", headers, timeoutMs: 12000 });

    if (res.ok) {
      setApiOk(true);
      const data = res.data;

      const arr =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data?.servicos) ? data.servicos :
        [];

      const normalized: Booking[] = arr.map((x: any) => {
        const id = String(x?.id || x?.servicoId || x?.bookingId || uid("adm"));
        const date = String(x?.date || x?.data || selectedDateISO);
        const start = String(x?.start || x?.inicio || x?.startTime || x?.horaInicio || "");
        const end = String(x?.end || x?.fim || x?.endTime || x?.horaFim || "");
        const status = (x?.status as BookingStatus) || "UNKNOWN";
        return {
          id,
          date: isValidISODate(date) ? date : selectedDateISO,
          start: start.includes("T") ? start : (start ? toISODateTime(date, extractHHmm(start)) : ""),
          end: end.includes("T") ? end : (end ? toISODateTime(date, extractHHmm(end)) : ""),
          name: x?.name || x?.nome,
          phone: x?.phone || x?.telefone,
          service: x?.service || x?.servico,
          notes: x?.notes || x?.observacao,
          status,
          createdAt: x?.createdAt || x?.criadoEm,
          raw: x,
        };
      });

      setAdminBookings(normalized);
      return;
    }

    setApiOk(false);
    // fallback: mostra dummyBookings
    setAdminBookings(dummyBookings.slice(0, 120));
    showToast("error", `Admin list falhou na API (status ${res.status}). Mostrando fallback local.`);
  }

  async function adminDelete(id: string) {
    const t = adminToken.trim();
    if (!t) {
      showToast("error", "Informe o X-ADMIN-TOKEN para deletar.");
      return;
    }

    const headers = {
      "Accept": "application/json",
      "X-ADMIN-TOKEN": t,
    };

    const candidates = ENDPOINTS.adminDeleteCandidates(id);
    let ok = false;
    let lastStatus = 0;

    for (const path of candidates) {
      const res = await fetchJson(`${API_BASE}${path}`, { method: "DELETE", headers, timeoutMs: 12000 });
      lastStatus = res.status;
      if (res.ok) {
        ok = true;
        break;
      }
    }

    if (ok) {
      setApiOk(true);
      setAdminBookings((prev) => prev.filter((b) => b.id !== id));
      setDummyBookings((prev) => prev.filter((b) => b.id !== id)); // mantém coerência no cache
      pushHistory(setDummyHistory, { kind: "DELETE", title: "Agendamento removido (admin)", detail: `id=${id}` });
      showToast("success", "Agendamento removido!");
      return;
    }

    setApiOk(false);
    // fallback local: remove do cache
    setAdminBookings((prev) => prev.filter((b) => b.id !== id));
    setDummyBookings((prev) => prev.filter((b) => b.id !== id));
    pushHistory(setDummyHistory, { kind: "INFO", title: "Delete fallback local (API falhou)", detail: `id=${id} status=${lastStatus}` });
    showToast("error", `Delete na API falhou (status ${lastStatus}). Removi só localmente (dummy).`);
  }

  async function lookupCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length < 8) {
      showToast("error", "CEP inválido (precisa 8 dígitos).");
      return;
    }

    // se seu backend tiver CepController, tente aqui.
    const res = await tryMany(ENDPOINTS.cepCandidates(cep), {
      method: "GET",
      headers: { "Accept": "application/json" },
      timeoutMs: 9000,
    });

    if (!res.ok) {
      showToast("error", `Não consegui buscar CEP na API (status ${res.status}).`);
      return;
    }

    const d = res.data || {};
    const address = d.address || d.logradouro || d.street || "";
    const city = d.city || d.localidade || "";
    const state = d.state || d.uf || "";

    setFormField("address", address);
    setFormField("city", city);
    setFormField("state", state);
    showToast("success", "CEP preenchido!");
  }

  // Ao trocar data selecionada, atualiza lista do dia
  useEffect(() => {
    refreshDayBookings(selectedDateISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateISO, dummyBookings]);

  // Quando abrir modal, carrega slots
  useEffect(() => {
    if (!isModalOpen) return;
    loadSlots(selectedDateISO, form.durationMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, selectedDateISO, form.durationMinutes]);

  // Se token existir, tenta carregar meus agendamentos ao entrar na tab
  useEffect(() => {
    if (activeTab !== "MY") return;
    if (!manageToken.trim()) return;
    refreshMyBookings(manageToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Admin refresh
  useEffect(() => {
    if (activeTab !== "ADMIN") return;
    if (!adminToken.trim()) return;
    refreshAdminBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const dayCountByISO = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of dummyBookings) {
      map.set(b.date, (map.get(b.date) || 0) + 1);
    }
    return map;
  }, [dummyBookings]);

  const selectedDayCards = useMemo(() => {
    const list = dayBookings;
    if (!list.length) return [];
    return list;
  }, [dayBookings]);

  const monthTitle = useMemo(() => {
    const m = monthCursor.toLocaleString("pt-BR", { month: "long" });
    return `${m[0].toUpperCase()}${m.slice(1)} ${monthCursor.getFullYear()}`;
  }, [monthCursor]);

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const modalSlots = useMemo(() => {
    // se a API não retornou slots, usa fallback local
    const apiSlots = slots.length ? slots : makeLocalSlots(selectedDateISO, form.durationMinutes);

    // remove slots que conflitam com cache local (evita dupla marcação no dummy)
    const used = new Set(localDayBookings(selectedDateISO).map((b) => extractHHmm(b.start)));
    return apiSlots.filter((s) => !used.has(extractHHmm(s.startISO)));
  }, [slots, selectedDateISO, form.durationMinutes, dummyBookings]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">📅</div>
          <div className="brandText">
            <div className="title">Calendar</div>
            <div className="subtitle">
              {apiOk ? <span className="dot ok" /> : <span className="dot bad" />}
              <span className="subtitleText">
                {apiOk ? "API OK" : "API instável (fallback local ativo)"}
              </span>
            </div>
          </div>
        </div>

        <nav className="tabs">
          <button className={activeTab === "CAL" ? "tab active" : "tab"} onClick={() => setActiveTab("CAL")}>
            Calendário
          </button>
          <button className={activeTab === "MY" ? "tab active" : "tab"} onClick={() => setActiveTab("MY")}>
            Meus
          </button>
          <button className={activeTab === "HIST" ? "tab active" : "tab"} onClick={() => setActiveTab("HIST")}>
            Histórico
          </button>
          <button className={activeTab === "ADMIN" ? "tab active" : "tab"} onClick={() => setActiveTab("ADMIN")}>
            Admin
          </button>
          <button className={activeTab === "SETTINGS" ? "tab active" : "tab"} onClick={() => setActiveTab("SETTINGS")}>
            Config
          </button>
        </nav>

        <div className="actions">
          <button className="btn primary" onClick={() => openCreateModal(selectedDateISO)}>
            + Agendar
          </button>
        </div>
      </header>

      <main className="main">
        {activeTab === "CAL" && (
          <div className="grid">
            <section className="panel calendarPanel">
              <div className="panelHeader">
                <div className="panelTitle">{monthTitle}</div>
                <div className="panelActions">
                  <button
                    className="btn ghost"
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  >
                    ◀
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => setMonthCursor(() => new Date(today.getFullYear(), today.getMonth(), 1))}
                  >
                    Hoje
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="weekHeader">
                {weekDays.map((w) => (
                  <div key={w} className="weekCell">{w}</div>
                ))}
              </div>

              <div className="monthGrid">
                {monthGrid.map((c, idx) => {
                  const isSelected = c.iso === selectedDateISO;
                  const isToday = c.iso === isoDate(today);
                  const count = dayCountByISO.get(c.iso) || 0;

                  const cls = [
                    "dayCell",
                    c.inMonth ? "inMonth" : "outMonth",
                    isSelected ? "selected" : "",
                    isToday ? "today" : "",
                  ].filter(Boolean).join(" ");

                  return (
                    <button
                      key={`${c.iso}_${idx}`}
                      className={cls}
                      onClick={() => {
                        setSelectedDateISO(c.iso);
                        openCreateModal(c.iso);
                      }}
                      title="Clique para agendar"
                    >
                      <div className="dayTop">
                        <span className="dayNum">{c.date.getDate()}</span>
                        {count > 0 && <span className="badge">{count}</span>}
                      </div>
                      <div className="dayHint">
                        {count > 0 ? "Agendado" : "Livre"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="panelFooter">
                <div className="hint">
                  Dica: o backend já aplica regras (ex.: folga 4x4 / conflitos). Aqui o front apenas consome <code>/available</code>.
                </div>
              </div>
            </section>

            <section className="panel sidePanel">
              <div className="panelHeader">
                <div className="panelTitle">Dia selecionado</div>
                <div className="panelActions">
                  <div className="miniDate">{selectedDateISO}</div>
                  <button className="btn" onClick={() => openCreateModal(selectedDateISO)}>
                    Novo
                  </button>
                </div>
              </div>

              <div className="cards">
                {selectedDayCards.length === 0 ? (
                  <div className="empty">
                    <div className="emptyTitle">Sem agendamentos</div>
                    <div className="emptyText">Clique em “Novo” ou em um dia do calendário.</div>
                  </div>
                ) : (
                  selectedDayCards.map((b) => (
                    <div key={b.id} className="card">
                      <div className="cardTop">
                        <div className="cardTime">{bookingTimeLabel(b)}</div>
                        <span className={statusPillClass(b.status)}>{statusLabel(b.status)}</span>
                      </div>
                      <div className="cardTitle">{b.service || "Atendimento"}</div>
                      <div className="cardMeta">
                        <span className="metaItem">👤 {b.name || "—"}</span>
                        <span className="metaItem">📞 {b.phone || "—"}</span>
                      </div>
                      {b.notes ? <div className="cardNotes">{b.notes}</div> : null}
                      <div className="cardFoot">
                        <span className="muted">id: {b.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "MY" && (
          <div className="panel single">
            <div className="panelHeader">
              <div className="panelTitle">Meus agendamentos</div>
              <div className="panelActions">
                <input
                  className="input"
                  placeholder="Cole seu manageToken (ou token do /recover)"
                  value={manageToken}
                  onChange={(e) => setManageToken(e.target.value)}
                />
                <button className="btn" onClick={() => refreshMyBookings(manageToken)}>
                  Atualizar
                </button>
              </div>
            </div>

            <div className="panelBody">
              <div className="hint">
                O front tenta <code>/api/servicos/me</code> e <code>/api/servicos/my</code> com <code>Authorization</code> e <code>X-MANAGE-TOKEN</code>.
              </div>

              <div className="cards">
                {myBookings.length === 0 ? (
                  <div className="empty">
                    <div className="emptyTitle">Nada por aqui</div>
                    <div className="emptyText">Crie um agendamento e guarde o token retornado.</div>
                  </div>
                ) : (
                  myBookings
                    .slice()
                    .sort((a, b) => (a.date + bookingTimeLabel(a) > b.date + bookingTimeLabel(b) ? 1 : -1))
                    .map((b) => (
                      <div key={b.id} className="card">
                        <div className="cardTop">
                          <div className="cardTime">{b.date} • {bookingTimeLabel(b)}</div>
                          <span className={statusPillClass(b.status)}>{statusLabel(b.status)}</span>
                        </div>
                        <div className="cardTitle">{b.service || "Atendimento"}</div>
                        <div className="cardMeta">
                          <span className="metaItem">👤 {b.name || "—"}</span>
                          <span className="metaItem">📞 {b.phone || "—"}</span>
                        </div>
                        {b.notes ? <div className="cardNotes">{b.notes}</div> : null}
                        <div className="cardFoot">
                          <span className="muted">id: {b.id}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "HIST" && (
          <div className="panel single">
            <div className="panelHeader">
              <div className="panelTitle">Histórico</div>
              <div className="panelActions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    setDummyHistory([]);
                    showToast("success", "Histórico local limpo.");
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="panelBody">
              <div className="hint">
                Aqui é o histórico local (dummy). Se você expor uma rota de histórico no backend, dá pra trocar facilmente.
              </div>

              {dummyHistory.length === 0 ? (
                <div className="empty">
                  <div className="emptyTitle">Sem histórico</div>
                  <div className="emptyText">Crie/remova agendamentos para registrar eventos.</div>
                </div>
              ) : (
                <div className="historyList">
                  {dummyHistory.map((h) => (
                    <div key={h.id} className="historyItem">
                      <div className="historyTop">
                        <span className={`pill ${h.kind === "CREATE" ? "pill-ok" : h.kind === "DELETE" ? "pill-bad" : ""}`}>
                          {h.kind}
                        </span>
                        <span className="muted">{new Date(h.at).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="historyTitle">{h.title}</div>
                      {h.detail ? <div className="historyDetail">{h.detail}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ADMIN" && (
          <div className="panel single">
            <div className="panelHeader">
              <div className="panelTitle">Admin</div>
              <div className="panelActions">
                <input
                  className="input"
                  placeholder="X-ADMIN-TOKEN"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
                <button className="btn" onClick={refreshAdminBookings}>
                  Listar
                </button>
              </div>
            </div>

            <div className="panelBody">
              <div className="hint">
                O front tenta listar por algumas rotas comuns e usa header <code>X-ADMIN-TOKEN</code>.
              </div>

              <div className="cards">
                {adminBookings.length === 0 ? (
                  <div className="empty">
                    <div className="emptyTitle">Sem dados</div>
                    <div className="emptyText">Informe o token e clique em “Listar”.</div>
                  </div>
                ) : (
                  adminBookings
                    .slice(0, 200)
                    .sort((a, b) => (a.date + bookingTimeLabel(a) > b.date + bookingTimeLabel(b) ? 1 : -1))
                    .map((b) => (
                      <div key={b.id} className="card">
                        <div className="cardTop">
                          <div className="cardTime">{b.date} • {bookingTimeLabel(b)}</div>
                          <span className={statusPillClass(b.status)}>{statusLabel(b.status)}</span>
                        </div>
                        <div className="cardTitle">{b.service || "Atendimento"}</div>
                        <div className="cardMeta">
                          <span className="metaItem">👤 {b.name || "—"}</span>
                          <span className="metaItem">📞 {b.phone || "—"}</span>
                        </div>
                        <div className="cardFoot row">
                          <span className="muted">id: {b.id}</span>
                          <button className="btn danger" onClick={() => adminDelete(b.id)}>
                            Deletar
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "SETTINGS" && (
          <div className="panel single">
            <div className="panelHeader">
              <div className="panelTitle">Config / Integrações</div>
            </div>

            <div className="panelBody">
              <div className="settingsGrid">
                <div className="settingCard">
                  <div className="settingTitle">API Base</div>
                  <div className="settingText">
                    Atual: <code>{API_BASE}</code>
                  </div>
                  <div className="settingText muted">
                    Para trocar, defina <code>VITE_API_BASE</code> no seu <code>.env</code>.
                  </div>
                </div>

                <div className="settingCard">
                  <div className="settingTitle">CEP (opcional)</div>
                  <div className="settingText">
                    Se seu backend tiver <code>CepController</code>, o botão no modal preenche endereço/cidade/UF.
                  </div>
                </div>

                <div className="settingCard">
                  <div className="settingTitle">Verify / Recovery (opcional)</div>
                  <div className="settingText">
                    Estão preparados endpoints <code>/api/verify/*</code> e <code>/api/recover/*</code>,
                    mas este front ainda não força o fluxo (fica só como “plugável”).
                  </div>
                </div>

                <div className="settingCard">
                  <div className="settingTitle">Rotas / Google (opcional)</div>
                  <div className="settingText">
                    Se usar <code>GoogleRoutesClient</code>, normalmente precisa chave externa (Google).
                    Sem configurar isso no backend, não dá pra calcular rotas do jeito “Google”.
                  </div>
                </div>

                <div className="settingCard">
                  <div className="settingTitle">WhatsApp / Supabase (opcional)</div>
                  <div className="settingText">
                    Integrações externas podem exigir variáveis/credenciais. O front funciona sem isso,
                    mas recursos como envio de WhatsApp ou persistência remota dependem do backend configurado.
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="hint">
                Se você me colar **o conteúdo do `ServicoRequest.java` e do retorno do `available`**,
                eu ajusto este App para bater 100% com seu DTO sem “tolerância”.
              </div>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHeader">
              <div className="modalTitle">Novo agendamento</div>
              <button className="btn ghost" onClick={closeModal} aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <div className="box">
                  <div className="boxTitle">Data & duração</div>
                  <div className="row wrap">
                    <div className="field">
                      <label className="label">Data</label>
                      <input
                        className="input"
                        type="date"
                        value={selectedDateISO}
                        onChange={(e) => setSelectedDateISO(e.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label className="label">Duração</label>
                      <select
                        className="input"
                        value={form.durationMinutes}
                        onChange={(e) => setFormField("durationMinutes", Number(e.target.value))}
                      >
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                        <option value={120}>120 min</option>
                      </select>
                    </div>

                    <div className="field grow">
                      <label className="label">Slots</label>
                      <button
                        className="btn"
                        onClick={() => loadSlots(selectedDateISO, form.durationMinutes)}
                        disabled={slotsLoading}
                      >
                        {slotsLoading ? "Carregando..." : "Recarregar"}
                      </button>
                    </div>
                  </div>

                  <div className="slots">
                    {modalSlots.map((s) => {
                      const active = selectedSlot?.label === s.label;
                      return (
                        <button
                          key={s.label}
                          className={active ? "slot active" : "slot"}
                          onClick={() => setSelectedSlot(s)}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="hint small">
                    Se a API não responder, a lista acima vira um fallback local (08:00–18:00).
                  </div>
                </div>

                <div className="box">
                  <div className="boxTitle">Dados do agendamento</div>

                  <div className="field">
                    <label className="label">Serviço</label>
                    <input
                      className="input"
                      value={form.service}
                      onChange={(e) => setFormField("service", e.target.value)}
                      placeholder="Ex.: Corte, Consulta, Instalação..."
                    />
                  </div>

                  <div className="row wrap">
                    <div className="field grow">
                      <label className="label">Nome</label>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) => setFormField("name", e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="field grow">
                      <label className="label">Telefone</label>
                      <input
                        className="input"
                        value={form.phone}
                        onChange={(e) => setFormField("phone", e.target.value)}
                        placeholder="(DDD) 9xxxx-xxxx"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Observações</label>
                    <textarea
                      className="input textarea"
                      value={form.notes}
                      onChange={(e) => setFormField("notes", e.target.value)}
                      placeholder="Ex.: referência, detalhes..."
                    />
                  </div>

                  <div className="divider small" />

                  <div className="boxTitle">Endereço (opcional)</div>
                  <div className="row wrap">
                    <div className="field">
                      <label className="label">CEP</label>
                      <input
                        className="input"
                        value={form.cep}
                        onChange={(e) => setFormField("cep", e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="field">
                      <label className="label">&nbsp;</label>
                      <button className="btn" onClick={lookupCep}>
                        Buscar CEP
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Endereço</label>
                    <input
                      className="input"
                      value={form.address}
                      onChange={(e) => setFormField("address", e.target.value)}
                      placeholder="Rua, número, bairro..."
                    />
                  </div>

                  <div className="row wrap">
                    <div className="field grow">
                      <label className="label">Cidade</label>
                      <input
                        className="input"
                        value={form.city}
                        onChange={(e) => setFormField("city", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">UF</label>
                      <input
                        className="input"
                        value={form.state}
                        onChange={(e) => setFormField("state", e.target.value)}
                        placeholder="MG"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <div className="summary">
                <div className="summaryLine">
                  <span className="muted">Data</span>
                  <span>{selectedDateISO}</span>
                </div>
                <div className="summaryLine">
                  <span className="muted">Horário</span>
                  <span>{selectedSlot ? selectedSlot.label : "—"}</span>
                </div>
                <div className="summaryLine">
                  <span className="muted">Duração</span>
                  <span>{form.durationMinutes} min</span>
                </div>
              </div>

              <div className="footerActions">
                <button className="btn ghost" onClick={closeModal}>Cancelar</button>
                <button className="btn primary" onClick={createBooking}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.kind}`}>
          <div className="toastMsg">{toast.msg}</div>
          <button className="toastX" onClick={() => setToast(null)} aria-label="Fechar toast">✕</button>
        </div>
      )}

      <footer className="footer">
        <div className="footerText">
          Front “all-in-one” temporário. Próximo passo: quebrar em componentes + integrar DTOs certinhos.
        </div>
      </footer>
    </div>
  );
}