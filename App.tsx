import React, { useState, useEffect, useContext, createContext, ReactNode, useRef, useMemo } from 'react';
import { 
  Terminal as TerminalIcon, 
  LayoutDashboard, 
  LogOut, 
  Command, 
  Activity, 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  Server, 
  HardDrive, 
  Menu, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  FileText, 
  ChevronRight, 
  Folder, 
  MoreVertical, 
  Download, 
  Edit3, 
  FolderPlus, 
  ArrowLeft, 
  MoveHorizontal,
  ShieldCheck,
  Globe,
  List,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Cpu,
  Lock,
  Search,
  Settings,
  Palette,
  Link,
  Laptop,
  Loader2,
  Info,
  Cloud,
  Upload,
  RefreshCw,
  Image,
  File,
  ExternalLink,
  Eye
} from 'lucide-react';

// --- TYPES & INTERFACES ---

type VFSNode = {
  type: 'file';
  content: string;
} | {
  type: 'dir';
  content: Record<string, VFSNode>;
};

interface VFSContextType {
  fs: Record<string, VFSNode>;
  cd: (path: string) => string | null;
  pwd: () => string;
  ls: (path?: string) => string[] | null;
  mkdir: (path: string, p?: boolean) => boolean;
  touch: (path: string) => boolean;
  rm: (path: string, rf?: boolean) => boolean;
  cat: (path: string) => string | null;
  writeFile: (path: string, content: string) => boolean;
  rename: (path: string, newName: string) => boolean;
  move: (oldPath: string, newDestDir: string) => boolean;
  currentPath: string[];
}

interface Project {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'building';
  language: string;
  port: number;
  cpuUsage: number;
  ramUsage: number;
  cpuHistory: number[];
  ramHistory: number[];
}

interface CloudFile {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  mime_type: string;
  media_details?: {
    sizes?: {
      thumbnail?: { source_url: string };
      medium?: { source_url: string };
    };
  };
  source_url: string;
}

interface CloudContextType {
  config: { wpUrl: string; wpUser: string; wpPass: string } | null;
  cloudFiles: CloudFile[];
  isConnected: boolean;
  isLoading: boolean;
  connect: (url: string, user: string, pass: string) => Promise<boolean>;
  disconnect: () => void;
  fetchFiles: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (id: number) => Promise<void>;
  downloadToVFS: (file: CloudFile) => Promise<void>;
}

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string, language: string) => void;
  deleteProject: (id: string) => void;
  toggleProjectStatus: (id: string) => void;
}

interface AuthContextType {
  token: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SettingsContextType {
  apiEndpoint: string;
  accentColor: string;
  setApiEndpoint: (url: string) => void;
  setAccentColor: (color: string) => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
}

interface EditorContextType {
  editingFile: { name: string; content: string } | null;
  openEditor: (name: string, content: string) => void;
  closeEditor: () => void;
}

type ToastType = 'success' | 'error' | 'info' | 'loading';
interface Toast { id: string; message: string; type: ToastType; duration?: number; }

interface ToastContextType {
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// --- CONSTANTS ---

const INITIAL_VFS: Record<string, VFSNode> = {
  home: { 
    type: 'dir', 
    content: { 
      admin: { 
        type: 'dir', 
        content: { 
          'welcome.txt': { type: 'file', content: 'Welcome to DevCloud OS Mobile IDE.\nPersistence: Active\nVFS: Ready' },
          'config.js': { type: 'file', content: 'export const config = {\n  theme: "industrial",\n  version: "2.6.0"\n};' }
        } 
      } 
    } 
  },
  bin: { type: 'dir', content: {} },
  etc: { type: 'dir', content: {} }
};

// --- CONTEXTS ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const VFSContext = createContext<VFSContextType | undefined>(undefined);
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const ToastContext = createContext<ToastContextType | undefined>(undefined);
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
const EditorContext = createContext<EditorContextType | undefined>(undefined);
const CloudContext = createContext<CloudContextType | undefined>(undefined);

// --- PROVIDERS ---

const Toaster = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-20 right-4 left-4 md:left-auto md:bottom-10 z-[200] flex flex-col gap-2 pointer-events-none items-end">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto glass-modal flex items-center gap-3 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 md:slide-in-from-right duration-300 w-full md:w-[360px] border border-white/10 backdrop-blur-xl bg-[#0B0C0E]/90">
          <div className="shrink-0">
            {t.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
            {t.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
            {t.type === 'info' && <Info className="text-blue-500" size={20} />}
            {t.type === 'loading' && <Loader2 className="text-brand-accent animate-spin" size={20} />}
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-white truncate leading-tight">{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} className="shrink-0 p-1 text-text-sec hover:text-white transition-colors rounded-lg active:bg-white/10">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const ToastProvider = ({ children }: { children?: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), duration);
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const SettingsProvider = ({ children }: { children?: ReactNode }) => {
  const [apiEndpoint, setApiEndpointState] = useState(localStorage.getItem('dc_settings_api') || 'https://api.devcloud.local');
  const [accentColor, setAccentColorState] = useState(localStorage.getItem('dc_settings_color') || '#3b82f6');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('dc_settings_color', color);
  };

  const setApiEndpoint = (url: string) => {
    setApiEndpointState(url);
    localStorage.setItem('dc_settings_api', url);
  };

  const toggleSettings = () => setIsSettingsOpen(prev => !prev);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-accent', accentColor);
  }, [accentColor]);

