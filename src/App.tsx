import React, { useState, useEffect, useContext, createContext, ReactNode, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  LayoutDashboard, 
  Cpu, 
  LogOut, 
  Command, 
  Activity, 
  Lock, 
  ArrowRight,
  Zap,
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
  Info,
  Loader2,
  Save,
  Copy,
  Search,
  ShieldCheck
} from 'lucide-react';

// --- TYPES & INTERFACES ---

interface AuthContextType {
  token: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface UserSession {
  token: string;
  timestamp: number;
}

interface Project {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'crashed';
  language: string;
  port: number;
  cpuUsage: number;
  ramUsage: number;
}

interface ProjectContextType {
  projects: Project[];
  addProject: (name: string, language: string) => void;
  deleteProject: (id: string) => void;
  toggleProjectStatus: (id: string) => void;
  getProject: (id: string) => Project | undefined;
}

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

// --- GLOBAL STYLES & UTILS ---

const GlobalStyles = () => (
  <style>{`
    :root {
      --bg-root: #000000;
      --bg-surface: #0B0C0E;
      --border-subtle: rgba(255, 255, 255, 0.14);
      --text-primary: #EDEDED;
      --text-secondary: #888888;
      --accent-glow: rgba(255, 255, 255, 0.08);
      --focus-ring: 0 0 0 2px rgba(255, 255, 255, 0.2);
      --brand-accent: #3b82f6;
    }

    ::selection {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-root);
    }
    ::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* Snap Scrolling Utilities - Mobile Optimized */
    .snap-container {
      scroll-snap-type: y mandatory;
      overflow-y: scroll;
      height: 100dvh;
      scroll-behavior: smooth;
    }
    .snap-section {
      scroll-snap-align: start;
      min-height: 100dvh;
    }

    /* Glow Animation Background */
    .login-glow {
      background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
      filter: blur(80px);
      position: absolute;
      width: 600px;
      height: 600px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      pointer-events: none;
    }
    
    /* Input Autofill Fix for Dark Mode */
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active{
        -webkit-box-shadow: 0 0 0 30px #050505 inset !important;
        -webkit-text-fill-color: white !important;
        transition: background-color 5000s ease-in-out 0s;
    }

    /* Mobile Safe Area */
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom);
    }
  `}</style>
);

// --- CONTEXTS ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastProvider = ({ children }: { children?: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('devcloud_session');
    if (stored) {
      try {
        const session: UserSession = JSON.parse(stored);
        setToken(session.token);
      } catch (e) {
        localStorage.removeItem('devcloud_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    // JEDNODUCHÁ LOGIKA HESLA
    if (password === 'admin123') {
      const session: UserSession = { token: 'auth_success_token', timestamp: Date.now() };
      localStorage.setItem('devcloud_session', JSON.stringify(session));
      setToken(session.token);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('devcloud_session');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProjectProvider = ({ children }: { children?: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('devcloud_projects');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'core-api', status: 'running', language: 'Node.js', port: 3000, cpuUsage: 12, ramUsage: 45 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('devcloud_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProjects(prev => prev.map(p => {
        if (p.status === 'running') {
          const cpuChange = (Math.random() * 6) - 3;
          const ramChange = (Math.random() * 4) - 2;
          return {
            ...p,
            cpuUsage: Math.max(1, Math.min(100, p.cpuUsage + cpuChange)),
            ramUsage: Math.max(10, Math.min(100, p.ramUsage + ramChange))
          };
        }
        return { ...p, cpuUsage: 0, ramUsage: 0 };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addProject = (name: string, language: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.toLowerCase().replace(/\s+/g, '-'),
      status: 'stopped',
      language: language,
      port: Math.floor(Math.random() * (9000 - 3000) + 3000),
      cpuUsage: 0,
      ramUsage: 0
    };
    setProjects(prev => [...prev, newProject]);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const toggleProjectStatus = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'running' ? 'stopped' : 'running';
        return { ...p, status: newStatus, cpuUsage: newStatus === 'running' ? 10 : 0, ramUsage: newStatus === 'running' ? 20 : 0 };
      }
      return p;
    }));
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProjectContext.Provider value={{ projects, addProject, deleteProject, toggleProjectStatus, getProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within a ProjectProvider');
  return context;
};

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// --- UI COMPONENTS ---

const Button = ({ children, onClick, className = '', variant = 'primary', isLoading = false, type = 'button', icon: Icon }: any) => {
  const baseStyles = "relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-black focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-white text-black border-transparent hover:bg-gray-200",
    secondary: "bg-transparent text-text-primary border-border hover:bg-white/5 hover:border-white/30",
    ghost: "bg-transparent text-text-secondary border-transparent hover:text-white hover:bg-white/5",
    danger: "bg-transparent text-red-500 border-red-900/30 hover:bg-red-900/20 hover:border-red-500/50"
  };

  return (
    <button type={type} onClick={onClick} disabled={isLoading} className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${className}`}>
      {isLoading ? (
        <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon && (
        <Icon size={16} className="mr-2" />
      )}
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">{label}</label>}
    <div className="relative group">
      <input 
        className={`
          w-full bg-[#050505] text-text-primary font-mono px-3 py-2.5 
          border rounded-md outline-none transition-all duration-200
          text-base md:text-sm
          ${error 
            ? 'border-red-900/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
            : 'border-border focus:border-white/40 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:border-white/20'
          }
          placeholder:text-white/10
        `}
        spellCheck={false}
        autoComplete="off"
        {...props} 
      />
    </div>
    {error && <span className="text-xs text-red-400 font-mono animate-pulse">{error}</span>}
  </div>
);

const Badge = ({ children, status = 'default' }: { children?: ReactNode, status?: 'default' | 'success' | 'warning' | 'danger' }) => {
  const colors = {
    default: 'bg-white/5 text-text-secondary border-white/10',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${colors[status]}`}>{children}</span>;
};

// --- TOASTER ---

const Toaster = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-auto z-100 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto flex items-center gap-3 bg-[#0E0E0E]/90 backdrop-blur-md border border-white/10 text-sm p-3 rounded-lg shadow-2xl w-full md:min-w-[300px] animate-in slide-in-from-bottom-5 md:slide-in-from-right-full fade-in duration-300">
          {toast.type === 'success' && <CheckCircle size={16} className="text-green-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={16} className="text-red-500 shrink-0" />}
          <span className="flex-1 text-text-primary">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-text-secondary hover:text-white"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
};

// --- COMPONENTS ---

const MetricCard = ({ label, value, color, icon: Icon }: any) => (
  <div className="p-4 rounded-lg border border-border bg-surface/50 relative overflow-hidden group">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon size={14} />
        <span className="text-xs font-mono uppercase">{label}</span>
      </div>
      <span className="text-xl font-mono text-text-primary">{Math.round(value)}%</span>
    </div>
    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

// --- LOGIN SCREEN ---

const LoginScreen = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password) {
      setError('Prístupové heslo je povinné');
      setLoading(false);
      return;
    }

    const success = await login(password);
    if (!success) {
      setError('Nesprávne heslo. Skúste znova.');
      addToast('Prístup zamietnutý.', 'error');
      setLoading(false);
    } else {
      addToast('Vitajte v systéme.', 'success');
    }
  };

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-root overflow-hidden px-4">
      <div className="login-glow" />
      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface border border-border mb-4 shadow-lg shadow-black/50">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">DevCloud OS</h1>
          <p className="text-sm text-text-secondary mt-2">Zadajte heslo pre prístup k ovládaciemu panelu</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input 
            label="Systémové heslo" 
            type="password"
            placeholder="Zadajte heslo..." 
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" isLoading={loading} className="w-full mt-2 group">
            Prihlásiť sa
            <ArrowRight size={16} className="ml-2 opacity-50 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-secondary opacity-50 uppercase tracking-widest">
          <Lock size={10} />
          <span>Zabezpečená lokálna relácia</span>
        </div>
        <div className="mt-4 text-center">
           <p className="text-[10px] text-text-secondary/30">Predvolené heslo: admin123</p>
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---

const Header = ({ currentView, setView, onMenuClick }: any) => {
  const { logout } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-root/70 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-text-secondary hover:text-white"><Menu size={20} /></button>
        <div className="flex items-center gap-2 text-text-primary">
          <Command size={16} />
          <span className="font-semibold text-sm hidden sm:inline">DevCloud</span>
        </div>
        <nav className="flex items-center p-1 bg-surface border border-border rounded-lg">
          <button onClick={() => setView('dashboard')} className={`px-3 py-1 rounded-md text-xs font-medium ${currentView === 'dashboard' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}>Dashboard</button>
          <button onClick={() => setView('terminal')} className={`px-3 py-1 rounded-md text-xs font-medium ${currentView === 'terminal' ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}>Terminal</button>
        </nav>
      </div>
      <button onClick={logout} className="text-text-secondary hover:text-red-400 p-2 rounded-md hover:bg-white/5"><LogOut size={16} /></button>
    </header>
  );
};

const DashboardView = ({ isSidebarOpen, onCloseSidebar }: any) => {
  const { projects, addProject, deleteProject, toggleProjectStatus } = useProjects();
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id || null);
  const [newName, setNewName] = useState('');
  const [lang, setLang] = useState('Node.js');

  const selectedProject = projects.find(p => p.id === selectedId);

  const handleCreate = (e: any) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addProject(newName, lang);
    addToast(`Projekt vytvorený.`, 'success');
    setNewName('');
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#050505] border-r border-border flex flex-col pt-14 md:relative md:translate-x-0 md:pt-0 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-mono text-text-secondary uppercase mb-4">Nový Projekt</h2>
          <form onSubmit={handleCreate} className="space-y-2">
            <input className="w-full bg-black border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none" placeholder="názov..." value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select className="w-full bg-black border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option>Node.js</option>
              <option>Python</option>
              <option>Go</option>
              <option>Rust</option>
            </select>
            <Button type="submit" className="w-full text-xs">Vytvoriť</Button>
          </form>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {projects.map(p => (
            <div key={p.id} onClick={() => { setSelectedId(p.id); onCloseSidebar(); }} className={`p-3 rounded border cursor-pointer transition-all ${selectedId === p.id ? 'bg-white/5 border-white/20' : 'border-border hover:border-white/10'}`}>
              <div className="flex justify-between items-center text-sm">
                <span>{p.name}</span>
                <span className={`w-2 h-2 rounded-full ${p.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-black flex flex-col">
        {selectedProject ? (
          <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold">{selectedProject.name}</h1>
              <Button onClick={() => toggleProjectStatus(selectedProject.id)} variant={selectedProject.status === 'running' ? 'secondary' : 'primary'}>
                {selectedProject.status === 'running' ? 'Stop' : 'Start'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard label="CPU" value={selectedProject.cpuUsage} color="#3b82f6" icon={Cpu} />
              <MetricCard label="RAM" value={selectedProject.ramUsage} color="#10b981" icon={Activity} />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center opacity-30">Vyberte projekt zo zoznamu</div>
        )}
      </div>
    </div>
  );
};

const TerminalView = () => {
  const [history, setHistory] = useState<string[]>(['Terminál pripravený.', 'Napíšte "help" pre príkazy.']);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView(), [history]);

  const handleCommand = (e: any) => {
    if (e.key === 'Enter') {
      const cmd = input.trim();
      setHistory(prev => [...prev, `➜ ${cmd}`]);
      if (cmd === 'help') setHistory(prev => [...prev, 'Príkazy: help, clear, status']);
      else if (cmd === 'clear') setHistory([]);
      else if (cmd === 'status') setHistory(prev => [...prev, 'Systém beží normálne.']);
      else setHistory(prev => [...prev, `Príkaz '${cmd}' nebol nájdený.`]);
      setInput('');
    }
  };

  return (
    <div className="h-full p-4 pt-20 font-mono text-sm overflow-hidden flex flex-col">
      <div className="flex-1 bg-surface border border-border rounded-lg p-4 overflow-y-auto">
        {history.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
        <div className="flex gap-2">
          <span className="text-green-500">➜</span>
          <input className="bg-transparent border-none outline-none text-white w-full" autoFocus value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleCommand} />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

const MainLayout = () => {
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-root text-text-primary overflow-hidden flex flex-col">
      <Header currentView={view} setView={setView} onMenuClick={() => setIsSidebarOpen(true)} />
      <main className="flex-1 pt-14">
        {view === 'dashboard' ? <DashboardView isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} /> : <TerminalView />}
      </main>
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center font-mono">Loading Core...</div>;
  return isAuthenticated ? <MainLayout /> : <LoginScreen />;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProjectProvider>
          <GlobalStyles />
          <AppContent />
        </ProjectProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
