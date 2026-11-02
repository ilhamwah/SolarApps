import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import { supabase, supabaseConfigured } from "./supabase";
import PVLayout from "./PVLayout";
import PVLayout3D from "./PVLayout3D";
import StringCalculator from "./StringCalculator";
import InverterConfiguration from "./InverterConfiguration";
import CableSizing from "./CableSizing";
import ProtectionGrounding from "./ProtectionGrounding";
import StructuralDesign from "./StructuralDesign";
import CADDrawings from "./CADDrawings";
import TraySizing from "./TraySizing";
import BreakerSizing from "./BreakerSizing";
import MountingDesign from "./MountingDesign";
import SurveyReport from "./SurveyReport";
import EngineeringReport from "./EngineeringReport";
import BOQ from "./BOQ";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Box, Cable,
  Check, ChevronDown, CircleHelp, ClipboardList, CloudSun,
  Command, Database, FileText, FolderOpen, Gauge, Globe,
  Grid2X2, Layers3, LayoutDashboard, Menu, Plus, Search,
  Settings2, ShieldCheck, Sun, X, Zap, Trash2
} from "lucide-react";

type Lang = "en" | "id";
type ModuleId = "dashboard" | "projects" | "layout" | "layout3d" | "electrical" | "cable" | "protection" | "structure" | "cad" | "boq" | "survey" | "tray" | "breaker" | "mounting" | "report" | "settings";
type Project = {
  id: string;
  name: string;
  type: "Ground-mounted" | "Rooftop";
  capacity: number;
  status: "In Progress" | "Planning" | "Completed";
  updated: string;
};

const copy = {
  en: {
    workspace: "WORKSPACE", tools: "ENGINEERING TOOLS", dashboard: "Dashboard", projects: "Projects",
    layout: "PV Layout", electrical: "Electrical Design", structure: "Structural Design", cad: "CAD & Drawings",
    boq: "Bill of Quantities", settings: "Settings", search: "Search projects, tools...", welcome: "Solar engineering, simplified.",
    subtitle: "Design, calculate, and manage your solar PV projects.", newProject: "New Project", overview: "Project Overview",
    allProjects: "All Projects", capacity: "Total Capacity", active: "Active Projects", modules: "Engineering Modules",
    completion: "Project Completion", recent: "Recent Projects", project: "Project", type: "System Type", status: "Status",
    power: "Capacity", updated: "Last Updated", action: "Action", open: "Open", viewAll: "View all projects",
    quick: "Quick Access", quickDesc: "Continue your engineering workflow", rooftop: "Rooftop PV", ground: "Ground-mounted PV",
    strings: "String Configuration", materials: "Material Takeoff", createTitle: "Create a new project",
    projectName: "Project name", projectType: "System type", capacityKwp: "Capacity (kWp)", cancel: "Cancel", create: "Create Project",
    namePlaceholder: "e.g. 5 MWp Solar Farm", empty: "No projects found.", language: "Language",
    planning: "Planning", progress: "In Progress", completed: "Completed", notifications: "Notifications",
    ready: "Foundation workspace", readyDesc: "Ready for engineering modules", newProjectDesc: "Start a new solar PV design",
    back: "Back to Dashboard", placeholder: "This module is a starter placeholder. Engineering functions are not implemented yet.",
    roadmap: "Module roadmap", roadmapDesc: "The next stage will add functional engineering tools to this workspace.",
  },
  id: {
    workspace: "RUANG KERJA", tools: "ALAT ENGINEERING", dashboard: "Dasbor", projects: "Proyek",
    layout: "Layout PV", electrical: "Desain Elektrikal", structure: "Desain Struktur", cad: "CAD & Gambar",
    boq: "Bill of Quantities", settings: "Pengaturan", search: "Cari proyek, alat...", welcome: "Engineering surya, lebih sederhana.",
    subtitle: "Desain, hitung, dan kelola proyek PLTS kamu.", newProject: "Proyek Baru", overview: "Ringkasan Proyek",
    allProjects: "Semua Proyek", capacity: "Total Kapasitas", active: "Proyek Aktif", modules: "Modul Engineering",
    completion: "Penyelesaian Proyek", recent: "Proyek Terbaru", project: "Proyek", type: "Jenis Sistem", status: "Status",
    power: "Kapasitas", updated: "Diperbarui", action: "Aksi", open: "Buka", viewAll: "Lihat semua proyek",
    quick: "Akses Cepat", quickDesc: "Lanjutkan alur kerja engineering", rooftop: "PLTS Atap", ground: "PLTS Ground-mounted",
    strings: "Konfigurasi String", materials: "Kebutuhan Material", createTitle: "Buat proyek baru",
    projectName: "Nama proyek", projectType: "Jenis sistem", capacityKwp: "Kapasitas (kWp)", cancel: "Batal", create: "Buat Proyek",
    namePlaceholder: "mis. PLTS 5 MWp", empty: "Proyek tidak ditemukan.", language: "Bahasa",
    planning: "Perencanaan", progress: "Sedang Berjalan", completed: "Selesai", notifications: "Notifikasi",
    ready: "Workspace fondasi", readyDesc: "Siap dikembangkan dengan modul engineering", newProjectDesc: "Mulai desain PLTS baru",
    back: "Kembali ke Dasbor", placeholder: "Modul ini masih berupa placeholder. Fungsi engineering belum diimplementasikan.",
    roadmap: "Roadmap modul", roadmapDesc: "Tahap berikutnya akan menambahkan alat engineering yang berfungsi.",
  }
};