  return (
    <SettingsContext.Provider value={{ apiEndpoint, accentColor, setApiEndpoint, setAccentColor, isSettingsOpen, toggleSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

const EditorProvider = ({ children }: { children?: ReactNode }) => {
  const [editingFile, setEditingFile] = useState<{ name: string, content: string } | null>(null);

  const openEditor = (name: string, content: string) => {
    setEditingFile({ name, content });
  };

  const closeEditor = () => {
    setEditingFile(null);
  };

  return (
    <EditorContext.Provider value={{ editingFile, openEditor, closeEditor }}>
      {children}
    </EditorContext.Provider>
  );
};

const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('dc_token'));
  const [isLoading, setIsLoading] = useState(false);
  const login = async (pass: string) => {
    if (pass === 'admin123') {
      localStorage.setItem('dc_token', 'v2_active');
      setToken('v2_active');
      return true;
    }
    return false;
  };
  const logout = () => { localStorage.removeItem('dc_token'); setToken(null); };
  return <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token, isLoading }}>{children}</AuthContext.Provider>;
};

const ProjectProvider = ({ children }: { children?: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('dc_projects');
    return saved ? JSON.parse(saved) : [{ 
      id: '1', name: 'core-api', status: 'running', language: 'Node.js', 
      port: 3000, cpuUsage: 12, ramUsage: 45, cpuHistory: [], ramHistory: [] 
    }];
  });

  useEffect(() => localStorage.setItem('dc_projects', JSON.stringify(projects)), [projects]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prev => prev.map(p => {
        if (p.status === 'running') {
          const cpu = Math.max(5, Math.min(95, p.cpuUsage + (Math.random() * 10 - 5)));
          const ram = Math.max(10, Math.min(90, p.ramUsage + (Math.random() * 5 - 2.5)));
          return { ...p, cpuUsage: cpu, ramUsage: ram };
        }
        return { ...p, cpuUsage: 0, ramUsage: 0 };
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const addProject = (name: string, language: string) => {
    setProjects(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: name.toLowerCase().replace(/\s+/g, '-'),
      status: 'stopped',
      language,
      port: Math.floor(Math.random() * 5000 + 3000),
      cpuUsage: 0, ramUsage: 0, cpuHistory: [], ramHistory: []
    }]);
  };

  const deleteProject = (id: string) => setProjects(prev => prev.filter(p => p.id !== id));
  const toggleProjectStatus = (id: string) => setProjects(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'running' ? 'stopped' : 'running' } : p));

  return <ProjectContext.Provider value={{ projects, addProject, deleteProject, toggleProjectStatus }}>{children}</ProjectContext.Provider>;
};

const VFSProvider = ({ children }: { children?: ReactNode }) => {
  const [fs, setFs] = useState<Record<string, VFSNode>>(() => {
    const saved = localStorage.getItem('dc_vfs_v3');
    return saved ? JSON.parse(saved) : INITIAL_VFS;
  });
  const [currentPath, setCurrentPath] = useState(['home', 'admin']);

  useEffect(() => localStorage.setItem('dc_vfs_v3', JSON.stringify(fs)), [fs]);

  const resolvePath = (path: string) => {
    if (path === '/') return [];
    let target = path.startsWith('/') ? [] : [...currentPath];
    const segments = path.split('/').filter(s => s && s !== '.');
    for (const s of segments) {
      if (s === '..') target.pop();
      else target.push(s);
    }
    return target;
  };

  const getNode = (pathArr: string[]): VFSNode | null => {
    if (pathArr.length === 0) return { type: 'dir', content: fs };
    let curr: any = { type: 'dir', content: fs };
    for (const segment of pathArr) {
      if (curr?.type === 'dir' && curr.content[segment]) curr = curr.content[segment];
      else return null;
    }
    return curr;
  };

  const ls = (path?: string) => {
    const node = getNode(path ? resolvePath(path) : currentPath);
    return node?.type === 'dir' ? Object.keys(node.content) : null;
  };

  const cd = (path: string) => {
    const target = resolvePath(path);
    if (getNode(target)?.type === 'dir') {
      setCurrentPath(target);
      return target.join('/');
    }
    return null;
  };

  const mkdir = (path: string, p = false) => {
    const target = resolvePath(path);
    const name = target.pop();
    if (!name) return false;
    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (const seg of target) {
        if (!curr[seg] && p) curr[seg] = { type: 'dir', content: {} };
        if (!curr[seg]) return prev;
        curr = curr[seg].content;
      }
      curr[name] = { type: 'dir', content: {} };
      return next;
    });
    return true;
  };

  const touch = (path: string) => {
    const target = resolvePath(path);
    const name = target.pop();
    if (!name) return false;
    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (const seg of target) {
        if (!curr[seg]) return prev;
        curr = curr[seg].content;
      }
      if (curr[name]) return prev;
      curr[name] = { type: 'file', content: '' };
      return next;
    });
    return true;
  };

  const rm = (path: string, rf = false) => {
    const target = resolvePath(path);
    const name = target.pop();
    if (!name) return false;

    const parent = getNode(target);
    if (!parent || parent.type !== 'dir' || !parent.content[name]) return false;
    const node = parent.content[name];
    if (node.type === 'dir' && !rf) return false;

    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (const seg of target) {
        if (!curr[seg]) return prev;
        curr = curr[seg].content;
      }
      delete curr[name];
      return next;
    });
    return true;
  };

  const cat = (path: string) => {
    const node = getNode(resolvePath(path));
    return node?.type === 'file' ? node.content : null;
  };

  const writeFile = (path: string, content: string) => {
    const target = resolvePath(path);
    const name = target.pop();
    if (!name) return false;
    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (const seg of target) {
        if (!curr[seg]) return prev;
        curr = curr[seg].content;
      }
      curr[name] = { type: 'file', content };
      return next;
    });
    return true;
  };

  const rename = (path: string, newName: string) => {
    const target = resolvePath(path);
    const oldName = target.pop();
    if (!oldName) return false;
    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let curr = next;
      for (const seg of target) {
        if (!curr[seg]) return prev;
        curr = curr[seg].content;
      }
      if (curr[oldName]) {
        curr[newName] = curr[oldName];
        delete curr[oldName];
      }
      return next;
    });
    return true;
  };

  const move = (oldPath: string, newDest: string) => {
    const src = resolvePath(oldPath);
    const fileName = src.pop();
    if (!fileName) return false;

    const srcParent = getNode(src);
    if (!srcParent || srcParent.type !== 'dir' || !srcParent.content[fileName]) return false;

    const dest = resolvePath(newDest);
    const destNode = getNode(dest);

    let targetDir: string[] = [];
    let newName = fileName;

    if (destNode && destNode.type === 'dir') {
      targetDir = dest;
    } else {
      newName = dest.pop() || fileName;
      targetDir = dest;
      const destParent = getNode(targetDir);
      if (!destParent || destParent.type !== 'dir') return false;
    }

    setFs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let s = next; 
      for (const seg of src) { if(!s[seg]) return prev; s = s[seg].content; }
      if (!s[fileName]) return prev;
      const fileNode = s[fileName];

      let d = next; 
      for (const seg of targetDir) { if(!d[seg]) return prev; d = d[seg].content; }
      delete s[fileName];
      d[newName] = fileNode;
      return next;
    });
    return true;
  };

  return <VFSContext.Provider value={{ fs, cd, pwd: () => '/' + currentPath.join('/'), ls, mkdir, touch, rm, cat, writeFile, rename, move, currentPath }}>{children}</VFSContext.Provider>;
};

