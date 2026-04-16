/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  XCircle,
  Clock, 
  ChevronRight, 
  Play, 
  Plus, 
  Trash2, 
  X, 
  Truck,
  Package,
  ArrowRight,
  Save,
  RotateCcw,
  Database,
  SkipForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn, formatOrderId, formatSequence } from './lib/utils';
import { PickItem, PickStatus, Wave } from './types';
import { Language, translations } from './i18n';

// Constants
const DEFAULT_PASSWORD = "1234";
const STATUS_CYCLE: PickStatus[] = ['Deslocando', 'Aguardando coleta', 'CONCLUIDO'];
const CYCLE_TIME = 3000; // 3 seconds per state

const SAMPLE_PRODUCTS = [
  { name: "Smartwatch Pro Gen-T", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80" },
  { name: "Headphone Studio ANC", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80" },
  { name: "Powerbank X-Series 20k", image: "https://images.unsplash.com/photo-1609091839311-d536801027d3?w=800&q=80" },
  { name: "Relógio Classic Leather", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80" },
  { name: "Teclado Mecânico K1", image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80" },
  { name: "Mouse Gamer RGB", image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&q=80" },
  { name: "Monitor 4K UltraWide", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80" },
  { name: "Câmera Mirrorless V3", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80" },
  { name: "Drone Explorer Air", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80" },
  { name: "Tablet Pro 12.9", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80" },
  { name: "Notebook Gamer Ultra i9", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80" },
  { name: "Carregador MagSafe", image: "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=800&q=80" },
];

export default function App() {
  // State
  const [truckId, setTruckId] = useState(() => {
    return localStorage.getItem('wms_truck_id') || "TRK-001";
  });
  const [waves, setWaves] = useState<Wave[]>(() => {
    const saved = localStorage.getItem('wms_waves');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeWaveId, setActiveWaveId] = useState<string | null>(() => {
    return localStorage.getItem('wms_active_wave_id');
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('wms_waves', JSON.stringify(waves));
  }, [waves]);

  useEffect(() => {
    localStorage.setItem('wms_truck_id', truckId);
  }, [truckId]);

  useEffect(() => {
    if (activeWaveId) {
      localStorage.setItem('wms_active_wave_id', activeWaveId);
    } else {
      localStorage.removeItem('wms_active_wave_id');
    }
  }, [activeWaveId]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [timeLeft, setTimeLeft] = useState(862); // 14:22 in seconds
  const [isHolding, setIsHolding] = useState(false);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('wms_lang') as Language) || 'pt');

  const t = (key: keyof typeof translations['pt']): string => (translations[lang] as any)[key] || key;

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('wms_lang', lang);
  }, [lang]);

  // SQL Server State
  const [sqlConfig, setSqlConfig] = useState(() => {
    const saved = localStorage.getItem('wms_sql_config');
    return saved ? JSON.parse(saved) : { server: '', user: '', password: '', database: '' };
  });
  const [sqlQuery, setSqlQuery] = useState(() => {
    return localStorage.getItem('wms_sql_query') || 'SELECT TOP 10 * FROM ONDAS_COLETA';
  });
  const [sqlMapping, setSqlMapping] = useState(() => {
    const saved = localStorage.getItem('wms_sql_mapping');
    return saved ? JSON.parse(saved) : {
      ORDER_ID: 'ORDER_ID',
      OPERACAO: 'OPERACAO',
      DATA: 'DATA',
      AREA: 'AREA',
      ZONA: 'ZONA',
      CORREDOR: 'CORREDOR',
      COMPARTIMENTO: 'COMPARTIMENTO',
      NIVEL: 'NIVEL',
      POSICAO: 'POSICAO',
      COMANDO: 'COMANDO',
      STATUS: 'STATUS'
    };
  });
  const [isTestingSql, setIsTestingSql] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wms_sql_config', JSON.stringify(sqlConfig));
  }, [sqlConfig]);

  useEffect(() => {
    localStorage.setItem('wms_sql_query', sqlQuery);
  }, [sqlQuery]);

  useEffect(() => {
    localStorage.setItem('wms_sql_mapping', JSON.stringify(sqlMapping));
  }, [sqlMapping]);

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulationRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulationRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Active wave data
  const activeWave = useMemo(() => waves.find(w => w.id === activeWaveId), [waves, activeWaveId]);
  
  const sortedPicks = useMemo(() => {
    if (!activeWave) return [];
    return [...activeWave.picks].sort((a, b) => {
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      if (a.zona !== b.zona) return a.zona.localeCompare(b.zona);
      if (a.corredor !== b.corredor) return a.corredor.localeCompare(b.corredor);
      if (a.compartimento !== b.compartimento) return a.compartimento.localeCompare(b.compartimento);
      if (a.nivel !== b.nivel) return a.nivel.localeCompare(b.nivel);
      return a.posicao.localeCompare(b.posicao);
    }).map((p, index) => ({ ...p, sequence: index + 1 }));
  }, [activeWave]);

  const currentPickIndex = useMemo(() => {
    const firstNotDone = sortedPicks.findIndex(p => p.status !== 'CONCLUIDO');
    
    if (isHolding) {
      if (firstNotDone === -1) return sortedPicks.length - 1;
      if (firstNotDone > 0) return firstNotDone - 1;
    }
    
    return firstNotDone;
  }, [sortedPicks, isHolding]);

  const currentPick = currentPickIndex !== -1 ? sortedPicks[currentPickIndex] : null;
  const completedCount = sortedPicks.filter(p => p.status === 'CONCLUIDO').length;
  const totalCount = sortedPicks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Simulation Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulationRunning && currentPick && !isHolding) {
      timer = setTimeout(() => {
        const currentIndex = STATUS_CYCLE.indexOf(currentPick.status);
        const nextStatus = STATUS_CYCLE[currentIndex + 1] || 'CONCLUIDO';
        
        if (nextStatus === 'CONCLUIDO') {
          setIsHolding(true);
          setTimeout(() => setIsHolding(false), 1000);
        }

        setWaves(prev => prev.map(w => {
          if (w.id !== activeWaveId) return w;
          return {
            ...w,
            picks: w.picks.map(p => {
              if (p.id === currentPick.id) {
                return { ...p, status: nextStatus };
              }
              return p;
            })
          };
        }));
      }, CYCLE_TIME);
    } else if (isSimulationRunning && !currentPick && totalCount > 0 && !isHolding) {
      setIsSimulationRunning(false);
    }
    return () => clearTimeout(timer);
  }, [isSimulationRunning, currentPick, activeWaveId, totalCount, isHolding]);

  // Handlers
  const handleStartSimulation = () => {
    if (!activeWaveId) return;
    setIsSimulationRunning(true);
  };

  const handleResetSimulation = () => {
    setIsSimulationRunning(false);
    setIsHolding(false);
    setWaves(prev => prev.map(w => {
      if (w.id !== activeWaveId) return w;
      return {
        ...w,
        picks: w.picks.map(p => ({ ...p, status: 'Deslocando' }))
      };
    }));
  };

  const handleManualStep = () => {
    if (!currentPick || isSimulationRunning || isHolding) return;
    
    const currentIndex = STATUS_CYCLE.indexOf(currentPick.status);
    const nextStatus = STATUS_CYCLE[currentIndex + 1] || 'CONCLUIDO';
    
    if (nextStatus === 'CONCLUIDO') {
      setIsHolding(true);
      setTimeout(() => setIsHolding(false), 500);
    }

    setWaves(prev => prev.map(w => {
      if (w.id !== activeWaveId) return w;
      return {
        ...w,
        picks: w.picks.map(p => {
          if (p.id === currentPick.id) {
            return { ...p, status: nextStatus };
          }
          return p;
        })
      };
    }));
  };

  const handleSettingsAuth = () => {
    if (password === DEFAULT_PASSWORD) {
      setIsAuth(true);
      setPassword("");
    } else {
      alert(t('wrong_password'));
    }
  };

  const addWave = (newWave: Wave) => {
    setWaves(prev => [...prev, newWave]);
    if (!activeWaveId) setActiveWaveId(newWave.id);
  };

  const deleteWave = (id: string) => {
    setWaves(prev => prev.filter(w => w.id !== id));
    if (activeWaveId === id) setActiveWaveId(null);
  };

  return (
    <div className="h-screen bg-surface-container-lowest flex flex-col font-body overflow-hidden items-center justify-center">
      <div className="h-full w-full max-w-[1024px] bg-surface flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)] border-x border-outline-variant/20">
        {/* Header */}
        <header className="bg-surface-container-low h-14 w-full border-b border-outline-variant/20 flex items-center px-6 shrink-0">
          <div className="flex-1 flex items-center gap-4">
            <span className="text-xs font-extrabold font-tech text-primary uppercase tracking-widest">{t('truck_id_label')}: {truckId}</span>
            <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant/20">
              <button 
                onClick={() => setLang('pt')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                  lang === 'pt' ? "bg-primary text-white shadow-sm" : "text-outline hover:text-on-surface"
                )}
              >
                PT
              </button>
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                  lang === 'en' ? "bg-primary text-white shadow-sm" : "text-outline hover:text-on-surface"
                )}
              >
                EN
              </button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-sm font-black text-on-surface-variant uppercase tracking-[0.2em] font-display">CHP Soluções</span>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => { setShowSettings(true); setIsAuth(false); }}
              className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-8 px-6 w-full flex flex-col gap-6 overflow-hidden">
        {/* Progress Section */}
        <section className="mt-4 flex flex-col gap-2 items-center text-center shrink-0">
          <div className="flex flex-col w-full max-w-2xl">
            <span className="text-xs font-extrabold uppercase text-outline tracking-wider">{t('wave_progress')}</span>
            <div className="flex items-end justify-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold mono text-primary tracking-tighter">
                  {completedCount}/{totalCount}
                </span>
                <span className="text-sm font-bold text-outline mono">({Math.round(progress)}%)</span>
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center mt-2">
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setShowSimModal(true)}
                className="flex items-center gap-2 bg-surface-container-high text-on-surface px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors"
              >
                <Plus size={18} /> {t('simulate')}
              </button>
              {activeWave && (
                <>
                  <button 
                    onClick={handleResetSimulation}
                    className="flex items-center gap-2 bg-surface-container-high text-on-surface px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors"
                  >
                    <RotateCcw size={18} /> {t('reset')}
                  </button>
                  <button 
                    onClick={handleStartSimulation}
                    disabled={isSimulationRunning || completedCount === totalCount}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg",
                      isSimulationRunning || completedCount === totalCount
                        ? "bg-outline text-surface-container cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90 active:scale-95"
                    )}
                  >
                    <Play size={18} fill="currentColor" /> {t('start')}
                  </button>
                  <button 
                    onClick={handleManualStep}
                    disabled={isSimulationRunning || completedCount === totalCount || isHolding}
                    title={t('next_step')}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-all border-2",
                      isSimulationRunning || completedCount === totalCount || isHolding
                        ? "border-outline-variant text-outline-variant cursor-not-allowed opacity-50"
                        : "border-primary text-primary hover:bg-primary/5 active:scale-95"
                    )}
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Current Pick Section */}
        <section className="flex flex-col gap-3 shrink-0">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.3em] text-primary">{t('current_pick')}</h2>
          <AnimatePresence mode="wait">
            {currentPick ? (
              <motion.div 
                key={currentPick.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "bg-surface-container-lowest rounded-xl border-4 overflow-hidden shadow-xl transition-all duration-500",
                  currentPick.status === 'Deslocando' ? "border-error" : 
                  currentPick.status === 'Aguardando coleta' ? "border-tertiary" : 
                  "border-primary"
                )}
              >
                <div className="flex flex-col md:flex-row">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:w-5/12 h-64 bg-surface-container flex flex-col items-center justify-center relative overflow-hidden"
                  >
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="absolute top-0 left-0 bg-primary text-white px-5 py-2 font-display text-4xl font-black tracking-tighter shadow-xl z-10 rounded-br-2xl border-r-4 border-b-4 border-white/20"
                    >
                      {formatSequence(currentPick.sequence)}
                    </motion.div>
                    <img 
                      src={currentPick.productImage} 
                      alt={currentPick.productName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-2 px-4 flex justify-between items-center"
                    >
                      <span className="text-[10px] text-white font-tech font-bold uppercase tracking-widest">{currentPick.timestamp}</span>
                      <Clock size={12} className="text-white/70" />
                    </motion.div>
                  </motion.div>
                  <div className="md:w-7/12 p-6 flex flex-col justify-start">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col">
                          <motion.h3 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-extrabold leading-tight tracking-tight"
                          >
                            {t(currentPick.productName as any)}
                          </motion.h3>
                        </div>
                      </div>
                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.05,
                              delayChildren: 0.4
                            }
                          }
                        }}
                        className="mt-6 flex items-end justify-start gap-x-3"
                      >
                        <InfoItem label={t('area')} value={currentPick.area} />
                        <InfoItem label={t('zone')} value={currentPick.zona} />
                        <InfoItem label={t('aisle')} value={currentPick.corredor} />
                        <InfoItem label={t('comp')} value={currentPick.compartimento} />
                        <InfoItem label={t('level')} value={currentPick.nivel} />
                        <InfoItem label={t('position')} value={currentPick.posicao} />
                        <InfoItem label={t('command')} value={currentPick.comando} />
                      </motion.div>
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-[10px] pt-[12px] flex justify-center items-center"
                    >
                      <StatusBadge status={currentPick.status} t={t} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ) : progress === 100 && totalCount > 0 ? (
              <motion.div 
                key="complete"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-tertiary h-64 rounded-xl flex flex-col items-center justify-center text-white shadow-xl border-4 border-white/20"
              >
                <CheckCircle2 size={80} className="mb-4" />
                <h2 className="text-6xl font-black tracking-tighter uppercase italic">{t('concluido_banner')}</h2>
                <p className="text-white/80 font-bold uppercase tracking-[0.3em] mt-2">{t('onda_finalizada')}</p>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-surface-container-low rounded-xl border-2 border-dashed border-outline-variant h-64 flex flex-col items-center justify-center text-outline gap-2"
              >
                <Package size={48} strokeWidth={1} />
                <p className="font-bold uppercase tracking-widest text-sm">{t('empty_list')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Pick List Section */}
        <section className="flex-1 flex flex-col gap-3 min-h-0 pb-4">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.3em] text-on-surface-variant">{t('pick_list')}</h2>
            <span className="text-xs font-extrabold text-outline uppercase mono tracking-widest">
              {totalCount - completedCount} {t('items_count')}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-2 custom-scrollbar min-h-0">
            {sortedPicks.map((pick) => (
              <PickListItem key={pick.id} pick={pick} isActive={currentPick?.id === pick.id} t={t} />
            ))}
            {sortedPicks.length === 0 && (
              <div className="text-center py-12 text-outline uppercase tracking-widest text-xs font-bold">
                {t('empty_list')}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <Modal title={t('settings_title')} onClose={() => setShowSettings(false)}>
            {!isAuth ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-on-surface-variant">{t('auth_prompt')}</p>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className="bg-surface-container p-3 rounded-lg border-none focus:ring-2 focus:ring-primary font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleSettingsAuth()}
                />
                <button 
                  onClick={handleSettingsAuth}
                  className="bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  {t('access_btn')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Truck size={16} /> {t('identification')}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-extrabold uppercase text-outline">{t('truck_id_setting')}</label>
                    <input 
                      type="text" 
                      value={truckId}
                      onChange={(e) => setTruckId(e.target.value)}
                      className="bg-surface-container p-3 rounded-lg border-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Database size={16} /> {t('sql_server')}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label={t('host_label')} value={sqlConfig.server} onChange={(v) => setSqlConfig({...sqlConfig, server: v})} />
                    <InputGroup label={t('database_label')} value={sqlConfig.database} onChange={(v) => setSqlConfig({...sqlConfig, database: v})} />
                    <InputGroup label={t('user_label')} value={sqlConfig.user} onChange={(v) => setSqlConfig({...sqlConfig, user: v})} />
                    <InputGroup label={t('password_label')} type="password" value={sqlConfig.password} onChange={(v) => setSqlConfig({...sqlConfig, password: v})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-extrabold uppercase text-outline tracking-widest">{t('sql_query_label')}</label>
                    <textarea 
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="bg-surface-container p-3 rounded-lg border-none focus:ring-2 focus:ring-primary font-mono text-xs h-24 resize-none"
                      placeholder="SELECT * FROM ..."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-secondary">{t('column_mapping')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(sqlMapping).map((key) => (
                      <div key={key}>
                        <InputGroup 
                          label={key} 
                          value={(sqlMapping as any)[key]} 
                          onChange={(v) => setSqlMapping({...sqlMapping, [key]: v})} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg mt-4"
                >
                  {t('save_settings')}
                </button>
              </div>
            )}
          </Modal>
        )}

        {showSimModal && (
          <SimulationModal 
            onClose={() => setShowSimModal(false)} 
            onAddWave={addWave}
            waves={waves}
            onSelectWave={setActiveWaveId}
            onDeleteWave={deleteWave}
            activeWaveId={activeWaveId}
            truckId={truckId}
            sqlConfig={sqlConfig}
            sqlQuery={sqlQuery}
            sqlMapping={sqlMapping}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}

// Sub-components
function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 5 },
        visible: { opacity: 1, y: 0 }
      }}
      className="flex flex-col"
    >
      <span className="text-[11px] uppercase font-extrabold text-outline tracking-widest font-tech">{label}</span>
      <span className="text-xl font-black font-display text-on-surface tracking-tighter">{value}</span>
    </motion.div>
  );
}