const moduleIcons = {
  dashboard: LayoutDashboard,
  projects: FolderOpen,
  layout: Grid2X2,
  layout3d: Box,
  electrical: Cable,
  cable: Cable,
  protection: ShieldCheck,
  structure: Layers3,
  cad: FileText,
  boq: ClipboardList,
  survey: ClipboardList,
  tray: Cable,
  breaker: Zap,
  mounting: Layers3,
  report: FileText,
  settings: Settings2,
};

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<
  "owner" | "engineer" | "viewer" | null
>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState("");
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(nextSession);
      if (!nextSession) { setWorkspaceId(null); setWorkspaceRole(null); setProjects([]);setActiveProject(null);
}
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      if (!supabase || !session?.user) return;
      setCloudLoading(true); setCloudError("");
      try {
        const { data: workspaces, error: workspaceError } = await supabase
          .from("workspaces").select("id,name,workspace_type,created_at")
          .order("created_at", { ascending: true });
        if (workspaceError) throw workspaceError;
        let workspace = workspaces?.find(w => w.workspace_type === "personal");
        if (!workspace) {
          const { data: createdId, error: createError } = await supabase.rpc("create_workspace", {
            p_name: "My Solar Workspace", p_type: "personal"
          });
          if (createError) throw createError;
          const { data: created, error: reloadError } = await supabase
          .from("workspaces")
         .select("id,name,workspace_type,created_at")
         .eq("id", createdId)
         .single();
          if (reloadError) throw reloadError;
          workspace = created;
        }
        
if (cancelled || !workspace) return;

// Ambil role pengguna dari tabel workspace_members
const { data: membership, error: membershipError } = await supabase
  .from("workspace_members")
  .select("role")
  .eq("workspace_id", workspace.id)
  .eq("user_id", session.user.id)
  .single();

if (membershipError) throw membershipError;

if (!["owner", "engineer", "viewer"].includes(membership.role)) {
  throw new Error("Invalid workspace role.");
}

if (cancelled) return;

setWorkspaceRole(
  membership.role as "owner" | "engineer" | "viewer"
);

setWorkspaceId(workspace.id);
setWorkspaceName(workspace.name);

        const { data, error } = await supabase.from("projects")
          .select("id,name,project_type,capacity_kwp,status,updated_at")
          .eq("workspace_id", workspace.id).order("updated_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setProjects((data ?? []).map((p: any) => ({
          id: p.id, name: p.name,
          type: p.project_type === "Rooftop" ? "Rooftop" : "Ground-mounted",
          capacity: Number(p.capacity_kwp ?? 0),
          status: p.status === "Completed" ? "Completed" : p.status === "In Progress" ? "In Progress" : "Planning",
          updated: new Date(p.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        })));
      } catch (error) {
        if (!cancelled) setCloudError(error instanceof Error ? error.message : "Could not load workspace.");
      } finally { if (!cancelled) setCloudLoading(false); }
    }
    loadWorkspace();
    return () => { cancelled = true; };
  }, [session?.user.id]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<Project["type"]>("Ground-mounted");
  const [projectCapacity, setProjectCapacity] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("My Solar Workspace");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState(workspaceName);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Welcome to Solar Apps", message: "Your engineering workspace is ready to use.", time: "Just now", read: false },
    { id: 2, title: "BOQ reminder", message: "Verify quantities and market prices before using a BOQ for procurement.", time: "Today", read: false },
    { id: 3, title: "Engineering review", message: "Validate preliminary engineering calculations before construction.", time: "Today", read: true },
  ]);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const t = copy[lang];
  const canCreateProject =
  workspaceRole === "owner" || workspaceRole === "engineer";