const CloudProvider = ({ children }: { children?: ReactNode }) => {
  const { addToast } = useToast();
  const { writeFile } = useVFS();
  const [config, setConfig] = useState<{ wpUrl: string; wpUser: string; wpPass: string } | null>(() => {
    const saved = localStorage.getItem('dc_cloud_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (config) {
      checkConnection();
    }
  }, []);

  const getHeaders = (u: string, p: string) => ({
    'Authorization': 'Basic ' + btoa(`${u}:${p}`)
  });

  const checkConnection = async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${config.wpUrl}/wp-json/wp/v2/users/me`, {
        headers: getHeaders(config.wpUser, config.wpPass)
      });
      if (res.ok) {
        setIsConnected(true);
        fetchFiles(config);
      } else {
        setIsConnected(false);
        if (res.status === 401) addToast('WP Auth zlyhalo. Skontrolujte heslo aplikácie.', 'error');
      }
    } catch (e) {
      setIsConnected(false);
      addToast('Nepodarilo sa pripojiť k WP cloudu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async (url: string, user: string, pass: string) => {
    // Normalize URL (remove trailing slash)
    const normalizedUrl = url.replace(/\/$/, '');
    setIsLoading(true);
    try {
      const res = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
        headers: getHeaders(user, pass)
      });
      if (res.ok) {
        const newConfig = { wpUrl: normalizedUrl, wpUser: user, wpPass: pass };
        setConfig(newConfig);
        localStorage.setItem('dc_cloud_config', JSON.stringify(newConfig));
        setIsConnected(true);
        addToast('Cloud pripojený úspešne', 'success');
        fetchFiles(newConfig);
        return true;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (e) {
      addToast('Chyba pripojenia. Skontrolujte URL a CORS.', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setConfig(null);
    localStorage.removeItem('dc_cloud_config');
    setIsConnected(false);
    setCloudFiles([]);
    addToast('Cloud odpojený', 'info');
  };

  const fetchFiles = async (cfg = config) => {
    if (!cfg) return;
    try {
      const res = await fetch(`${cfg.wpUrl}/wp-json/wp/v2/media?per_page=50`, {
        headers: getHeaders(cfg.wpUser, cfg.wpPass)
      });
      if (res.ok) {
        const data = await res.json();
        setCloudFiles(data);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
  };

  const uploadFile = async (file: File) => {
    if (!config) return;
    const formData = new FormData();
    formData.append('file', file);
    
    addToast('Nahrávam súbor...', 'loading');
    try {
      const res = await fetch(`${config.wpUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${config.wpUser}:${config.wpPass}`),
          'Content-Disposition': `attachment; filename="${file.name}"`
        },
        body: formData
      });
      
      if (res.ok) {
        addToast('Súbor nahraný', 'success');
        fetchFiles();
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
      addToast('Chyba pri nahrávaní', 'error');
    }
  };

  const deleteFile = async (id: number) => {
    if (!config) return;
    if (!confirm('Naozaj vymazať z cloudu?')) return;
    
    try {
      const res = await fetch(`${config.wpUrl}/wp-json/wp/v2/media/${id}?force=true`, {
        method: 'DELETE',
        headers: getHeaders(config.wpUser, config.wpPass)
      });
      if (res.ok) {
        addToast('Súbor vymazaný', 'info');
        setCloudFiles(prev => prev.filter(f => f.id !== id));
      }
    } catch (e) {
      addToast('Chyba pri mazaní', 'error');
    }
  };

  const downloadToVFS = async (file: CloudFile) => {
    addToast('Sťahujem do VFS...', 'loading');
    try {
      const res = await fetch(file.source_url);
      const blob = await res.blob();
      
      // Convert blob to base64/string for VFS storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Use filename from URL or title
        const filename = file.source_url.split('/').pop() || `cloud-file-${file.id}.dat`;
        writeFile(filename, base64data);
        addToast(`Uložené ako ${filename}`, 'success');
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      addToast('Chyba pri sťahovaní', 'error');
    }
  };

  return (
    <CloudContext.Provider value={{ config, cloudFiles, isConnected, isLoading, connect, disconnect, fetchFiles: () => fetchFiles(), uploadFile, deleteFile, downloadToVFS }}>
      {children}
    </CloudContext.Provider>
  );
};

// --- HOOKS ---

const useAuth = () => useContext(AuthContext)!;
const useVFS = () => useContext(VFSContext)!;
const useProjects = () => useContext(ProjectContext)!;
const useToast = () => useContext(ToastContext)!;
const useSettings = () => useContext(SettingsContext)!;
const useEditor = () => useContext(EditorContext)!;
const useCloud = () => useContext(CloudContext)!;

// --- UTILS ---

const haptic = (ms = 10) => { if (window.navigator.vibrate) window.navigator.vibrate(ms); };

// --- COMPONENTS ---

const GlobalStyles = () => (
  <style>{`
    :root { --bg-root: #000000; --bg-surface: #0B0C0E; --brand-accent: #3b82f6; --text-sec: #888888; }
    * { -webkit-tap-highlight-color: transparent; outline: none !important; }
    .glass-modal { background: rgba(11, 12, 14, 0.95); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); }
    .glass-panel { background: rgba(11, 12, 14, 0.6); backdrop-filter: blur(12px); border-top: 1px solid rgba(255,255,255,0.08); }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .symbol-btn { min-width: 48px; height: 48px; display: flex; items-center justify-center font-mono text-lg text-text-sec active:bg-white/10 active:text-white transition-colors border-r border-white/5; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    input, textarea { font-size: 16px !important; } /* IOS ZOOM FIX */
    .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 8px; }
  `}</style>
);

const MetricCard = ({ label, value, color, icon: Icon }: any) => (
  <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative overflow-hidden group">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-text-sec">
        <Icon size={16} />
        <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xl font-mono text-white font-bold">{Math.round(value)}%</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div className="h-full transition-all duration-500 ease-out" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

// --- MODALS ---

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const { apiEndpoint, accentColor, setApiEndpoint, setAccentColor } = useSettings();
  const { connect, disconnect, isConnected, config } = useCloud();
  const [tab, setTab] = useState<'general' | 'cloud'>('general');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    if (config) {
      setWpUrl(config.wpUrl);
      setWpUser(config.wpUser);
      setWpPass(config.wpPass);
    }
  }, [config]);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-modal rounded-[32px] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent"><Settings size={20}/></div>
            <h3 className="text-xl font-bold text-white">Nastavenia</h3>
          </div>
          <button onClick={onClose} className="p-2 text-text-sec hover:text-white rounded-full active:bg-white/10"><X size={20}/></button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/5 pb-2">
          <button onClick={() => setTab('general')} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'general' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-text-sec'}`}>General</button>
          <button onClick={() => setTab('cloud')} className={`pb-2 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'cloud' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-text-sec'}`}>Cloud</button>
        </div>

        {tab === 'general' ? (
          <div className="space-y-6">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-sec mb-3 block flex items-center gap-2"><Palette size={12}/> Akcentná Farba</label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {colors.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setAccentColor(c)}
                    className={`h-10 rounded-xl transition-all ${accentColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-50 hover:opacity-100'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-sec mb-3 block flex items-center gap-2"><Link size={12}/> API Endpoint</label>
              <input 
                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-brand-accent transition-all font-mono" 
                value={apiEndpoint} 
                onChange={e => setApiEndpoint(e.target.value)}
                placeholder="https://api..." 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl flex items-center gap-3 ${isConnected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {isConnected ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
              <span className="text-xs font-bold uppercase">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-sec mb-2 block">WordPress URL</label>
              <input className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none" value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://mysite.com" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-sec mb-2 block">Username</label>
              <input className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none" value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-sec mb-2 block">App Password</label>
              <input type="password" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none" value={wpPass} onChange={e => setWpPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
            </div>
            {isConnected ? (
              <button onClick={disconnect} className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold uppercase hover:bg-red-500/20">Odpojiť</button>
            ) : (
              <button onClick={() => connect(wpUrl, wpUser, wpPass)} className="w-full py-3 bg-brand-accent text-white rounded-xl text-xs font-bold uppercase">Pripojiť</button>
            )}
            <p className="text-[9px] text-text-sec mt-2">Použite "Application Passwords" v profile používateľa vo WP.</p>
          </div>
        )}

        {tab === 'general' && (
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <button onClick={onClose} className="px-6 py-3 bg-brand-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform">Uložiť</button>
          </div>
        )}
      </div>
    </div>
  );
};

const MobileEditor = () => {
  const { editingFile, closeEditor } = useEditor();
  const { writeFile } = useVFS();
  const { addToast } = useToast();
  
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingFile) {
      setContent(editingFile.content);
      setIsDirty(false);
    }
  }, [editingFile]);

  useEffect(() => {
    const timer = setTimeout(() => { 
      if (isDirty && editingFile) { 
        writeFile(editingFile.name, content); 
        setIsDirty(false); 
      } 
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, isDirty, editingFile, writeFile]);

  const handleSave = () => {
    if (editingFile) {
      writeFile(editingFile.name, content);
      addToast('Súbor uložený', 'success');
      closeEditor();
    }
  };

  const insert = (sym: string) => {
    haptic(5);
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const next = content.substring(0, start) + sym + content.substring(el.selectionEnd);
    setContent(next);
    setIsDirty(true);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + sym.length, start + sym.length); }, 0);
  };

  const symbols = ['{', '}', '[', ']', '(', ')', ';', '/', '>', '_', '|', ':', '"', "'", '=', '+', '-', '*', '&', '?', '!', '$', '#', '@'];

  if (!editingFile) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-root flex flex-col animate-slide-up">
      <div className="h-14 shrink-0 bg-surface border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={closeEditor} className="p-2 -ml-2 text-text-sec active:text-white"><ArrowLeft size={20}/></button>
          <div className="flex items-center gap-2 truncate">
            <span className="p-1 rounded bg-white/10 text-[10px] font-mono text-text-sec">CLI</span>
            <span className="font-mono text-sm font-bold truncate text-white">{editingFile.name}</span>
          </div>
          {isDirty && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shrink-0" />}
        </div>
        <button onClick={handleSave} className="px-4 py-2 bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase rounded-xl">Hotovo</button>
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <textarea ref={textareaRef} className="flex-1 w-full bg-transparent p-4 font-mono text-[16px] leading-relaxed text-white outline-none resize-none" value={content} onChange={e => { setContent(e.target.value); setIsDirty(true); }} spellCheck={false} autoFocus />
        <div className="h-12 shrink-0 bg-surface border-t border-white/5 flex overflow-x-auto no-scrollbar pb-safe">
          {symbols.map(s => <button key={s} onClick={() => insert(s)} className="symbol-btn">{s}</button>)}
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---

const Header = ({ currentView, setView, onMenuClick }: { currentView: string, setView: (v: string) => void, onMenuClick: () => void }) => {
  const { logout } = useAuth();
  const { toggleSettings } = useSettings();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-root/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-text-sec active:text-white"><Menu size={20}/></button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <Command size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tighter text-white hidden sm:block">DEVCLOUD</span>
        </div>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex p-1 bg-white/5 border border-white/10 rounded-2xl">
        {['panel', 'files', 'term', 'cloud'].map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${currentView === v ? 'bg-white text-black shadow-lg' : 'text-text-sec active:text-white'}`}>{v}</button>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <button onClick={toggleSettings} className="p-2 text-text-sec active:text-brand-accent transition-colors"><Settings size={18} /></button>
        <button onClick={logout} className="p-2 text-text-sec active:text-red-500 transition-colors"><LogOut size={18} /></button>
      </div>
    </header>
  );
};

const BottomNav = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0C0E]/90 backdrop-blur-xl border-t border-white/5 pb-safe">
    <div className="flex items-center justify-around h-16">
      <button onClick={() => setView('panel')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'panel' ? 'text-brand-accent' : 'text-text-sec'}`}>
        <LayoutDashboard size={20} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Panel</span>
      </button>
      <button onClick={() => setView('files')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'files' ? 'text-brand-accent' : 'text-text-sec'}`}>
        <Folder size={20} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Súbory</span>
      </button>
      <button onClick={() => setView('term')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'term' ? 'text-brand-accent' : 'text-text-sec'}`}>
        <TerminalIcon size={20} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Term</span>
      </button>
      <button onClick={() => setView('cloud')} className={`flex flex-col items-center gap-1 p-2 transition-colors ${currentView === 'cloud' ? 'text-brand-accent' : 'text-text-sec'}`}>
        <Cloud size={20} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Cloud</span>
      </button>
    </div>
  </nav>
);

const CloudView = () => {
  const { isConnected, cloudFiles, uploadFile, deleteFile, fetchFiles, isLoading, downloadToVFS } = useCloud();
  const { toggleSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 animate-pulse">
          <Cloud size={40} className="text-text-sec" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Cloud Disconnected</h2>
        <p className="text-text-sec text-xs mb-8 max-w-xs leading-relaxed">
          Prepojte DevCloud s WordPress Media Library pre trvalé úložisko súborov a assetov.
        </p>
        <button onClick={toggleSettings} className="px-8 py-4 bg-brand-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-transform">
          Pripojiť
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Cloud Toolbar */}
      <div className="h-14 shrink-0 bg-surface/50 border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-brand-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">WP Storage</span>
          <span className="bg-white/10 text-text-sec px-1.5 py-0.5 rounded text-[10px] font-mono">{cloudFiles.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchFiles()} className={`p-2 rounded-xl bg-white/5 text-text-sec hover:text-white ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-brand-accent/10 text-brand-accent rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent/20 transition-colors">
            <Upload size={14} /> Upload
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Cloud Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && cloudFiles.length === 0 ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-brand-accent" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {cloudFiles.map(file => (
              <div key={file.id} className="group relative aspect-square rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-white/20 transition-all">
                {file.media_details?.sizes?.thumbnail ? (
                  <img src={file.media_details.sizes.thumbnail.source_url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-text-sec"><File size={32} /></div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                   <div className="text-[10px] text-white font-medium truncate">{file.title.rendered || 'Untitled'}</div>
                   <div className="flex justify-end gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(file.source_url); addToast('URL skopírovaná', 'success'); }} className="p-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20"><Link size={12}/></button>
                      <button onClick={() => downloadToVFS(file)} className="p-1.5 bg-brand-accent/20 text-brand-accent rounded-lg hover:bg-brand-accent/30"><Download size={12}/></button>
                      <button onClick={() => deleteFile(file.id)} className="p-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"><Trash2 size={12}/></button>
                   </div>
                </div>
                
                {/* Type Badge */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-mono text-white/70 backdrop-blur-sm">
                  {file.mime_type.split('/')[1].toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && cloudFiles.length === 0 && (
           <div className="py-20 flex flex-col items-center justify-center opacity-20">
             <Image size={48} className="mb-2 text-white"/>
             <p className="text-xs uppercase tracking-widest text-text-sec">Cloud je prázdny</p>
           </div>
        )}
      </div>
    </div>
  );
};

const DashboardView = ({ isSidebarOpen, onCloseSidebar }: { isSidebarOpen: boolean, onCloseSidebar: () => void }) => {
  const { projects, addProject, deleteProject, toggleProjectStatus } = useProjects();
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [lang, setLang] = useState('Node.js');

  useEffect(() => { if (!selectedId && projects.length) setSelectedId(projects[0].id); }, [projects, selectedId]);
  const selected = projects.find(p => p.id === selectedId);

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/80 z-[60] md:hidden backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onCloseSidebar} />
      
      {/* Sidebar - Acts as drawer on mobile */}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 bg-[#050505] border-r border-white/5 flex flex-col transition-transform duration-300 transform md:relative md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 pt-safe md:pt-5 border-b border-white/5">
           <div className="flex items-center justify-between md:hidden mb-4">
              <h2 className="text-[10px] font-mono text-text-sec uppercase tracking-widest">Menu</h2>
              <button onClick={onCloseSidebar} className="text-text-sec"><X size={20}/></button>
           </div>
          <h2 className="text-[10px] font-mono text-text-sec uppercase mb-4 tracking-widest hidden md:block">Initialization</h2>
          <div className="space-y-3">
            <input className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-brand-accent transition-all" placeholder="Project name..." value={newName} onChange={e => setNewName(e.target.value)} />
            <div className="flex gap-2">
              <select className="flex-1 bg-black border border-white/10 rounded-xl px-2 py-2 text-[10px] text-white outline-none" value={lang} onChange={e => setLang(e.target.value)}>
                <option>Node.js</option><option>Python</option><option>Go</option><option>Rust</option>
              </select>
              <button onClick={() => { if(newName) { addProject(newName, lang); setNewName(''); addToast('Projekt inicializovaný', 'success'); } else { addToast('Zadajte názov projektu', 'error'); } }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white active:bg-white/10"><Plus size={16}/></button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {projects.map(p => (
            <button key={p.id} onClick={() => { setSelectedId(p.id); onCloseSidebar(); }} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedId === p.id ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-white">{p.name}</span>
                <span className="text-[10px] text-text-sec font-mono">{p.language}</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${p.status === 'running' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-black p-4 md:p-8 overflow-y-auto w-full">
        {selected ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
                  <Server className="text-brand-accent" size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">{selected.name}</h1>
                  <p className="text-xs text-text-sec font-mono flex items-center gap-2 mt-1">
                    <Globe size={12} /> localhost:{selected.port} • <span className={`uppercase ${selected.status === 'running' ? 'text-green-500' : 'text-red-500'}`}>{selected.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => toggleProjectStatus(selected.id)} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${selected.status === 'running' ? 'bg-white/5 text-white' : 'bg-white text-black'}`}>
                  {selected.status === 'running' ? 'Stop' : 'Deploy'}
                </button>
                <button onClick={() => { deleteProject(selected.id); addToast('Projekt odstránený', 'info'); }} className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard label="CPU Load" value={selected.cpuUsage} color="#3b82f6" icon={Cpu} />
              <MetricCard label="Memory" value={selected.ramUsage} color="#10b981" icon={Activity} />
            </div>

            <div className="bg-[#050505] border border-white/10 rounded-2xl p-4 font-mono text-[11px] h-64 overflow-y-auto relative">
              <div className="text-[9px] text-text-sec mb-4 uppercase flex items-center justify-between border-b border-white/5 pb-2">
                <span>System Logs</span>
                <span className="text-green-500">Live</span>
              </div>
              <div className="space-y-1 text-text-sec">
                <div className="text-white">[{new Date().toLocaleTimeString()}] System init...</div>
                <div>Loaded configuration for {selected.language}</div>
                {selected.status === 'running' && <div className="text-brand-accent">Service active on port {selected.port}</div>}
                {selected.status === 'stopped' && <div className="text-red-500">Service stopped by user.</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <LayoutDashboard size={48} className="mb-4 text-white"/>
            <p className="text-sm text-text-sec">No active selection</p>
          </div>
        )}
      </main>
    </div>
  );
};

const FilesView = () => {
  const { ls, cd, currentPath, fs, touch, mkdir, rm, rename, move, cat } = useVFS();
  const { openEditor } = useEditor();
  const { addToast } = useToast();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [inputVal, setInputVal] = useState('');

  const nodes = useMemo(() => {
    const list = ls() || [];
    let p: any = { content: fs };
    for (const s of currentPath) p = p.content[s];
    return list.map(n => ({ name: n, type: p.content[n].type as 'file' | 'dir' })).sort((a,b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);
  }, [currentPath, fs, ls]);

  const handleAction = (type: 'ren' | 'mov' | 'del' | 'dl', name: string) => {
    setActiveMenu(null);
    haptic(15);
    if (type === 'del') { if (confirm(`Vymazať ${name}?`)) { rm(name); addToast(`Položka ${name} vymazaná`, 'info'); } }
    else if (type === 'ren') { const n = prompt('Nový názov:', name); if (n) rename(name, n); }
    else if (type === 'mov') { const p = prompt('Presunúť do (cesta):', '/home/admin'); if (p && move(name, p)) addToast('Položka presunutá', 'success'); }
    else if (type === 'dl') {
      const content = cat(name) || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      addToast('Sťahovanie spustené', 'success');
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="h-10 shrink-0 bg-surface/50 border-b border-white/5 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => cd('/')} className="text-text-sec active:text-white shrink-0"><HardDrive size={14}/></button>
        {currentPath.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="text-text-sec shrink-0" />
            <button onClick={() => cd('/' + currentPath.slice(0, i + 1).join('/'))} className="text-[10px] font-mono text-text-sec truncate max-w-[80px] shrink-0">{p}</button>
          </React.Fragment>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {nodes.map(node => (
          <div key={node.name} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:bg-white/10 transition-all" onClick={() => node.type === 'dir' ? cd(node.name) : openEditor(node.name, cat(node.name) || '')}>
            <div className="flex items-center gap-4 flex-1 truncate">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${node.type === 'dir' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-white/5 text-text-sec'}`}>
                {node.type === 'dir' ? <Folder size={24} /> : <FileText size={24} />}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold truncate text-white">{node.name}</span>
                <span className="text-[10px] text-text-sec uppercase tracking-widest font-mono">{node.type}</span>
              </div>
            </div>
            <div className="relative">
              <button onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === node.name ? null : node.name); }} className="p-3 text-text-sec active:text-white"><MoreVertical size={20} /></button>
              {activeMenu === node.name && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-modal rounded-2xl shadow-2xl z-50 p-1 animate-slide-up">
                  <button onClick={e => { e.stopPropagation(); handleAction('ren', node.name); }} className="w-full text-left px-4 py-3 text-xs flex items-center gap-3 active:bg-white/5 rounded-xl text-white"><Edit3 size={16}/> Premenovať</button>
                  <button onClick={e => { e.stopPropagation(); handleAction('mov', node.name); }} className="w-full text-left px-4 py-3 text-xs flex items-center gap-3 active:bg-white/5 rounded-xl text-white"><MoveHorizontal size={16}/> Presunúť</button>
                  {node.type === 'file' && <button onClick={e => { e.stopPropagation(); handleAction('dl', node.name); }} className="w-full text-left px-4 py-3 text-xs flex items-center gap-3 active:bg-white/5 rounded-xl text-brand-accent"><Download size={16}/> Stiahnuť</button>}
                  <div className="h-px bg-white/5 my-1" />
                  <button onClick={e => { e.stopPropagation(); handleAction('del', node.name); }} className="w-full text-left px-4 py-3 text-xs flex items-center gap-3 active:bg-white/5 rounded-xl text-red-500"><Trash2 size={16}/> Zmazať</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {nodes.length === 0 && <div className="py-20 flex flex-col items-center justify-center opacity-20"><Folder size={48} className="mb-2 text-white"/><p className="text-xs uppercase tracking-widest text-text-sec">Priečinok je prázdny</p></div>}
      </div>
      <div className="p-4 bg-surface/80 backdrop-blur-xl border-t border-white/5 flex gap-3 pb-safe">
        <button onClick={() => setCreating('file')} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform text-white"><Plus size={18}/> Súbor</button>
        <button onClick={() => setCreating('dir')} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform text-white"><FolderPlus size={18}/> Priečinok</button>
      </div>
      {creating && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm glass-modal rounded-[32px] p-8">
            <h3 className="text-xl font-bold mb-6 text-white">Nový {creating === 'file' ? 'súbor' : 'priečinok'}</h3>
            <input className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white mb-6 outline-none focus:border-brand-accent" placeholder="Názov..." autoFocus value={inputVal} onChange={e => setInputVal(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setCreating(null)} className="flex-1 h-14 bg-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest text-text-sec">Zrušiť</button>
              <button onClick={() => { if (inputVal) { if (creating === 'file') touch(inputVal); else mkdir(inputVal); setCreating(null); setInputVal(''); addToast('Položka vytvorená', 'success'); } else { addToast('Zadajte názov', 'error'); } }} className="flex-1 h-14 bg-brand-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest">Vytvoriť</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TerminalView = () => {
  const { cd, pwd, ls, mkdir, touch, rm, cat, move } = useVFS();
  const { addProject, projects } = useProjects();
  const { openEditor } = useEditor();
  const { addToast } = useToast();
  const [lines, setLines] = useState<string[]>(['DevCloud OS [Version 2.6.0]', '(c) 2025 Mobile Core Systems.', 'Type "help" for a list of commands.']);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [lines]);

  const execute = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;
    setLines(prev => [...prev, `➜ ~ ${cmdStr}`]);
    const [cmd, ...args] = trimmed.split(/\s+/);
    
    setTimeout(() => {
      switch(cmd) {
        case 'ls': {
            const files = ls(args[0]) || [];
            // Basic LS, but if no args (cwd), also show projects as if they are folders
            const projectList = args.length === 0 ? projects.map(p => `[PROJ] ${p.name} (${p.language})`) : [];
            setLines(prev => [...prev, ...files, ...projectList]); 
            break;
        }
        case 'pwd': setLines(prev => [...prev, pwd()]); break;
        case 'cd': if (!cd(args[0] || '/')) setLines(prev => [...prev, `bash: cd: ${args[0]}: No such file or directory`]); break;
        case 'cat': {
            if(!args[0]) { setLines(prev => [...prev, 'usage: cat <file>']); break; }
            const isDir = ls(args[0]) !== null;
            if (isDir) {
                setLines(prev => [...prev, `cat: ${args[0]}: Is a directory`]);
                break;
            }
            const content = cat(args[0]);
            if (content === null) setLines(prev => [...prev, `cat: ${args[0]}: No such file`]);
            else setLines(prev => [...prev, content]);
            break;
        }
        case 'edit': {
            if(!args[0]) { setLines(prev => [...prev, 'usage: edit <file>']); break; }
            
            // Check if directory
            const isDir = ls(args[0]) !== null;
            if (isDir) {
                setLines(prev => [...prev, `edit: ${args[0]}: Is a directory`]); 
                addToast('Nie je možné upraviť priečinok', 'error');
                break;
            }

            let content = cat(args[0]);
            if (content === null) {
               // Must be non-existent
               if (touch(args[0])) {
                   setLines(prev => [...prev, `New file '${args[0]}' created.`]);
                   openEditor(args[0], ''); 
               } else {
                   setLines(prev => [...prev, `edit: cannot create file '${args[0]}'`]);
                   addToast('Chyba pri vytváraní súboru', 'error');
               }
            } else {
               openEditor(args[0], content);
            }
            break;
        }
        case 'touch': {
            if(!args[0]) { setLines(prev => [...prev, 'usage: touch <file>']); break; }
            if (touch(args[0])) {
                 addToast(`Súbor ${args[0]} vytvorený`, 'success');
            } else {
                 setLines(prev => [...prev, `touch: cannot create file '${args[0]}'`]); 
                 addToast('Chyba pri vytváraní súboru', 'error');
            }
            break;
        }
        case 'mkdir': {
            const isP = args[0] === '-p';
            const target = isP ? args[1] : args[0];
            if (!target) { setLines(prev => [...prev, 'usage: mkdir [-p] <dir>']); break; }
            if (mkdir(target, isP)) {
                 addToast(`Priečinok ${target} vytvorený`, 'success');
            } else {
                 setLines(prev => [...prev, `mkdir: cannot create directory '${target}': No such file or directory`]); 
                 addToast('Chyba pri vytváraní priečinka', 'error');
            }
            break;
        }
        case 'rm': {
            const isRf = args[0] === '-rf';
            const target = isRf ? args[1] : args[0];
            if (!target) { setLines(prev => [...prev, 'usage: rm [-rf] <path>']); break; }
            if(rm(target, isRf)) {
                addToast(`Položka ${target} odstránená`, 'info');
            } else {
                setLines(prev => [...prev, `rm: cannot remove '${target}': No such file or directory (use -rf for dirs)`]);
                addToast('Chyba pri mazaní', 'error');
            }
            break;
        }
        case 'mv': {
            if (args.length < 2) { setLines(prev => [...prev, 'usage: mv <source> <dest>']); break; }
            if (move(args[0], args[1])) {
                addToast(`Presunuté: ${args[0]} -> ${args[1]}`, 'success');
            } else {
                 setLines(prev => [...prev, `mv: cannot move '${args[0]}' to '${args[1]}': No such file or directory`]);
                 addToast('Chyba pri presune', 'error');
            }
            break;
        }
        case 'create': {
            const [name, lang] = args;
            if (!name || !lang) {
                setLines(prev => [...prev, 'usage: create <name> <lang>', 'languages: Node.js, Python, Go, Rust']);
                break;
            }
            const validLangs = ['Node.js', 'Python', 'Go', 'Rust'];
            const formattedLang = validLangs.find(l => l.toLowerCase() === lang.toLowerCase());
            if (!formattedLang) {
                setLines(prev => [...prev, `error: '${lang}' is not a supported language`]);
                addToast('Nepodporovaný jazyk', 'error');
                break;
            }
            addProject(name, formattedLang);
            setLines(prev => [...prev, `Project '${name}' created successfully.`]);
            addToast(`Projekt ${name} vytvorený`, 'success');
            break;
        }
        case 'clear': setLines([]); break;
        case 'help': setLines(prev => [...prev, 'Available: ls, cd, pwd, mkdir [-p], touch, rm [-rf], mv, cat, edit, create, clear, whoami, neofetch']); break;
        case 'whoami': setLines(prev => [...prev, 'admin@devcloud-mobile']); break;
        case 'neofetch': setLines(prev => [...prev, 'OS: DevCloud Mobile v2', 'Host: Android Virtualized', 'Uptime: 2h 45m', 'Shell: bash 5.1']); break;
        default: setLines(prev => [...prev, `bash: ${cmd}: command not found`]);
      }
    }, 50);
  };

  return (
    <div className="h-full flex flex-col bg-black font-mono text-sm p-4 pt-4" onClick={() => inputRef.current?.focus()}>
      <div className="flex-1 overflow-y-auto space-y-1 text-green-400 no-scrollbar pb-16">
        {lines.map((l, i) => <div key={i} className="whitespace-pre-wrap break-words">{l}</div>)}
        <div className="flex gap-2 items-center">
          <span className="text-white/40 shrink-0">➜</span>
          <input ref={inputRef} className="bg-transparent border-none outline-none text-inherit w-full min-w-0" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { execute(input); setInput(''); } }} autoFocus spellCheck={false} />
        </div>
        <div ref={bottomRef} />
      </div>
      
      {/* Mobile Term Keys - positioned above bottom nav */}
      <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-surface border-t border-white/10 flex h-10 z-30">
        {['TAB', 'ESC', 'CTRL', 'ALT', 'UP', 'DN'].map(k => (
          <button key={k} className="flex-1 flex items-center justify-center text-[10px] font-bold text-text-sec border-r border-white/5 active:bg-white/10 active:text-white transition-colors">{k}</button>
        ))}
      </div>
    </div>
  );
};

