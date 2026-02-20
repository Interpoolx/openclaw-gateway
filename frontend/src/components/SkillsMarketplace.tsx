import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    Download,
    Shield,
    ExternalLink,
    Star,
    CheckCircle2,
    Loader2,
    Package,
    X
} from 'lucide-react';
import { browseSkills, installSkill, getInstalledSkills } from '../lib/api';
import { toast } from 'sonner';

interface SkillsMarketplaceProps {
    onClose: () => void;
}

export function SkillsMarketplace({ onClose }: SkillsMarketplaceProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const queryClient = useQueryClient();

    const { data: marketplaceSkills = [], isLoading: isMarketplaceLoading } = useQuery({
        queryKey: ['marketplace-skills'],
        queryFn: browseSkills,
    });

    const { data: installedSkills = [] } = useQuery({
        queryKey: ['installed-skills'],
        queryFn: getInstalledSkills,
    });

    const installMutation = useMutation({
        mutationFn: installSkill,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['installed-skills'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast.success(`Skill "${data.skill.name}" installed successfully!`);
            if (data.skill.securityStatus === 'flagged') {
                toast.warning('This skill has been flagged by security scan. Use with caution.');
            }
        },
        onError: () => {
            toast.error('Failed to install skill');
        }
    });

    const filteredSkills = marketplaceSkills
        .filter(skill => {
            const matchesSearch = skill.name.toLowerCase().includes(search.toLowerCase()) ||
                skill.description?.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => (b.installs || 0) - (a.installs || 0));

    const isInstalled = (skillId: string) => {
        return installedSkills.some(s => s.skillId === skillId);
    };

    const categories = ['all', 'coding', 'productivity', 'marketing', 'tools', 'creative'];

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300"
            style={{
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            <div
                className="w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] transform transition-all duration-500 animate-in fade-in zoom-in-95"
                style={{
                    background: 'rgba(15, 15, 18, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                {/* Header with Vibrant Gradient */}
                <div
                    className="p-8 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="p-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div
                                    className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                >
                                    <Package className="w-6 h-6 text-blue-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">
                                    ClawHub <span className="text-blue-400">Marketplace</span>
                                </h1>
                            </div>
                            <p className="text-sm text-gray-400 max-w-md font-medium">
                                Discover and deploy high-performance skills to augment your agent's capabilities across any environment.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/10"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full" />
                    <div className="absolute bottom-[-20px] left-[10%] w-20 h-20 bg-purple-500/10 blur-[40px] rounded-full" />
                </div>

                {/* Sub-Header: Search and Filters */}
                <div
                    className="px-8 py-5 border-b flex flex-col md:flex-row gap-6 items-center"
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find powerful new skills..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            style={{ backdropFilter: 'blur(10px)' }}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap border ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)]'
                                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Skills Grid */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isMarketplaceLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-white tracking-wide">Syncing with ClawHub</p>
                                <p className="text-sm text-gray-500 mt-1">Fetching latest skills and security patches...</p>
                            </div>
                        </div>
                    ) : filteredSkills.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredSkills.map(skill => (
                                <div
                                    key={skill.id}
                                    className="skill-card group flex flex-col h-full relative"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/20 transition-all shadow-inner">
                                            <Package className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl shadow-lg">
                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                            <span className="text-xs font-black text-white">{skill.rating}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{skill.name}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-500 uppercase tracking-tighter">
                                            {skill.category}
                                        </span>
                                        <span className="text-[11px] font-medium text-gray-500">• by {skill.author}</span>
                                    </div>

                                    <p className="text-sm text-gray-400 mb-6 leading-relaxed line-clamp-3 flex-1">{skill.description}</p>

                                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[10px] text-green-500 uppercase tracking-widest font-black">
                                                <Shield className="w-3.5 h-3.5" />
                                                Verified
                                            </div>
                                            <span className="text-xs text-gray-500 font-bold">{skill.installs.toLocaleString()} active users</span>
                                        </div>

                                        {isInstalled(skill.id) ? (
                                            <div className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-500 rounded-xl text-xs font-black border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                                <CheckCircle2 className="w-4 h-4" />
                                                READY
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => installMutation.mutate(skill)}
                                                disabled={installMutation.isPending}
                                                className="install-button flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-900/40 active:scale-95 border border-blue-400/20"
                                            >
                                                {installMutation.isPending && installMutation.variables?.id === skill.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Download className="w-4 h-4" />
                                                )}
                                                INSTALL
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-[30px] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                                <Search className="w-10 h-10 text-gray-700" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Algorithm failed to find skill</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">We couldn't find any results matching your technical specifications.</p>
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-bold border border-white/5 transition-all"
                            >
                                Reset Infrastructure Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer with Premium Feel */}
                <div
                    className="px-8 py-5 border-t flex flex-col sm:flex-row justify-between items-center gap-4"
                    style={{ background: 'rgba(10, 10, 12, 0.95)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                    <div className="flex items-center gap-6 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                        <span className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-green-500" />
                            Secure Core Scan Active
                        </span>
                        <div className="w-1 h-1 bg-white/10 rounded-full hidden sm:block" />
                        <span className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            v2.4 Tier-1 Verified
                        </span>
                    </div>
                    <a
                        href="https://clawhub.ai/skills"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 font-black text-xs uppercase tracking-tighter"
                    >
                        Extensibility Protocol
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .skill-card:hover {
                    transform: translateY(-4px) scale(1.01);
                    background: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(59, 130, 246, 0.2) !important;
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.05) !important;
                }
                .install-button {
                    position: relative;
                    overflow: hidden;
                }
                .install-button::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        transparent,
                        rgba(255, 255, 255, 0.1),
                        transparent
                    );
                    transform: rotate(45deg);
                    transition: 0.5s;
                }
                .install-button:hover::after {
                    left: 100%;
                }
            `}</style>
        </div>
    );
}