const canDeleteProject = workspaceRole === "owner";

  function saveWorkspaceName() {
    const nextName = workspaceDraft.trim();
    if (!nextName) return;
    setWorkspaceMenuOpen(false);
    setCloudError("Workspace rename is not connected yet. Ask the Owner to manage workspace settings.");
  }
  function markAllNotificationsRead() {
    setNotifications(old => old.map(n => ({ ...n, read: true })));
  }

  const navGroups = [
    { label: t.workspace, items: [{ id: "dashboard" as const, label: t.dashboard }, { id: "projects" as const, label: t.projects }] },
    { label: t.tools, items: [
     { id: "layout" as const, label: t.layout },
     { id: "layout3d" as const, label: "PV Layout 3D" },
     { id: "electrical" as const, label: t.electrical },
     { id: "cable" as const, label: "Cable Sizing" },
      { id: "protection" as const, label: lang === "id" ? "Proteksi & Grounding" : "Protection & Grounding" },
     { id: "structure" as const, label: t.structure }, { id: "cad" as const, label: t.cad }, { id: "boq" as const, label: t.boq },
      { id: "survey" as const, label: lang === "id" ? "Survey Report" : "Survey Report" },
      { id: "tray" as const, label: "Tray Sizing" },
      { id: "breaker" as const, label: "Breaker Sizing" },
      { id: "mounting" as const, label: lang === "id" ? "Desain Mounting" : "Mounting Design" },
      { id: "report" as const, label: lang === "id" ? "Laporan Engineering" : "Engineering Report" },
    ]},
  ];

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter(p => [p.name, p.type, p.status].some(v => v.toLowerCase().includes(q)));
  }, [projects, search]);

  const activeCapacity = projects.filter(p => p.status !== "Completed").reduce((sum, p) => sum + p.capacity, 0);
  const completedCount = projects.filter(p => p.status === "Completed").length;
  const pageNames: Record<ModuleId, string> = {
    dashboard: t.dashboard, projects: t.projects, layout: t.layout, layout3d: "PV Layout 3D", electrical: t.electrical, cable: "Cable Sizing", protection: lang === "id" ? "Proteksi & Grounding" : "Protection & Grounding",
    structure: t.structure, cad: t.cad, boq: t.boq,
    survey: "Survey Report", tray: "Tray Sizing", breaker: "Breaker Sizing",
    mounting: lang === "id" ? "Desain Mounting" : "Mounting Design",
    report: lang === "id" ? "Laporan Engineering" : "Engineering Report", settings: t.settings,
  };

  function openModule(id: ModuleId) { setActive(id); setMobileNav(false); }
  function openProject(project: Project, module: ModuleId = "layout") { setActiveProject(project); setActive(module); setMobileNav(false); }
 function deleteProject(project: Project) {
  const message = lang === "id"
    ? `Hapus proyek "${project.name}"? Tindakan ini tidak bisa dibatalkan.`
    : `Delete project "${project.name}"? This cannot be undone.`;

  if (!window.confirm(message)) return;
  if (!supabase) return;

  void (async () => {
    setCloudError("");

    const { data, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id)
      .select("id")
      .maybeSingle();

    if (error) {
      setCloudError(error.message);
      return;
    }

    if (!data) {
      setCloudError(
        lang === "id"
          ? "Penghapusan ditolak. Hanya Owner yang boleh menghapus proyek."
          : "Delete denied. Only the Owner can delete projects."
      );
      return;
    }

    setProjects(old =>
      old.filter(item => item.id !== data.id)
    );
  })();
}
  async function createProject() {
  if (!canCreateProject) {
    setCloudError("You do not have permission to create projects.");
    return;
  }

  const name = projectName.trim();
  const capacity = Number(projectCapacity);

  if (
    !name ||
    !workspaceId ||
    !supabase ||
    !Number.isFinite(capacity) ||
    capacity <= 0
  ) return;

  setCloudError("");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name,
      created_by: session?.user.id,
      project_type: projectType,
      capacity_kwp: capacity,
      status: "Planning"
    })
    .select("id,name,project_type,capacity_kwp,status,updated_at")
    .single();

  if (error) {
    setCloudError(error.message);
    return;
  }

  const created: Project = {
    id: data.id,
    name: data.name,
    type: data.project_type === "Rooftop" ? "Rooftop" : "Ground-mounted",
    capacity: Number(data.capacity_kwp ?? 0),
    status: "Planning",
    updated: new Date(data.updated_at).toLocaleDateString(
      lang === "id" ? "id-ID" : "en-GB",
      { day: "2-digit", month: "short", year: "numeric" }
    )
  };

  setProjects(prev => [created, ...prev]);
  setProjectName("");
  setProjectCapacity("");
  setModal(false);
  setActive("projects");
}

  const statusLabel = (status: Project["status"]) =>
    status === "Planning" ? t.planning : status === "In Progress" ? t.progress : t.completed;

  if (!supabaseConfigured || !supabase) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b100e", color: "#edf5ef", padding: 24 }}><section style={{ maxWidth: 560, padding: 28, border: "1px solid #34483c", borderRadius: 14, background: "#111a15" }}><h1>Supabase belum dikonfigurasi</h1><p>Buat file <code>.env</code> dari <code>.env.example</code>, lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY. Jangan gunakan service_role key di frontend.</p></section></main>;
  if (authLoading) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b100e", color: "#edf5ef" }}>Loading session…</main>;
  if (recoveryMode) return <AuthScreen recoveryMode onRecoveryComplete={() => setRecoveryMode(false)} />;
  if (!session) return <AuthScreen />;
  if (cloudLoading && !workspaceId) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b100e", color: "#edf5ef" }}>Loading your workspace…</main>;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Sun size={23} /></div>
        <div><div className="brand-name">SOLAR<span>APPS</span></div><div className="brand-sub">PV ENGINEERING STUDIO</div></div>
        <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close"><X size={18} /></button>
      </div>
      <div className="workspace-switch-wrap">
        <button className="workspace-switch" onClick={() => { setWorkspaceDraft(workspaceName); setWorkspaceMenuOpen(open => !open); }} aria-expanded={workspaceMenuOpen}>
          <div className="workspace-avatar">SE</div><div className="workspace-text"><strong>{workspaceName}</strong><span>Personal workspace · Supabase</span></div><ChevronDown size={15} />
        </button>
        {workspaceMenuOpen && <div className="workspace-popover">
          <strong>{lang === "id" ? "Pengaturan workspace" : "Workspace settings"}</strong>
          <label>{lang === "id" ? "Nama workspace" : "Workspace name"}
            <input value={workspaceDraft} maxLength={48} onChange={e => setWorkspaceDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveWorkspaceName(); }} />
          </label>
          <div className="popover-actions">
            <button onClick={() => setWorkspaceMenuOpen(false)}>{lang === "id" ? "Batal" : "Cancel"}</button>
            <button className="popover-save" onClick={saveWorkspaceName}>{lang === "id" ? "Simpan" : "Save"}</button>
          </div>
          <small>{lang === "id" ? "Tersimpan di browser ini saja, belum tersinkron antarperangkat." : "Saved in this browser only; not synced across devices."}</small>
        </div>}
      </div>
      <nav className="sidebar-nav">
        {navGroups.map(group => <div className="nav-group" key={group.label}>
          <div className="nav-heading">{group.label}</div>
          {group.items.map(item => {
            const Icon = moduleIcons[item.id];
            return <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => openModule(item.id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
              {item.id === "projects" && <span className="nav-count">{projects.length}</span>}
            </button>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="system-card"><div className="system-icon"><ShieldCheck size={17} /></div><div><strong>{t.ready}</strong><span>{t.readyDesc}</span></div></div>
        <button className={`nav-item ${active === "settings" ? "active" : ""}`} onClick={() => openModule("settings")}><Settings2 size={17} /><span>{t.settings}</span></button>
        <div className="sidebar-footer"><span>Solar Apps</span><span>v0.1.0</span></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Solar Apps</span><span className="crumb-sep">/</span><strong>{pageNames[active]}</strong></div>
        </div>
        <div className="topbar-actions">
          <label className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} /><kbd>⌘ K</kbd></label>
          <button className="language-button" onClick={() => setLang(lang === "en" ? "id" : "en")} title={t.language}><Globe size={16} /><span>{lang.toUpperCase()}</span></button>
          <div className="notification-wrap">
            <button className="icon-button notification-button" aria-label={t.notifications} aria-expanded={notificationOpen} onClick={() => setNotificationOpen(open => !open)}><Bell size={18} />{unreadNotifications > 0 && <i />}</button>
            {notificationOpen && <div className="notification-popover">
              <div className="notification-popover-head"><strong>{t.notifications}</strong><button onClick={markAllNotificationsRead}>{lang === "id" ? "Tandai dibaca" : "Mark all read"}</button></div>
              <div className="notification-list">
                {notifications.map(n => <div key={n.id} className={`notification-item ${n.read ? "is-read" : "is-unread"}`}>
                  <span className="notification-dot" />
                  <div><strong>{n.title}</strong><p>{n.message}</p><small>{n.time}</small></div>
                  {!n.read && <button aria-label={lang === "id" ? "Tandai dibaca" : "Mark as read"} title={lang === "id" ? "Tandai dibaca" : "Mark as read"} onClick={() => setNotifications(old => old.map(x => x.id === n.id ? { ...x, read: true } : x))}>✓</button>}
                </div>)}
              </div>
              <div className="notification-foot">{lang === "id" ? "Notifikasi demo lokal · belum terhubung ke Supabase." : "Local demo notifications · not connected to Supabase yet."}</div>
            </div>}
          </div>
          <button className="user-avatar" title={session.user.email || "Sign out"} onClick={() => { void supabase?.auth.signOut(); }}>↪</button>
        </div>
      </header>

      <div className="page-content">{cloudError && <div role="alert" style={{ marginBottom: 16, padding: 12, border: "1px solid #9a5b38", borderRadius: 8, color: "#ffd1ad" }}>{cloudError}</div>}
        {active === "dashboard" ? <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> ENGINEERING WORKSPACE</div><h1>{t.welcome}</h1><p>{t.subtitle}</p></div>
            {canCreateProject && (<button className="primary-button" onClick={() => setModal(true)}><Plus size={17} />{t.newProject}
  </button>)}
          </section>
          <section className="metric-grid">
            <MetricCard label={t.capacity} value={`${activeCapacity.toLocaleString()} kWp`} note="Planned & active capacity" icon={<Zap size={18} />} trend="Cloud data" />
            <MetricCard label={t.active} value={String(projects.filter(p => p.status !== "Completed").length).padStart(2, "0")} note="Projects in the pipeline" icon={<FolderOpen size={18} />} trend="Active" />
            <MetricCard label={t.modules} value="05" note="Engineering workspaces" icon={<Command size={18} />} trend="Core" />
            <MetricCard label={t.completion} value={projects.length ? `${Math.round(completedCount / projects.length * 100)}%` : "0%"} note="Projects completed" icon={<Gauge size={18} />} trend={`${completedCount} done`} />
          </section>
          <section className="content-grid">
            <div className="panel project-panel">
              <div className="panel-header"><div><h2>{t.recent}</h2><p>{t.overview}</p></div><button className="text-button" onClick={() => openModule("projects")}>{t.viewAll}<ArrowUpRight size={15} /></button></div>
              <div className="table-wrap"><table><thead><tr><th>{t.project}</th><th>{t.type}</th><th>{t.status}</th><th>{t.power}</th><th>{t.updated}</th><th>{t.action}</th></tr></thead>
                <tbody>{filteredProjects.length ? filteredProjects.map(p => <tr key={p.id}>
                  <td><div className="project-cell"><div className="project-file"><Sun size={17} /></div><div><strong>{p.name}</strong><span>PV-{String(p.id).slice(-4)}</span></div></div></td>
                  <td><span className="type-label">{p.type === "Rooftop" ? t.rooftop : t.ground}</span></td>
                  <td><span className={`status status-${p.status.toLowerCase().replace(" ", "-")}`}><i />{statusLabel(p.status)}</span></td>
                  <td className="capacity-cell">{p.capacity.toLocaleString()} kWp</td><td className="date-cell">{p.updated}</td>
                  <td><button className="open-button" onClick={() => openProject(p, "layout")}>{t.open}<ArrowDownRight size={13} /></button></td>
                </tr>) : <tr><td colSpan={6} className="empty-state">{t.empty}</td></tr>}</tbody>
              </table></div>
            </div>
            <div className="panel quick-panel"><div className="panel-header"><div><h2>{t.quick}</h2><p>{t.quickDesc}</p></div></div>
              <div className="quick-list">
                <QuickAction icon={<Grid2X2 size={18} />} title={t.layout} subtitle={t.newProjectDesc} onClick={() => openModule("layout")} />
                <QuickAction icon={<Cable size={18} />} title={t.strings} subtitle="DC sizing & inverter" onClick={() => openModule("electrical")} />
                <QuickAction icon={<Box size={18} />} title={t.structure} subtitle="Mounting & foundations" onClick={() => openModule("structure")} />
                <QuickAction icon={<ClipboardList size={18} />} title={t.materials} subtitle="BOQ & material summary" onClick={() => openModule("boq")} />
              </div><div className="quick-footer"><Activity size={16} /><span>Engineering modules are being built in stages.</span></div>
            </div>
          </section>
          <section className="bottom-grid">
            <div className="panel module-panel"><div className="panel-header"><div><h2>{t.modules}</h2><p>Explore your design environment</p></div></div>
              <div className="module-grid">
                {[
                  { id: "layout" as const, icon: <Grid2X2 />, title: t.layout, tag: "2D / 3D" },
                  { id: "electrical" as const, icon: <Cable />, title: t.electrical, tag: "DC / AC" },
                  { id: "structure" as const, icon: <Layers3 />, title: t.structure, tag: "Racking" },
                  { id: "cad" as const, icon: <FileText />, title: t.cad, tag: "DXF" },
                ].map(m => <button className="module-card" key={m.id} onClick={() => openModule(m.id)}><div className="module-icon">{m.icon}</div><strong>{m.title}</strong><span>{m.tag}</span></button>)}
              </div>
            </div>
            <div className="panel status-panel"><div className="panel-header"><div><h2>System Status</h2><p>Application foundation</p></div><span className="status status-planning"><i />Development</span></div>
              <SystemRow icon={<Database size={16} />} label="Project workspace" value={cloudLoading ? "Syncing…" : "Supabase connected"} />
              <SystemRow icon={<CloudSun size={16} />} label="Solar calculations" value="Local calculations" muted />
              <SystemRow icon={<FileText size={16} />} label="CAD export" value="Coming next" muted />
            </div>
          </section>
        </> : active === "projects" ? <section className="panel module-page">
          {canCreateProject && (
  <button className="primary-button" onClick={() => setModal(true)}>
    <Plus size={17} />{t.newProject}
  </button>
)}
          <div className="table-wrap"><table><thead><tr><th>{t.project}</th><th>{t.type}</th><th>{t.status}</th><th>{t.power}</th><th>{t.updated}</th><th>{lang === "id" ? "Aksi" : "Actions"}</th></tr></thead><tbody>
            {filteredProjects.map(p => <tr key={p.id}><td><button type="button" className="text-button project-open-link" onClick={() => openProject(p, "layout")}><strong>{p.name}</strong></button></td><td>{p.type === "Rooftop" ? t.rooftop : t.ground}</td><td><span className={`status status-${p.status.toLowerCase().replace(" ", "-")}`}><i />{statusLabel(p.status)}</span></td><td>{p.capacity.toLocaleString()} kWp</td><td>{p.updated}</td><td>
              <button type="button" className="open-button" onClick={() => openProject(p, "layout")}>{t.open}</button>{canDeleteProject && (
  <button
    type="button"
    className="icon-button project-delete-button"
    title={lang === "id" ? "Hapus proyek" : "Delete project"}
    aria-label={lang === "id" ? `Hapus proyek ${p.name}` : `Delete project ${p.name}`}
    onClick={() => deleteProject(p)}
  >
    <Trash2 size={15} />
  </button>
)}</td></tr>)}
            {!filteredProjects.length && <tr><td colSpan={6} className="empty-state">{t.empty}</td></tr>}
          </tbody></table></div>
        </section> 
     
        : active === "layout" ? <PVLayout key={activeProject?.id ?? "unassigned"} lang={lang} userId={session.user.id} projectId={activeProject?.id ?? null} projectName={activeProject?.name ?? null} projectType={activeProject?.type ?? null} />
        : active === "layout3d" ? <PVLayout3D key={activeProject?.id ?? "unassigned"} lang={lang} userId={session.user.id} projectId={activeProject?.id ?? null} projectName={activeProject?.name ?? null} />
        
        : active === "electrical" ? (
          <>
            <StringCalculator lang={lang} />
            <div style={{ marginTop: 32, borderTop: "1px solid var(--border, #374151)", paddingTop: 24 }}>
              <InverterConfiguration lang={lang} />
            </div>
          </>
        )

        : active === "cable" ? <CableSizing lang={lang} />
        : active === "protection" ? <ProtectionGrounding lang={lang} />
        : active === "structure" ? <StructuralDesign lang={lang} />
        : active === "cad" ? <CADDrawings lang={lang} />
        : active === "boq" ? <BOQ lang={lang} userId={session.user.id} />
        : active === "tray" ? <TraySizing lang={lang} />
        : active === "breaker" ? <BreakerSizing lang={lang} />
        : active === "mounting" ? <MountingDesign lang={lang} />
        : active === "survey" ? <SurveyReport lang={lang} />
        : active === "report" ? <EngineeringReport lang={lang} />
        : active === "settings" ? (
          <section className="panel module-page">
            <h2>{t.settings}</h2>
            <p>{t.language}</p>
            <button
              className="secondary-button"
              onClick={() => setLang(lang === "en" ? "id" : "en")}
            >
              <Globe size={16} />
              {lang === "en" ? "English" : "Bahasa Indonesia"}
            </button>
            <p className="muted-value">Theme: Dark · Workspace: Local demo</p>
          </section>
        )
        : <ModulePlaceholder
            id={active}
            title={pageNames[active]}
            lang={lang}
            onBack={() => openModule("dashboard")}
          />}
      </div>
<footer className="app-footer"><span>© 2026 Solar Apps <span className="footer-sep">·</span> PV Engineering Studio</span><span><span className="footer-dot" /> Local workspace <span className="footer-sep">·</span> v0.1.0</span></footer>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}>
      <form className="modal-card" onSubmit={e => { e.preventDefault(); createProject(); }}>
        <div className="modal-heading"><div><div className="modal-icon"><Sun size={21} /></div><h2>{t.createTitle}</h2><p>{t.newProjectDesc}</p></div><button type="button" className="icon-button" onClick={() => setModal(false)} aria-label="Close"><X size={18} /></button></div>
        <label className="form-label">{t.projectName}<input autoFocus required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={t.namePlaceholder} /></label>
        <label className="form-label">{t.projectType}<select value={projectType} onChange={e => setProjectType(e.target.value as Project["type"])}><option value="Ground-mounted">Ground-mounted / Lahan</option><option value="Rooftop">Rooftop / Atap</option></select></label>
        <label className="form-label">{t.capacityKwp}<input type="number" required min="0.001" step="0.001" value={projectCapacity} onChange={e => setProjectCapacity(e.target.value)} placeholder="e.g. 100" /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(false)}>{t.cancel}</button><button className="primary-button" type="submit"><Plus size={16} />{t.create}</button></div>
      </form>
    </div>}
  </div>;
}

function MetricCard({ label, value, note, icon, trend }: { label: string; value: string; note: string; icon: React.ReactNode; trend: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon">{icon}</div></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{note}</span><span className="trend-neutral">{trend}</span></div></div>;
}
function QuickAction({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><div className="quick-icon">{icon}</div><div className="quick-copy"><strong>{title}</strong><span>{subtitle}</span></div><ArrowUpRight className="quick-arrow" size={16} /></button>;
}
function SystemRow({ icon, label, value, muted = false }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return <div className="system-row"><span>{icon}{label}</span><strong className={muted ? "muted-value" : ""}>{value}</strong></div>;
}
function ModulePlaceholder({ id, title, lang, onBack }: { id: ModuleId; title: string; lang: Lang; onBack: () => void }) {
  const descriptions: Record<ModuleId, [string, string]> = {
    layout3d: ["3D visualization of the PV layout.", "Visualisasi 3D layout PV."],
    dashboard: ["Engineering dashboard.", "Dasbor engineering."],
    projects: ["Manage your projects.", "Kelola proyek."],
    layout: ["Interactive PV array layout will be implemented here.", "Editor layout array PV interaktif akan dibuat di sini."],
    electrical: ["String sizing and inverter configuration.", "Perhitungan string dan konfigurasi inverter."],
    cable: ["DC and AC cable sizing calculations.", "Perhitungan ukuran kabel DC dan AC."],
    protection: ["Preliminary protection and grounding checks.", "Pemeriksaan awal proteksi dan grounding."],
    structure: ["Mounting geometry, supports and foundation design.", "Geometri mounting, penyangga, dan desain fondasi."],
    cad: ["Technical drawings and DXF export workspace.", "Workspace gambar teknik dan ekspor DXF."],
    boq: ["Engineering quantities and material cost breakdown.", "Kuantitas engineering dan rincian biaya material."],
    survey: ["Site survey notes, photos, conditions and findings.", "Catatan survey lokasi, foto, kondisi dan temuan."],
    tray: ["Cable tray fill and width screening for DC, AC and PE cables.", "Pemeriksaan pengisian dan lebar tray untuk kabel DC, AC dan grounding."],
    breaker: ["Preliminary AC/DC breaker current and interrupting-capacity screening.", "Pemeriksaan awal arus breaker AC/DC dan kapasitas pemutusan."],
    mounting: ["PV rail, clamp, support and mounting material estimator.", "Estimasi rail, clamp, support dan material mounting PV."],
    report: ["Project engineering summary and printable report.", "Ringkasan engineering proyek dan laporan siap cetak."],
    settings: ["Application settings.", "Pengaturan aplikasi."],
  };
  const iconMap = {
    layout3d: <Box size={26} />,
    dashboard: <Grid2X2 size={26} />, projects: <FolderOpen size={26} />, layout: <Grid2X2 size={26} />,
    electrical: <Cable size={26} />, cable: <Cable size={26} />, protection: <ShieldCheck size={26} />, structure: <Layers3 size={26} />, cad: <FileText size={26} />,
    boq: <ClipboardList size={26} />, survey: <ClipboardList size={26} />, tray: <Cable size={26} />,
    breaker: <Zap size={26} />, mounting: <Layers3 size={26} />, report: <FileText size={26} />, settings: <Settings2 size={26} />,
  };
  const [en, idText] = descriptions[id];
  return <section className="module-workspace">
    <div className="module-page-heading"><div><span className="eyebrow">ENGINEERING MODULE</span><h1>{title}</h1></div><span className="status status-planning"><i />Foundation</span></div>
    <div className="canvas-panel"><div className="canvas-toolbar"><span><Command size={15} />{title}</span><div><span>100%</span><span>·</span><span>Metric (mm)</span></div></div>
      <div className="canvas-empty"><div className="canvas-illustration">{iconMap[id]}</div><h2>{title}</h2><p>{lang === "en" ? en : idText}</p><p className="canvas-note">{copy[lang].placeholder}</p><button className="secondary-button" onClick={onBack}><LayoutDashboard size={16} />{copy[lang].back}</button></div>
      <div className="canvas-status"><span><span className="footer-dot" /> Ready</span><span>{lang === "en" ? "No unsaved changes" : "Tidak ada perubahan tersimpan"}</span></div>
    </div>
    <div className="panel module-info"><CircleHelp size={18} /><div><strong>{copy[lang].roadmap}</strong><p>{copy[lang].roadmapDesc}</p></div></div>
  </section>;
}
