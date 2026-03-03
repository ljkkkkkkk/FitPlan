/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Utensils, 
  User, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Flame, 
  Target, 
  Calendar,
  ArrowLeft,
  Loader2,
  Trophy,
  Scale,
  LineChart
} from 'lucide-react';
import { generateFitnessPlan, UserProfile, apiKey } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Plan {
  dailyCalories: number;
  estimatedTimeframe: string;
  advice: string;
  weeklyWorkouts: any[];
  dailyMeals: any[];
}

interface Log {
  date: string;
  weight: number;
  calories_in: number;
  calories_out: number;
  completed_workout: boolean;
}

// --- Components ---

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={cn("bg-white rounded-2xl p-6 shadow-sm border border-black/5", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  id
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
  id?: string;
}) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "bg-black text-white hover:bg-black/90",
    outline: "border border-black/10 hover:bg-black/5"
  };
  
  const handleClick = (e: React.MouseEvent) => {
    console.log("Button clicked:", id || children?.toString());
    if (onClick) onClick();
  };

  return (
    <button 
      id={id}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 touch-manipulation",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [userEmail] = useState("imjinagyq@gmail.com"); // From context
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("正在获取数据...");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'meals' | 'progress'>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyTasks, setDailyTasks] = useState({
    workout: false,
    breakfast: false,
    lunch: false,
    dinner: false,
    water: 0
  });

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchUserData();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const savedTasks = localStorage.getItem(`tasks_${dateStr}`);
    if (savedTasks) setDailyTasks(JSON.parse(savedTasks));
  }, []);

  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    console.log("Logs state updated:", logs.length, "entries");
    setLastUpdated(new Date().toLocaleTimeString());
  }, [logs]);

  useEffect(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem(`tasks_${dateStr}`, JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    console.log("Loading user data from localStorage");
    try {
      const savedData = localStorage.getItem('fitflow_user_data');
      if (savedData) {
        const data = JSON.parse(savedData);
        setProfile(data.profile);
        setPlan(data.plan);
        fetchLogs();
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Load error:", err);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    console.log("Loading logs from localStorage");
    const savedLogs = localStorage.getItem('fitflow_logs');
    if (savedLogs) {
      const data = JSON.parse(savedLogs);
      console.log("Logs loaded:", data.length, "entries");
      setLogs(data);
    }
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
    if (!plan || !profile) return;
    try {
      const newData = { profile, plan: updatedPlan };
      localStorage.setItem('fitflow_user_data', JSON.stringify(newData));
      setPlan(updatedPlan);
      setIsEditingPlan(false);
      setEditingDayIdx(null);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateMaintenance = (p: UserProfile) => {
    const bmr = p.gender === 'male' 
      ? (10 * p.weight) + (6.25 * p.height) - (5 * p.age) + 5
      : (10 * p.weight) + (6.25 * p.height) - (5 * p.age) - 161;
    
    const activityFactors: Record<string, number> = {
      'beginner': 1.2,
      'intermediate': 1.375,
      'advanced': 1.55
    };
    return Math.round(bmr * (activityFactors[p.level] || 1.2));
  };

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    setLoading(true);
    setLoadingMessage("AI 正在分析您的体质...");
    
    const messages = [
      "正在计算您的基础代谢率...",
      "正在为您编排科学训练动作...",
      "正在生成定制营养食谱...",
      "正在优化您的减脂周期..."
    ];
    
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIdx % messages.length]);
      msgIdx++;
    }, 2500);

    try {
      const generatedPlan = await generateFitnessPlan(newProfile);
      setLoadingMessage("正在保存您的专属计划...");
      
      const userData = { profile: newProfile, plan: generatedPlan };
      localStorage.setItem('fitflow_user_data', JSON.stringify(userData));

      setProfile(newProfile);
      setPlan(generatedPlan);
      setShowOnboarding(false);
      setActiveTab('dashboard');
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Onboarding error:", err);
      alert("生成计划失败，请检查网络并重试。");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <h2 className="text-2xl font-semibold text-stone-900">{loadingMessage}</h2>
        <p className="text-stone-500 mt-2 max-w-xs">我们的 AI 正在为您打造科学的健身与营养之旅，请稍候。</p>
      </div>
    );
  }

  if (showOnboarding && !apiKey) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-rose-100 max-w-md">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">未检测到 API Key</h2>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            请在 Vercel 后台设置环境变量 <code className="bg-stone-100 px-1 rounded text-rose-600">VITE_GEMINI_API_KEY</code> 并重新部署应用。
          </p>
          <Button onClick={() => window.location.reload()} className="w-full bg-stone-900">刷新页面</Button>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">FitFlow AI 健身</h1>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">个性化健身旅程</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center border border-black/5">
          <User className="w-5 h-5 text-stone-600" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Daily Progress Bar */}
              <Card className="bg-white">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-bold text-lg">今日进度</h3>
                    <p className="text-xs text-stone-500">完成每日任务以达成目标</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-600">
                    {Math.round(((Object.values(dailyTasks).filter(v => v === true).length + (dailyTasks.water >= 8 ? 1 : 0)) / 5) * 100)}%
                  </p>
                </div>
                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((Object.values(dailyTasks).filter(v => v === true).length + (dailyTasks.water >= 8 ? 1 : 0)) / 5) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {[
                    { key: 'workout', icon: <Dumbbell className="w-4 h-4" />, label: '训练' },
                    { key: 'breakfast', icon: <Utensils className="w-4 h-4" />, label: '早' },
                    { key: 'lunch', icon: <Utensils className="w-4 h-4" />, label: '中' },
                    { key: 'dinner', icon: <Utensils className="w-4 h-4" />, label: '晚' },
                    { key: 'water', icon: <Flame className="w-4 h-4" />, label: '水' },
                  ].map((task) => (
                    <button
                      key={task.key}
                      onClick={() => {
                        if (task.key === 'water') {
                          setDailyTasks(prev => ({ ...prev, water: Math.min(prev.water + 1, 10) }));
                        } else {
                          setDailyTasks(prev => ({ ...prev, [task.key]: !prev[task.key as keyof typeof dailyTasks] }));
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                        (task.key === 'water' ? dailyTasks.water >= 8 : dailyTasks[task.key as keyof typeof dailyTasks])
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-white border-stone-100 text-stone-400"
                      )}
                    >
                      {task.icon}
                      <span className="text-[10px] font-bold">{task.key === 'water' ? `${dailyTasks.water}/8` : task.label}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Daily Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-50 border-emerald-100">
                  <Flame className="w-6 h-6 text-emerald-600 mb-2" />
                  <p className="text-sm font-medium text-emerald-800">目标热量</p>
                  <p className="text-2xl font-bold text-emerald-950">{plan?.dailyCalories} 千卡</p>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                  <Target className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-blue-800">当前目标</p>
                  <p className="text-lg font-bold text-blue-950 capitalize">{profile?.goal === 'lose weight' ? '减脂' : profile?.goal === 'build muscle' ? '增肌' : profile?.goal === 'get fit' ? '塑形' : '维持健康'}</p>
                </Card>
              </div>

              {/* Today's Workout */}
              <Card id="today-workout">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">今日训练</h3>
                  <span className="text-xs font-bold px-2 py-1 bg-stone-100 rounded-lg text-stone-600 uppercase tracking-wide">
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
                  </span>
                </div>
                {plan?.weeklyWorkouts?.[new Date().getDay()]?.type === 'rest' ? (
                  <div className="text-center py-4">
                    <p className="text-stone-500">今天是休息日！好好恢复身体。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-6 h-6 text-stone-600" />
                      </div>
                      <div>
                        <p className="font-bold">{plan?.weeklyWorkouts?.[new Date().getDay()]?.title}</p>
                        <p className="text-sm text-stone-500">{plan?.weeklyWorkouts?.[new Date().getDay()]?.exercises?.length || 0} 个动作</p>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => setActiveTab('workout')}>
                      开始训练 <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>

              {/* Meal Plan Preview */}
              <Card id="meal-preview">
                <h3 className="font-bold text-lg mb-4">今日食谱</h3>
                <div className="space-y-3">
                  {[
                    { key: 'breakfast', label: '早餐' },
                    { key: 'lunch', label: '午餐' },
                    { key: 'dinner', label: '晚餐' }
                  ].map((meal) => (
                    <div key={meal.key} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-black/5">
                      <div className="flex items-center gap-3">
                        <Utensils className="w-4 h-4 text-stone-400" />
                        <div>
                          <p className="text-xs font-bold uppercase text-stone-400">{meal.label}</p>
                          <p className="text-sm font-medium">{(plan?.dailyMeals?.[new Date().getDay()] as any)?.[meal.key]?.name}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-stone-500">{(plan?.dailyMeals?.[new Date().getDay()] as any)?.[meal.key]?.calories} 千卡</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'workout' && (
            <motion.div 
              key="workout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('dashboard')} className="p-2 bg-white rounded-lg border border-black/5">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold">健身计划</h2>
                </div>
                <Button 
                  variant="outline" 
                  className="py-2 px-4 text-sm"
                  onClick={() => setIsEditingPlan(!isEditingPlan)}
                >
                  {isEditingPlan ? "取消编辑" : "编辑计划"}
                </Button>
              </div>

              {plan?.weeklyWorkouts?.map((day, idx) => (
                <Card key={idx} className={cn(idx === new Date().getDay() && "border-emerald-500 ring-1 ring-emerald-500")}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-stone-400 uppercase text-xs tracking-widest">{day.day}</h4>
                    <div className="flex gap-2">
                      {day.type === 'rest' && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">休息</span>}
                      {isEditingPlan && (
                        <button 
                          onClick={() => setEditingDayIdx(editingDayIdx === idx ? null : idx)}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          修改动作
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {editingDayIdx === idx ? (
                    <EditDayForm 
                      day={day} 
                      onSave={(updatedDay) => {
                        const newWorkouts = [...plan.weeklyWorkouts];
                        newWorkouts[idx] = updatedDay;
                        handleUpdatePlan({ ...plan, weeklyWorkouts: newWorkouts });
                      }} 
                    />
                  ) : (
                    <>
                      <h3 className="text-lg font-bold mb-4">{day.title}</h3>
                      <div className="space-y-3">
                        {day.exercises?.map((ex: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                            <div className="mt-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                            <div>
                              <p className="font-bold text-sm">{ex.name}</p>
                              <p className="text-xs text-stone-500">
                                {ex.sets && `${ex.sets} 组 × `}{ex.reps || ex.duration}
                                {ex.intensity && ` • 强度: ${ex.intensity}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'meals' && (
            <motion.div 
              key="meals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">营养指南</h2>
              <Card className="bg-emerald-900 text-white">
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">AI 建议</p>
                <p className="text-sm leading-relaxed">{plan?.advice}</p>
              </Card>

              {plan?.dailyMeals?.map((day, idx) => (
                <Card key={idx}>
                  <h4 className="font-bold text-stone-400 uppercase text-xs tracking-widest mb-4">{day.day}</h4>
                  <div className="grid gap-4">
                    {[
                      { key: 'breakfast', label: '早餐' },
                      { key: 'lunch', label: '午餐' },
                      { key: 'dinner', label: '晚餐' },
                      { key: 'snacks', label: '加餐' }
                    ].map((meal) => (
                      <div key={meal.key} className="flex justify-between items-center border-b border-stone-100 pb-2 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-stone-400 uppercase">{meal.label}</p>
                          <p className="text-sm font-medium">{(day as any)[meal.key]?.name}</p>
                        </div>
                        <p className="text-xs font-bold text-stone-600">{(day as any)[meal.key]?.calories} 千卡</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">您的统计</h2>
                  <p className="text-xs text-stone-400">实时计算您的减脂效率</p>
                </div>
              </div>
              
              <CalorieCalculator maintenance={profile ? calculateMaintenance(profile) : 0} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 flex justify-between items-center z-40">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Calendar />} label="首页" />
        <NavButton active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} icon={<Dumbbell />} label="训练" />
        <NavButton active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} icon={<Utensils />} label="饮食" />
        <NavButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<LineChart />} label="统计" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors",
        active ? "text-emerald-600" : "text-stone-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" } as any)}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<UserProfile>({
    height: 170,
    weight: 70,
    age: 25,
    gender: 'male',
    goal: 'lose weight',
    level: 'beginner',
    targetWeight: 65
  });

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-stone-50 p-6 flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center space-y-8">
        <div className="space-y-2">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-emerald-600" : "bg-stone-200")} />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-stone-900">
            {step === 1 && "请介绍一下您自己"}
            {step === 2 && "您的目标是什么？"}
            {step === 3 && "您的健身水平"}
          </h2>
          <p className="text-stone-500">我们将根据这些信息为您定制专属计划。</p>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase">身高 (cm)</label>
                  <input type="number" value={data.height} onChange={e => setData({...data, height: +e.target.value})} className="w-full p-4 bg-white rounded-xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase">体重 (kg)</label>
                  <input type="number" value={data.weight} onChange={e => setData({...data, weight: +e.target.value})} className="w-full p-4 bg-white rounded-xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase">年龄</label>
                  <input type="number" value={data.age} onChange={e => setData({...data, age: +e.target.value})} className="w-full p-4 bg-white rounded-xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase">性别</label>
                  <select value={data.gender} onChange={e => setData({...data, gender: e.target.value})} className="w-full p-4 bg-white rounded-xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'lose weight', label: '减轻体重' },
                  { id: 'build muscle', label: '增加肌肉' },
                  { id: 'get fit', label: '强身健体' },
                  { id: 'maintain', label: '维持现状' }
                ].map(g => (
                  <button 
                    key={g.id}
                    onClick={() => setData({...data, goal: g.id})}
                    className={cn(
                      "p-4 rounded-xl border text-left font-medium transition-all",
                      data.goal === g.id ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-black/5 hover:bg-stone-50"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase">目标体重 (kg)</label>
                <input type="number" value={data.targetWeight} onChange={e => setData({...data, targetWeight: +e.target.value})} className="w-full p-4 bg-white rounded-xl border border-black/5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'beginner', label: '初学者' },
                  { id: 'intermediate', label: '有一定基础' },
                  { id: 'advanced', label: '健身达人' }
                ].map(l => (
                  <button 
                    key={l.id}
                    onClick={() => setData({...data, level: l.id})}
                    className={cn(
                      "p-4 rounded-xl border text-left font-medium transition-all",
                      data.level === l.id ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-black/5 hover:bg-stone-50"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          {step > 1 && <Button variant="outline" onClick={prev} className="flex-1">返回</Button>}
          <Button onClick={step === 3 ? () => onComplete(data) : next} className="flex-1">
            {step === 3 ? "生成计划" : "继续"}
          </Button>
        </div>
      </div>
    </div>
  );
}


function CalorieCalculator({ maintenance }: { maintenance: number }) {
  const [calIn, setCalIn] = useState(0);
  const [calOut, setCalOut] = useState(0);

  const deficit = maintenance - calIn + calOut;
  const weightLost = deficit / 7700;

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <h3 className="font-bold text-lg">实时热量缺口计算器</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">您的基础代谢 (BMR/TDEE)</label>
            <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-black/5">
              <span className="font-bold text-stone-600">{maintenance}</span>
              <span className="text-xs text-stone-400">kcal</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">今日摄入热量</label>
            <div className="relative">
              <input 
                type="number" 
                value={calIn || ''} 
                onChange={e => setCalIn(+e.target.value)} 
                placeholder="输入摄入热量..."
                className="w-full p-4 bg-stone-50 rounded-xl border border-black/5 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">kcal</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">今日运动消耗</label>
            <div className="relative">
              <input 
                type="number" 
                value={calOut || ''} 
                onChange={e => setCalOut(+e.target.value)} 
                placeholder="输入消耗热量..."
                className="w-full p-4 bg-stone-50 rounded-xl border border-black/5 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">kcal</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">今日热量缺口</p>
            <p className={cn("text-5xl font-black tracking-tighter", deficit > 0 ? "text-emerald-600" : "text-rose-500")}>
              {deficit > 0 ? '+' : ''}{deficit}
              <span className="text-sm font-bold ml-1">kcal</span>
            </p>
          </div>

          <div className="h-px bg-emerald-100 w-full" />

          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">预计今日减重</p>
            <p className="text-4xl font-black text-emerald-950 tracking-tighter">
              {weightLost > 0 ? weightLost.toFixed(3) : '0.000'}
              <span className="text-sm font-bold ml-1">kg</span>
            </p>
            <p className="text-[10px] text-emerald-600/60 font-medium">约 {((weightLost > 0 ? weightLost : 0) * 1000).toFixed(0)} 克脂肪</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-stone-50 rounded-xl border border-black/5">
        <p className="text-xs text-stone-500 leading-relaxed">
          <span className="font-bold text-stone-700">计算原理：</span>
          减重重量 = (基础代谢 - 摄入热量 + 运动消耗) / 7700。
          科学研究表明，每消耗 7700 大卡热量约可减掉 1 公斤纯脂肪。
        </p>
      </div>
    </Card>
  );
}

function EditDayForm({ day, onSave }: { day: any, onSave: (updatedDay: any) => void }) {
  const [editedDay, setEditedDay] = useState(day);

  const handleAddExercise = () => {
    setEditedDay({
      ...editedDay,
      exercises: [...editedDay.exercises, { name: "新动作", sets: "3", reps: "12" }]
    });
  };

  const handleRemoveExercise = (idx: number) => {
    const newExercises = editedDay.exercises.filter((_: any, i: number) => i !== idx);
    setEditedDay({ ...editedDay, exercises: newExercises });
  };

  const handleExerciseChange = (idx: number, field: string, value: string) => {
    const newExercises = [...editedDay.exercises];
    newExercises[idx] = { ...newExercises[idx], [field]: value };
    setEditedDay({ ...editedDay, exercises: newExercises });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-400 uppercase">训练标题</label>
        <input 
          value={editedDay.title} 
          onChange={e => setEditedDay({...editedDay, title: e.target.value})}
          className="w-full p-2 bg-stone-50 rounded-lg border border-black/5"
        />
      </div>
      
      <div className="space-y-3">
        <p className="text-xs font-bold text-stone-400 uppercase">动作列表</p>
        {editedDay.exercises?.map((ex: any, i: number) => (
          <div key={i} className="p-3 bg-stone-50 rounded-xl border border-black/5 space-y-2">
            <div className="flex justify-between items-center">
              <input 
                value={ex.name} 
                onChange={e => handleExerciseChange(i, 'name', e.target.value)}
                className="font-bold text-sm bg-transparent border-b border-stone-200 focus:border-emerald-500 outline-none"
              />
              <button onClick={() => handleRemoveExercise(i)} className="text-rose-500 text-xs">删除</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                placeholder="组数" 
                value={ex.sets} 
                onChange={e => handleExerciseChange(i, 'sets', e.target.value)}
                className="text-xs p-1 bg-white rounded border border-black/5"
              />
              <input 
                placeholder="次数/时长" 
                value={ex.reps} 
                onChange={e => handleExerciseChange(i, 'reps', e.target.value)}
                className="text-xs p-1 bg-white rounded border border-black/5"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 py-2 text-xs" onClick={handleAddExercise}>添加动作</Button>
        <Button className="flex-1 py-2 text-xs" onClick={() => onSave(editedDay)}>保存修改</Button>
      </div>
    </div>
  );
}