// --- AUTH SCREEN ---

const LoginScreen = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-root">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand-accent/10 blur-[60px] sm:blur-[100px] rounded-full pointer-events-none" />
      <div className="relative w-full max-w-sm glass-modal rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-accent rounded-[20px] mx-auto mb-6 sm:mb-8 flex items-center justify-center shadow-2xl shadow-brand-accent/30 animate-pulse">
          <ShieldCheck size={28} className="text-white sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight text-white">DEVCLOUD OS</h1>
        <p className="text-[10px] sm:text-xs text-text-sec uppercase tracking-[0.3em] mb-8 sm:mb-10">Access Token Required</p>
        <input type="password" className={`w-full bg-black/50 border ${err ? 'border-red-500' : 'border-white/10'} rounded-2xl px-6 py-4 mb-6 text-center outline-none focus:border-brand-accent transition-all text-white text-lg`} placeholder="••••••••" value={pass} onChange={e => { setPass(e.target.value); setErr(false); }} />
        <button onClick={async () => { 
            setLoading(true); 
            addToast('Overovanie...', 'loading');
            const success = await login(pass);
            if (!success) { 
              setErr(true); 
              haptic(50); 
              addToast('Prístup zamietnutý', 'error');
            } else {
              addToast('Vitajte v systéme', 'success');
            }
            setLoading(false); 
        }} className="w-full h-14 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Initialize'}
        </button>
        <p className="mt-8 text-[10px] text-text-sec uppercase font-mono tracking-widest">Predvolené: admin123</p>
      </div>
    </div>
  );
};

// --- APP ENTRY ---

const MainLayout = () => {
  const [view, setView] = useState('files');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSettingsOpen, toggleSettings } = useSettings();
  
  return (
    <div className="min-h-[100dvh] flex flex-col bg-root overflow-hidden text-white font-sans">
      <Header currentView={view} setView={setView} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 h-[100dvh] relative overflow-hidden">
        {view === 'files' ? <FilesView /> : view === 'term' ? <TerminalView /> : view === 'cloud' ? <CloudView /> : <DashboardView isSidebarOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} />}
      </main>

      <BottomNav currentView={view} setView={setView} />
      
      {/* Modals & Overlays */}
      {isSettingsOpen && <SettingsModal onClose={toggleSettings} />}
      <MobileEditor />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ProjectProvider>
            <EditorProvider>
              <VFSProvider>
                <CloudProvider>
                  <GlobalStyles />
                  <AuthContext.Consumer>
                    {auth => auth?.isAuthenticated ? <MainLayout /> : <LoginScreen />}
                  </AuthContext.Consumer>
                </CloudProvider>
              </VFSProvider>
            </EditorProvider>
          </ProjectProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}