function StatusBadge({ status, t }: { status: PickStatus, t: any }) {
  const styles = {
    'Deslocando': 'bg-error text-white',
    'Aguardando coleta': 'animate-status-swap shadow-[0_0_15px_rgba(0,96,64,0.4)]',
    'CONCLUIDO': 'bg-tertiary text-white',
    'CANCELADO': 'bg-outline text-white'
  };

  const labels = {
    'Deslocando': t('moving'),
    'Aguardando coleta': t('waiting'),
    'CONCLUIDO': t('completed'),
    'CANCELADO': t('cancelled')
  };

  return (
    <span className={cn(
      "text-2xl font-black px-8 py-3 rounded-xl mono uppercase mt-2 tracking-tighter transition-all duration-500 shadow-lg border-2 border-white/20",
      styles[status]
    )}>
      {labels[status]}
    </span>
  );
}

const PickListItem: React.FC<{ pick: PickItem, isActive: boolean, t: any }> = ({ pick, isActive, t }) => {
  const isCompleted = pick.status === 'CONCLUIDO';
  const isCancelled = pick.status === 'CANCELADO';
  const isWaiting = pick.status === 'Aguardando coleta';
  const isMoving = pick.status === 'Deslocando';
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [isActive]);

  return (
    <div 
      ref={itemRef}
      className={cn(
        "rounded-lg border-l-4 py-0.5 px-5 flex items-center justify-between shadow-sm transition-all",
        // Background and border colors based on status/active
        isCompleted && "bg-tertiary/10 border-tertiary opacity-90",
        isCancelled && "bg-error/10 border-error opacity-80",
        isActive && "bg-yellow-400/10 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2 scale-[1.02] shadow-lg z-10",
        (!isActive && !isCompleted && !isCancelled) && "bg-surface-container-low border-outline-variant opacity-60"
      )}
    >
      <div className="flex items-center gap-5">
        <div className={cn(
          "px-5 py-3 rounded font-display text-[clamp(1.25rem,3.5vw,2.5rem)] font-black tracking-tighter leading-none shadow-inner",
          isCompleted ? "bg-tertiary/20 text-tertiary" : 
          isCancelled ? "bg-error/20 text-error" :
          isActive ? "bg-yellow-400/30 text-yellow-700" :
          "bg-surface-container text-on-surface-variant"
        )}>
          {formatSequence(pick.sequence)}
        </div>
        <div className="flex flex-col">
          <h3 className={cn(
            "font-extrabold text-[clamp(1.1rem,2.8vw,1.8rem)] leading-tight tracking-tight", 
            (isCompleted || isCancelled) && "text-on-surface-variant"
          )}>
            {t(pick.productName as any)}
          </h3>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="hidden sm:flex gap-3">
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('area')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.area}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('zone')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.zona}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('aisle')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.corredor}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('comp')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.compartimento}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('level')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.nivel}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('position')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.posicao}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[clamp(10px,1vw,12px)] uppercase font-extrabold text-outline tracking-widest font-tech leading-none mb-1">{t('command')}</span>
            <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-black font-display text-on-surface tracking-tighter leading-none">{pick.comando}</span>
          </div>
        </div>
        {isCompleted ? (
          <CheckCircle2 className="text-tertiary" size={24} fill="currentColor" fillOpacity={0.2} />
        ) : isCancelled ? (
          <XCircle className="text-error" size={24} fill="currentColor" fillOpacity={0.2} />
        ) : (
          <span className={cn(
            "w-3 h-3 rounded-full",
            isActive ? "bg-yellow-400 animate-pulse" : 
            "bg-surface-container-high border-2 border-outline-variant"
          )}></span>
        )}
      </div>
    </div>
  );
};

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-background/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SimulationModal({ 
  onClose, 
  onAddWave, 
  waves, 
  onSelectWave, 
  onDeleteWave, 
  activeWaveId, 
  truckId,
  sqlConfig,
  sqlQuery,
  sqlMapping,
  t
}: { 
  onClose: () => void, 
  onAddWave: (w: Wave) => void,
  waves: Wave[],
  onSelectWave: (id: string) => void,
  onDeleteWave: (id: string) => void,
  activeWaveId: string | null,
  truckId: string,
  sqlConfig: any,
  sqlQuery: string,
  sqlMapping: any,
  t: any
}) {
  const [mode, setMode] = useState<'list' | 'create' | 'manual' | 'sql'>('list');
  const [waveName, setWaveName] = useState(`ONDA-${format(new Date(), 'HHmm')}`);
  const [numPicks, setNumPicks] = useState(5);
  
  // Manual Pick State
  const [manualPicks, setManualPicks] = useState<Partial<PickItem>[]>([]);
  
  const [isTestingSql, setIsTestingSql] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [currentManualPick, setCurrentManualPick] = useState<Partial<PickItem>>({
    area: "RK",
    zona: "0",
    corredor: "003",
    compartimento: "001",
    nivel: "01",
    posicao: "01",
    comando: "P",
    productName: SAMPLE_PRODUCTS[0].name,
    productImage: SAMPLE_PRODUCTS[0].image
  });

  const handleGenerate = () => {
    // Shuffle products to ensure uniqueness if numPicks <= SAMPLE_PRODUCTS.length
    const shuffledProducts = [...SAMPLE_PRODUCTS].sort(() => Math.random() - 0.5);
    
    const newPicks: PickItem[] = Array.from({ length: numPicks }).map((_, i) => {
      // Use modulo to wrap around if numPicks > SAMPLE_PRODUCTS.length
      const product = shuffledProducts[i % shuffledProducts.length];
      return {
        id: Math.random().toString(36).substr(2, 9),
        orderId: formatOrderId(Math.floor(Math.random() * 1000000)),
        truckId: truckId,
        timestamp: format(new Date(), 'dd-MM-yyyy HH:mm:ss'),
        area: "RK",
        zona: Math.floor(Math.random() * 5).toString(),
        corredor: Math.floor(Math.random() * 10).toString().padStart(3, '0'),
        compartimento: Math.floor(Math.random() * 20 + 1).toString().padStart(3, '0'),
        nivel: Math.floor(Math.random() * 8 + 1).toString().padStart(2, '0'),
        posicao: Math.floor(Math.random() * 2 + 1).toString().padStart(2, '0'),
        comando: "P",
        status: 'Deslocando',
        productName: product.name,
        productImage: product.image,
        sequence: i + 1
      };
    });

    onAddWave({
      id: Math.random().toString(36).substr(2, 9),
      name: waveName,
      picks: newPicks,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  const handleAddManualPick = () => {
    const product = SAMPLE_PRODUCTS.find(p => p.name === currentManualPick.productName) || SAMPLE_PRODUCTS[0];
    const newPick: PickItem = {
      ...(currentManualPick as PickItem),
      id: Math.random().toString(36).substr(2, 9),
      orderId: formatOrderId(Math.floor(Math.random() * 1000000)),
      truckId: truckId,
      timestamp: format(new Date(), 'dd-MM-yyyy HH:mm:ss'),
      status: 'Deslocando',
      productImage: product.image,
      sequence: manualPicks.length + 1
    };
    setManualPicks([...manualPicks, newPick]);
  };

  const handleSaveManualWave = () => {
    if (manualPicks.length === 0) return;
    onAddWave({
      id: Math.random().toString(36).substr(2, 9),
      name: waveName,
      picks: manualPicks as PickItem[],
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  const handleSqlGenerate = async () => {
    setIsTestingSql(true);
    setSqlError(null);
    try {
      const response = await fetch('/api/sql-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: sqlConfig, query: sqlQuery })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao conectar');

      const data = result.data;
      if (!Array.isArray(data)) throw new Error('Dados inválidos retornados');

      const newPicks: PickItem[] = data.map((row: any, i: number) => {
        const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        return {
          id: Math.random().toString(36).substr(2, 9),
          orderId: String(row[sqlMapping.ORDER_ID] || formatOrderId(Math.floor(Math.random() * 1000000))),
          truckId: truckId,
          timestamp: String(row[sqlMapping.DATA] || format(new Date(), 'dd-MM-yyyy HH:mm:ss')),
          area: String(row[sqlMapping.AREA] || "RK"),
          zona: String(row[sqlMapping.ZONA] || "0"),
          corredor: String(row[sqlMapping.CORREDOR] || "001"),
          compartimento: String(row[sqlMapping.COMPARTIMENTO] || "001"),
          nivel: String(row[sqlMapping.NIVEL] || "01"),
          posicao: String(row[sqlMapping.POSICAO] || "01"),
          comando: String(row[sqlMapping.COMANDO] || "P"),
          status: (row[sqlMapping.STATUS] as PickStatus) || 'Deslocando',
          productName: product.name,
          productImage: product.image,
          sequence: i + 1
        };
      });

      onAddWave({
        id: Math.random().toString(36).substr(2, 9),
        name: waveName,
        picks: newPicks,
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err: any) {
      setSqlError(err.message);
    } finally {
      setIsTestingSql(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-background/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-surface-container-lowest w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg text-white">
              <Play size={20} fill="currentColor" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight uppercase">{t('sim_modal_title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-2 mb-6">
            <TabButton active={mode === 'list'} onClick={() => setMode('list')}>{t('saved_waves')}</TabButton>
            <TabButton active={mode === 'create'} onClick={() => setMode('create')}>{t('auto_generator')}</TabButton>
            <TabButton active={mode === 'manual'} onClick={() => setMode('manual')}>{t('manual_entry')}</TabButton>
            <TabButton active={mode === 'sql'} onClick={() => setMode('sql')}>{t('sql_server_tab')}</TabButton>
          </div>

          {mode === 'list' ? (
            <div className="flex flex-col gap-3">
              {waves.length === 0 ? (
                <div className="text-center py-12 text-outline flex flex-col items-center gap-2">
                  <RotateCcw size={40} strokeWidth={1} />
                  <p className="font-bold uppercase tracking-widest text-xs">{t('no_waves')}</p>
                </div>
              ) : (
                waves.map(w => (
                  <div 
                    key={w.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                      activeWaveId === w.id ? "border-primary bg-primary/5" : "border-outline-variant hover:border-outline"
                    )}
                  >
                    <button 
                      onClick={() => { onSelectWave(w.id); onClose(); }}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <div className="bg-surface-container p-2 rounded-lg">
                        <Package size={20} className="text-on-surface-variant" />
                      </div>
                      <div>
                        <p className="font-extrabold text-on-surface">{w.name}</p>
                        <p className="text-[10px] text-outline mono uppercase">{w.picks.length} {t('items_count')} | {format(new Date(w.createdAt), 'dd/MM HH:mm')}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {activeWaveId === w.id && <div className="bg-primary text-white text-[10px] px-2 py-1 rounded font-bold uppercase">{t('active_badge')}</div>}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteWave(w.id); }}
                        className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title={t('delete_wave')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : mode === 'create' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label={t('wave_name_label')} value={waveName} onChange={setWaveName} />
                <InputGroup label={t('num_items_label')} type="number" value={numPicks} onChange={(v) => setNumPicks(v === "" ? 0 : parseInt(v))} />
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <h4 className="text-xs font-extrabold uppercase text-on-surface-variant mb-3 flex items-center gap-2">
                  <ArrowRight size={14} /> Parâmetros de Localização
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <RangeInfo label={t('area')} value="RK" />
                  <RangeInfo label={t('zone')} value="0" />
                  <RangeInfo label={t('level')} value="01-08" />
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                className="bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg active:scale-95"
              >
                <Save size={20} /> {t('generate_wave_btn')}
              </button>
            </div>
          ) : mode === 'manual' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">{t('add_manual_title')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <SelectGroup 
                    label={t('select_product')} 
                    value={currentManualPick.productName || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, productName: v})}
                    options={SAMPLE_PRODUCTS.map(p => p.name)}
                    t={t}
                  />
                  <SelectGroup 
                    label={t('area')} 
                    value={currentManualPick.area || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, area: v})}
                    options={["RK", "WH", "ST"]}
                  />
                  <SelectGroup 
                    label={t('zone')} 
                    value={currentManualPick.zona || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, zona: v})}
                    options={["0", "1", "2", "3", "4"]}
                  />
                  <SelectGroup 
                    label={t('aisle')} 
                    value={currentManualPick.corredor || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, corredor: v})}
                    options={["001", "002", "003", "004", "005"]}
                  />
                  <SelectGroup 
                    label={t('comp')} 
                    value={currentManualPick.compartimento || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, compartimento: v})}
                    options={Array.from({length: 20}, (_, i) => (i+1).toString().padStart(3, '0'))}
                  />
                  <SelectGroup 
                    label={t('level')} 
                    value={currentManualPick.nivel || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, nivel: v})}
                    options={Array.from({length: 8}, (_, i) => (i+1).toString().padStart(2, '0'))}
                  />
                  <SelectGroup 
                    label={t('posicao')} 
                    value={currentManualPick.posicao || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, posicao: v})}
                    options={["01", "02"]}
                  />
                  <SelectGroup 
                    label={t('comando')} 
                    value={currentManualPick.comando || ""} 
                    onChange={(v) => setCurrentManualPick({...currentManualPick, comando: v})}
                    options={["P", "D"]}
                  />
                </div>
                <button 
                  onClick={handleAddManualPick}
                  className="bg-secondary text-white py-2 rounded-lg font-bold text-sm hover:bg-secondary/90 transition-colors mt-2"
                >
                  {t('add_item_btn')}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-extrabold uppercase text-outline tracking-widest">{t('items_selected')} ({manualPicks.length})</h4>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-2 no-scrollbar">
                  {manualPicks.length === 0 ? (
                    <p className="text-center py-4 text-outline text-[10px] uppercase font-bold">{t('no_items_added')}</p>
                  ) : manualPicks.map((p, idx) => (
                    <div key={idx} className="bg-surface-container p-3 rounded-lg flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="mono text-xs font-bold text-primary">#{idx+1}</span>
                        <span className="font-bold text-sm">{t(p.productName as any)}</span>
                      </div>
                      <span className="mono text-[10px] text-outline">{p.area}-{p.zona}-{p.corredor}-{p.compartimento}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
                <InputGroup label={t('wave_name_label')} value={waveName} onChange={setWaveName} />
                <button 
                  onClick={handleSaveManualWave}
                  disabled={manualPicks.length === 0}
                  className="bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50"
                >
                  <Save size={20} /> {t('save_manual_btn')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 flex flex-col gap-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Database size={16} /> {t('sql_server_tab')}
                </h3>
                <p className="text-xs text-outline">
                  {t('sql_server_desc')}
                </p>
                
                <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/20">
                  <p className="text-[10px] uppercase font-bold text-outline mb-1">{t('sql_query_current')}</p>
                  <code className="text-[10px] mono text-on-surface-variant break-all">{sqlQuery}</code>
                </div>
              </div>

              {sqlError && (
                <div className="bg-error/10 border border-error/20 p-4 rounded-xl text-error text-xs font-bold">
                  {t('sql_error_prefix')}: {sqlError}
                </div>
              )}

              <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
                <InputGroup label={t('wave_name_label')} value={waveName} onChange={setWaveName} />
                <button 
                  onClick={handleSqlGenerate}
                  disabled={isTestingSql || !sqlConfig.server}
                  className="bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg disabled:opacity-50"
                >
                  {isTestingSql ? <RotateCcw className="animate-spin" size={20} /> : <Database size={20} />} 
                  {isTestingSql ? t('connecting') : t('fetch_sql_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-3 rounded-xl font-bold text-[10px] tracking-widest transition-all border-2",
        active ? "bg-primary/10 border-primary text-primary" : "border-outline-variant text-outline hover:border-outline"
      )}
    >
      {children}
    </button>
  );
}

function InputGroup({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  const displayValue = (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) ? "" : value;
  
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-extrabold uppercase text-outline tracking-widest">{label}</label>
      <input 
        type={type} 
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container p-3 rounded-lg border-none focus:ring-2 focus:ring-primary font-bold"
      />
    </div>
  );
}

function SelectGroup({ label, value, onChange, options, t }: { label: string, value: string, onChange: (v: string) => void, options: string[], t?: any }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-extrabold uppercase text-outline tracking-widest">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container p-2 rounded-lg border-none focus:ring-2 focus:ring-primary font-bold text-sm"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>
            {t ? t(opt as any) : opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function RangeInfo({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/20 text-center">
      <p className="text-[9px] uppercase text-outline font-bold">{label}</p>
      <p className="text-sm font-extrabold mono">{value}</p>
    </div>
  );
}
