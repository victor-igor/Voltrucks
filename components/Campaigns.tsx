import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    Megaphone,
    Image as ImageIcon,
    Video,
    Type,
    UploadCloud,
    Clock,
    Send,
    Users,
    CheckCircle2,
    Smartphone,
    Plus,
    BarChart2,
    AlertCircle,
    MessageCircle,
    ArrowLeft,
    MoreVertical,
    Trash2,
    Edit2,
    Copy,
    Calendar as CalendarIcon,
    XCircle,
    Download,
    Search,
    Filter,
    Check,
    CheckCheck,
    X,
    Repeat,
    Shield
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { createCampaign, updateCampaign, updateCampaignStatus, listCampaigns, deleteCampaign, getCampaignStats, listMessageTemplates, Campaign, CampaignType, RecurrenceRule, MessageType, WhatsAppTemplate } from '../lib/campaigns';
import { getTags, Tag } from '../lib/contacts';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

type ViewMode = 'list' | 'create' | 'report';
type TimeRange = 'today' | '7days' | '30days' | 'custom';

export const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const { success, error: toastError } = useToast();

    // --- Filter State ---
    const [timeRange, setTimeRange] = useState<TimeRange>('30days');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // --- Report Filter State ---
    const [reportTimeRange, setReportTimeRange] = useState<TimeRange>('30days');
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');

    // --- Form State ---
    const [campaignName, setCampaignName] = useState('');
    const [provider, setProvider] = useState<'official' | 'unofficial'>('official'); // Default Provider
    const [audience, setAudience] = useState('all');

    // Template State
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Audience Tags
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);



    // Legacy State (mostly unused now but kept for type compatibility or fallbacks if needed)
    const [messageType, setMessageType] = useState<MessageType>('template');
    const [messageText, setMessageText] = useState(''); // Will store template body text for preview
    const [messageVariations, setMessageVariations] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);

    const [campaignType, setCampaignType] = useState<CampaignType>('instant');
    const [scheduleTime, setScheduleTime] = useState('');
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceTimes, setRecurrenceTimes] = useState<string[]>(['09:00']);
    const [dailyLimit, setDailyLimit] = useState<number | ''>(''); // Throttling

    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview State
    const [previewIndex, setPreviewIndex] = useState(0);

    const [stats, setStats] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const getReportDateRange = () => {
        const end = new Date();
        let start = new Date();

        switch (reportTimeRange) {
            case 'today':
                start = new Date();
                start.setHours(0, 0, 0, 0);
                return { start: start.toISOString(), end: end.toISOString() };
            case '7days':
                start.setDate(end.getDate() - 7);
                return { start: start.toISOString(), end: end.toISOString() };
            case '30days':
                start.setDate(end.getDate() - 30);
                return { start: start.toISOString(), end: end.toISOString() };
            case 'custom':
                if (reportStartDate && reportEndDate) {
                    return { start: reportStartDate, end: reportEndDate };
                }
                return null;
            default:
                return null;
        }
    };

    const loadReportStats = async (campaignId: string) => {
        try {
            setLoading(true);
            setCurrentPage(1);
            const range = getReportDateRange();
            const data = await getCampaignStats(campaignId, range?.start, range?.end);
            setStats(data);
        } catch (err) {
            console.error(err);
            toastError('Erro ao carregar estatísticas');
        } finally {
            setLoading(false);
        }
    };

    // Reload stats when filters change
    useEffect(() => {
        if (viewMode === 'report' && selectedCampaignId) {
            loadReportStats(selectedCampaignId);
        }
    }, [reportTimeRange, reportStartDate, reportEndDate]);

    const handleViewReport = (campaignId: string) => {
        navigate(`/campaigns/report/${campaignId}`);
    };

    // --- Variation Handlers ---
    const handleAddVariation = () => {
        setMessageVariations([...messageVariations, '']);
    };

    const handleRemoveVariation = (index: number) => {
        const newVariations = [...messageVariations];
        newVariations.splice(index, 1);
        setMessageVariations(newVariations);
    };

    const handleVariationChange = (index: number, value: string) => {
        const newVariations = [...messageVariations];
        newVariations[index] = value;
        setMessageVariations(newVariations);
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    // Cycle preview every 3 seconds if there are variations
    useEffect(() => {
        if (messageVariations.length > 0) {
            const interval = setInterval(() => {
                setPreviewIndex(prev => (prev + 1) % (messageVariations.length + 1));
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setPreviewIndex(0);
        }
    }, [messageVariations]);

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const data = await listCampaigns();
            setCampaigns(data);
        } catch (err: any) {
            console.error('Error loading campaigns:', err);
            toastError('Erro ao carregar campanhas');
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (viewMode === 'create') {
            fetchTemplates();
        }
    }, [viewMode]);

    const fetchTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const data = await listMessageTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toastError('Erro ao carregar templates do WhatsApp');
        } finally {
            setLoadingTemplates(false);
        }
    };

    // Restore selected template and text when editing
    useEffect(() => {
        if (viewMode === 'create' && selectedCampaignId && campaigns.length > 0 && templates.length > 0 && !selectedTemplate) {
            const campaign = campaigns.find(c => c.id === selectedCampaignId);
            if (campaign && campaign.template_name) {
                const tmpl = templates.find(t => t.name === campaign.template_name && t.language === campaign.template_language);
                if (tmpl) {
                    setSelectedTemplate(tmpl);
                    // Extract body text to ensure it's saved correctly
                    const bodyComponent = tmpl.components.find(c => c.type === 'BODY');
                    setMessageText(bodyComponent?.text || '');
                }
            }
        }
    }, [templates, selectedCampaignId, viewMode, campaigns, selectedTemplate]);

    const loadTags = async () => {
        try {
            const tags = await getTags();
            setAvailableTags(tags);
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    };

    useEffect(() => {
        loadTags();
    }, []);

    const handleTemplateSelect = (templateName: string) => {
        const template = templates.find(t => t.name === templateName);
        setSelectedTemplate(template || null);

        // Extract body text for simple preview/storage
        if (template) {
            const bodyComponent = template.components.find(c => c.type === 'BODY');
            setMessageText(bodyComponent?.text || '');
        } else {
            setMessageText('');
        }
    };

    const handleEditClick = (campaign: Campaign) => {
        navigate(`/campaigns/edit/${campaign.id}`);
    };

    const resetForm = () => {
        setCampaignName('');
        setCampaignType('instant');
        setAudience('all');
        setScheduleTime('');
        setRecurrenceDays([]);
        setRecurrenceTimes(['09:00']);
        setSelectedTemplate(null);
        setProvider('official'); // default
        setDailyLimit(undefined);
        setSelectedCampaignId(null);
        setMessageType('template');
        setMessageText('');
        setFile(null);
    };

    const populateForm = (campaign: Campaign) => {
        setCampaignName(campaign.name);
        setCampaignType(campaign.type);
        setScheduleTime(campaign.schedule_time || '');
        if (campaign.recurrence_rule) {
            setRecurrenceDays(campaign.recurrence_rule.days);
            setRecurrenceTimes(campaign.recurrence_rule.times);
        } else {
            setRecurrenceDays([]);
            setRecurrenceTimes(['09:00']);
        }

        if (campaign.audience_filter) {
            if (campaign.audience_filter.type === 'tag' && campaign.audience_filter.value) {
                setAudience(campaign.audience_filter.value);
            } else {
                setAudience(campaign.audience_filter.type);
            }
        } else {
            setAudience('all');
        }

        if (campaign.template_text) {
            setMessageText(campaign.template_text);
        }

        setDailyLimit(campaign.daily_limit);
        setProvider(campaign.provider || 'official');
        setMessageType(campaign.message_type);
        setCustomStartDate('');
        setCustomEndDate('');

        if (campaign.provider === 'unofficial') {
            const variations = campaign.message_variations || [];
            if (variations.length > 0) {
                setMessageText(variations[0]);
                setMessageVariations(variations.slice(1));
            } else {
                setMessageVariations([]);
            }
        } else {
            setMessageVariations([]);
        }
    };

    // Sync URL with State
    useEffect(() => {
        const path = location.pathname;
        if (path === '/campaigns/new') {
            if (viewMode !== 'create' || selectedCampaignId !== null) {
                resetForm();
                setViewMode('create');
                setSelectedCampaignId(null);
            }
        } else if (path.startsWith('/campaigns/edit/')) {
            const id = path.split('/').pop();
            if (id) {
                if (selectedCampaignId !== id) {
                    const campaign = campaigns.find(c => c.id === id);
                    if (campaign) {
                        populateForm(campaign);
                        setSelectedCampaignId(id);
                        setViewMode('create');
                    }
                }
            }
        } else if (path.startsWith('/campaigns/report/')) {
            const id = path.split('/').pop();
            if (id) {
                if (selectedCampaignId !== id || viewMode !== 'report') {
                    setSelectedCampaignId(id);
                    setViewMode('report');
                    loadReportStats(id);
                }
            }
        } else {
            if (viewMode !== 'list') {
                setViewMode('list');
                resetForm();
            }
        }
    }, [location.pathname, campaigns, loading]);

    const handleCreateCampaign = async () => {
        if (isSubmitting) return;

        if (!campaignName) {
            toastError('Nome da campanha é obrigatório');
            return;
        }


        if (campaignType === 'scheduled' && !scheduleTime) {
            toastError('Selecione a data e hora do agendamento');
            return;
        }

        if (campaignType === 'recurring' && (recurrenceDays.length === 0 || recurrenceTimes.length === 0)) {
            toastError('Configure a recorrência corretamente');
            return;
        }

        setIsSubmitting(true);

        const recurrenceRule: RecurrenceRule | undefined = campaignType === 'recurring'
            ? { days: recurrenceDays, times: recurrenceTimes }
            : undefined;

        const audienceFilter = {
            type: audience === 'all' ? 'all' : 'tag',
            value: audience === 'all' ? undefined : audience
        };

        let templateData: { template_name?: string; template_language?: string } = {};

        if (provider === 'official') {
            if (!selectedTemplate) {
                toastError('Selecione um template para enviar');
                return;
            }
            // Official uses template structure
            templateData = {
                template_name: selectedTemplate.name,
                template_language: selectedTemplate.language
            };
        } else {
            // Unofficial uses raw text/media
            if (!messageText) {
                toastError('Digite o texto da mensagem');
                return;
            }
        }

        let mediaUrl: string | undefined = undefined;
        if (provider === 'unofficial' && file) {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('campaign-media')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Upload Error:', uploadError);
                    toastError('Erro ao fazer upload da mídia');
                    setIsSubmitting(false);
                    return;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('campaign-media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrl;
            } catch (error) {
                console.error('Media processing error:', error);
                toastError('Erro ao processar arquivo de mídia');
                setIsSubmitting(false);
                return;
            }
        }

        const allVariations = provider === 'unofficial'
            ? [messageText, ...messageVariations].filter(v => v.trim() !== '')
            : [selectedTemplate?.name || ''];

        const campaignData = {
            name: campaignName,
            type: campaignType,
            schedule_time: campaignType === 'scheduled' ? new Date(scheduleTime).toISOString() : undefined,
            recurrence_rule: recurrenceRule,
            audience_filter: audienceFilter,
            message_type: provider === 'official' ? 'template' : messageType,
            media_url: mediaUrl,
            daily_limit: dailyLimit ? Number(dailyLimit) : undefined,
            message_variations: allVariations,
            template_text: messageText || selectedTemplate?.components.find(c => c.type === 'BODY')?.text || '',
            ...templateData,
            provider: provider // Add provider field
        };

        try {
            if (selectedCampaignId) {
                await updateCampaign(selectedCampaignId, campaignData);
                success('Campanha atualizada com sucesso!');
            } else {
                await createCampaign(campaignData);
                success('Campanha criada com sucesso!');
            }

            loadCampaigns();
            setViewMode('list');
            resetForm();
        } catch (err: any) {
            console.error('Error creating campaign:', err);
            toastError('Erro ao salvar campanha: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setCampaignToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!campaignToDelete) return;

        try {
            setIsDeleting(true);
            await deleteCampaign(campaignToDelete);
            success('Campanha excluída com sucesso!');
            loadCampaigns();
            setDeleteModalOpen(false);
            setCampaignToDelete(null);
        } catch (err: any) {
            console.error('Error deleting campaign:', err);
            toastError('Erro ao excluir campanha');
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleRecurrenceDay = (day: number) => {
        setRecurrenceDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'paused' : 'active';
            // Optimistic update
            setCampaigns(prev => prev.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            ));

            await updateCampaignStatus(id, newStatus);
            success(`Campanha ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso!`);
        } catch (err) {
            console.error('Error toggling status:', err);
            toastError('Erro ao alterar status da campanha');
            loadCampaigns(); // Revert on error
        }
    };

    // --- Filter Logic ---
    const filteredCampaigns = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        return campaigns.filter(camp => {
            const campDate = new Date(camp.created_at).getTime();

            if (timeRange === 'today') {
                return campDate >= todayStart;
            }
            if (timeRange === '7days') {
                const sevenDaysAgo = todayStart - (7 * 24 * 60 * 60 * 1000);
                return campDate >= sevenDaysAgo;
            }
            if (timeRange === '30days') {
                const thirtyDaysAgo = todayStart - (30 * 24 * 60 * 60 * 1000);
                return campDate >= thirtyDaysAgo;
            }
            if (timeRange === 'custom') {
                const start = customStartDate ? new Date(customStartDate).getTime() : 0;
                const end = customEndDate ? new Date(customEndDate).getTime() + (24 * 60 * 60 * 1000) : Infinity;
                return campDate >= start && campDate <= end;
            }
            return true;
        });
    }, [campaigns, timeRange, customStartDate, customEndDate]);

    // --- File Handling ---
    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) validateAndSetFile(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const validateAndSetFile = (selectedFile: File) => {
        if (messageType === 'image' && !selectedFile.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem.');
            return;
        }
        if (messageType === 'video' && !selectedFile.type.startsWith('video/')) {
            alert('Por favor, selecione um arquivo de vídeo.');
            return;
        }
        setFile(selectedFile);
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getButtonStyle = (range: TimeRange, current: TimeRange) => {
        const isActive = current === range;
        return isActive
            ? "text-xs font-bold px-3 py-1.5 rounded-md bg-primary text-black shadow-sm transition-all"
            : "text-xs font-medium px-3 py-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-muted-dark transition-colors";
    };

    const handleChangeMessageType = (type: MessageType) => {
        setMessageType(type);
        setFile(null);
    };
    // ... (inside render report view)
    if (viewMode === 'report') {
        if (loading || !stats) {
            return (
                <div className="animate-in fade-in duration-300 p-6 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Carregando estatísticas...</p>
                </div>
            );
        }
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 p-6 space-y-8">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/campaigns')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold">Voltar para Campanhas</span>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Desempenho</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="flex items-center bg-white dark:bg-card-dark p-1 rounded-lg border border-gray-200 dark:border-border-dark shadow-sm w-full sm:w-auto overflow-x-auto">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-3 whitespace-nowrap">PERÍODO:</span>
                        <button onClick={() => setReportTimeRange('today')} className={getButtonStyle('today', reportTimeRange)}>Hoje</button>
                        <button onClick={() => setReportTimeRange('7days')} className={getButtonStyle('7days', reportTimeRange)}>7 Dias</button>
                        <button onClick={() => setReportTimeRange('30days')} className={getButtonStyle('30days', reportTimeRange)}>30 Dias</button>
                        <button onClick={() => setReportTimeRange('custom')} className={getButtonStyle('custom', reportTimeRange)}>Personalizado</button>
                    </div>

                    {reportTimeRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-card-dark p-1 rounded-lg border border-gray-200 dark:border-border-dark shadow-sm animate-in slide-in-from-right-4 duration-300">
                            <div className="relative">
                                <input
                                    type="date"
                                    value={reportStartDate}
                                    onChange={(e) => setReportStartDate(e.target.value)}
                                    className="text-xs font-medium bg-transparent border-none text-gray-900 dark:text-white focus:ring-0 p-1.5"
                                />
                            </div>
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={reportEndDate}
                                    onChange={(e) => setReportEndDate(e.target.value)}
                                    className="text-xs font-medium bg-transparent border-none text-gray-900 dark:text-white focus:ring-0 p-1.5"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Total Enviado</h3>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <Send className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        <p className="text-xs text-gray-500 mt-1">Mensagens processadas</p>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Entregues</h3>
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.delivered}</p>
                        <p className="text-xs text-green-500 mt-1 font-bold">
                            {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}% Taxa de Entrega
                        </p>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Falhas</h3>
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
                        <p className="text-xs text-red-500 mt-1 font-bold">
                            {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}% Taxa de Erro
                        </p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Hourly Distribution Chart */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cronograma de Atividade (Dia e Hora)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.timelineDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="sent" fill="#3B82F6" name="Enviados" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="delivered" fill="#10B981" name="Entregues" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Distribuição de Status</h3>
                        <div className="h-80 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Entregue', value: stats.delivered, color: '#10B981' },
                                            { name: 'Falha', value: stats.failed, color: '#EF4444' },
                                            { name: 'Pendente', value: stats.total - (stats.delivered + stats.failed), color: '#F59E0B' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {[
                                            { name: 'Entregue', value: stats.delivered, color: '#10B981' },
                                            { name: 'Falha', value: stats.failed, color: '#EF4444' },
                                            { name: 'Pendente', value: stats.total - (stats.delivered + stats.failed), color: '#F59E0B' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Variation Performance (A/B Testing) */}
                {stats.variationStats && Object.keys(stats.variationStats).length > 0 && (
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm mb-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Performance por Variação (A/B Test)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(stats.variationStats).map(([key, data]: [string, any]) => (
                                <div key={key} className="bg-gray-50 dark:bg-muted-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Variação {String.fromCharCode(65 + parseInt(key))}</span>
                                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full">
                                            {data.total} envios
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Entregues
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">{data.delivered || 0} ({data.total > 0 ? Math.round((data.delivered / data.total) * 100) : 0}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.delivered / data.total) * 100 : 0}%` }}></div>
                                        </div>

                                        <div className="flex justify-between text-sm mt-2">
                                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Falhas
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">{data.failed || 0} ({data.total > 0 ? Math.round((data.failed / data.total) * 100) : 0}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.failed / data.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Leads List */}
                <div className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border-light dark:border-border-dark">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalhes dos Envios</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-muted-dark text-gray-500 dark:text-gray-400 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4">Telefone / Contato</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Data e Hora</th>
                                    <th className="px-6 py-4">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                {stats.logs && stats.logs.length > 0 ? (
                                    stats.logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log: any) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-muted-dark/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {log.phone || log.contact_phone || log.contact_id || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                    ${log.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                                        log.status === 'read' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                                            log.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}
                                                `}>
                                                    {log.status === 'sent' ? 'Enviado' :
                                                        log.status === 'delivered' ? 'Entregue' :
                                                            log.status === 'read' ? 'Lido' :
                                                                log.status === 'failed' ? 'Falha' : log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {log.error_message ? (
                                                    <span className="text-red-500">{log.error_message}</span>
                                                ) : log.replied_at ? (
                                                    <span className="text-blue-500 font-bold flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        Respondeu em {new Date(log.replied_at).toLocaleString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            Nenhum registro encontrado para esta campanha.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    {stats.logs && stats.logs.length > itemsPerPage && (() => {
                        const totalPages = Math.ceil(stats.logs.length / itemsPerPage);
                        return (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-muted-dark">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Mostrando <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold">{Math.min(currentPage * itemsPerPage, stats.logs.length)}</span> de <span className="font-bold">{stats.logs.length}</span> resultados
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 rounded-md bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 rounded-md bg-white dark:bg-card-dark border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div >
        );
    }

    // --- Render Management View (List) ---
    if (viewMode === 'list') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Header & Filters */}
                <div className="flex justify-end">

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        {/* Time Filter */}
                        <div className="flex items-center bg-white dark:bg-card-dark p-1 rounded-lg border border-border-light dark:border-border-dark shadow-sm w-full sm:w-auto overflow-x-auto">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 px-2 whitespace-nowrap flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                PERÍODO:
                            </span>
                            <button onClick={() => setTimeRange('today')} className={getButtonStyle('today', timeRange)}>Hoje</button>
                            <button onClick={() => setTimeRange('7days')} className={getButtonStyle('7days', timeRange)}>7 Dias</button>
                            <button onClick={() => setTimeRange('30days')} className={getButtonStyle('30days', timeRange)}>30 Dias</button>
                        </div>

                        <button
                            onClick={() => navigate('/campaigns/new')}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-black px-5 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)] whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Campanha
                        </button>
                    </div>
                </div>

                {/* Campaigns Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {loading ? (
                        <div className="text-center py-12">Carregando campanhas...</div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-card-dark border border-dashed border-border-light dark:border-border-dark rounded-xl">
                            <p className="text-gray-500 dark:text-gray-400">Nenhuma campanha encontrada neste período.</p>
                        </div>
                    ) : (
                        filteredCampaigns.map((camp) => (
                            <div key={camp.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden hover:border-primary/50 transition-colors">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-border-light dark:border-border-dark bg-blue-50 dark:bg-blue-900/10 text-blue-500`}>
                                            {camp.message_type === 'video' ? <Video className="w-6 h-6" /> :
                                                camp.message_type === 'image' ? <ImageIcon className="w-6 h-6" /> :
                                                    <Megaphone className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{camp.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {camp.type === 'recurring' && camp.recurrence_rule ? (
                                                    <>
                                                        <Repeat className="w-3.5 h-3.5" />
                                                        <span>
                                                            {camp.recurrence_rule.days
                                                                .sort()
                                                                .map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d])
                                                                .join(', ')}
                                                        </span>
                                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                        <span>{camp.recurrence_rule.times.join(', ')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{new Date(camp.created_at).toLocaleDateString()}</span>
                                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                        <span className="capitalize">{camp.type === 'instant' ? 'Instantâneo' : 'Agendado'}</span>
                                                    </>
                                                )}
                                                {camp.daily_limit && (
                                                    <>
                                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                        <span className="flex items-center gap-1 text-orange-500">
                                                            <Shield className="w-3 h-3" />
                                                            Limite: {camp.daily_limit}/dia
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-4">
                                        {/* Status Badge or Toggle */}
                                        {camp.type === 'recurring' ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                                <span className={`text-xs font-bold uppercase tracking-wide ${camp.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {camp.status === 'active' ? 'Ativa' : 'Pausada'}
                                                </span>
                                                <button
                                                    onClick={() => handleToggleStatus(camp.id, camp.status)}
                                                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ease-in-out focus:outline-none ${camp.status === 'active'
                                                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                                                        : 'bg-gray-300 dark:bg-gray-600'
                                                        }`}
                                                    title={camp.status === 'active' ? 'Pausar Campanha' : 'Ativar Campanha'}
                                                >
                                                    <div
                                                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ease-in-out ${camp.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border
                                                ${camp.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' :
                                                    camp.status === 'processing' || camp.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                                                        camp.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                                                            'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                                                {camp.status === 'pending' ? 'Pendente' :
                                                    camp.status === 'processing' ? 'Enviando' :
                                                        camp.status === 'completed' ? 'Concluída' :
                                                            camp.status === 'failed' ? 'Falhou' :
                                                                camp.status === 'cancelled' ? 'Cancelada' : camp.status}
                                            </span>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center border-l border-border-light dark:border-border-dark pl-4 gap-1">
                                            <button
                                                onClick={() => handleViewReport(camp.id)}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title="Ver Relatório"
                                            >
                                                <BarChart2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(camp)}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(camp.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )))}
                </div>
                {/* Modal de Confirmação de Exclusão */}
                <DeleteConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Excluir Campanha"
                    message="Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos."
                    isDeleting={isDeleting}
                />
            </div >
        );
    }

    // --- Render Create View ---
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex flex-col gap-4 mb-8">
                {/* Breadcrumb / Back Navigation */}
                <button
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors self-start group mb-2"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar para Lista
                </button>

                <div className="border-b border-border-light dark:border-border-dark pb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
                            {selectedCampaignId ? 'Edição' : 'Nova Campanha'}
                        </span>
                        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                            // Marketing
                        </span>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                        {selectedCampaignId ? 'Editar Campanha' : 'Criar Nova Campanha'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl leading-relaxed">
                        {selectedCampaignId
                            ? 'Atualize as configurações e o conteúdo da sua campanha existente.'
                            : 'Configure os detalhes do seu novo disparo em massa. Escolha entre templates oficiais ou envio direto.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* Configuration Column */}
                <div className="xl:col-span-8 space-y-6">

                    {/* Provider Selection */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-gray-400" />
                            Canal de Envio
                        </h3>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setProvider('official')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${provider === 'official'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                                    : 'border-border-light dark:border-border-dark hover:border-green-500/50 text-gray-500'
                                    }`}
                            >
                                <Shield className="w-8 h-8 mb-2" />
                                <span className="font-bold">API Oficial (Meta)</span>
                                <span className="text-xs opacity-70">Alta estabilidade, requer templates</span>
                            </button>
                            <button
                                onClick={() => setProvider('unofficial')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${provider === 'unofficial'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400'
                                    : 'border-border-light dark:border-border-dark hover:border-blue-500/50 text-gray-500'
                                    }`}
                            >
                                <Smartphone className="w-8 h-8 mb-2" />
                                <span className="font-bold">Gateway (Não Oficial)</span>
                                <span className="text-xs opacity-70">Flexível, envio direto de mídia/texto</span>
                            </button>
                        </div>
                    </div>


                    {/* Unofficial Message Input (Text + Media) */}
                    {/* 1. Campaign Details */}
                    <section className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold">1</div>
                            Detalhes da Campanha
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Nome da Campanha</label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Ex: Promoção Black Friday"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Público Alvo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Users className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        className="w-full pl-10 bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                    >
                                        <option value="all">Todos os Contatos</option>
                                        {availableTags.map(tag => (
                                            <option key={tag.id} value={tag.id}>Tag: {tag.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Message Content */}
                    {provider === 'unofficial' ? (
                        <section className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold">2</div>
                                Conteúdo da Mensagem
                            </h2>

                            {/* Message Type Selector */}
                            <div className="flex gap-4 mb-6 border-b border-border-light dark:border-border-dark pb-6">
                                <button
                                    onClick={() => handleChangeMessageType('text')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-bold text-sm
                                    ${messageType === 'text'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-input-dark'
                                        }`}
                                >
                                    <Type className="w-4 h-4" />
                                    Apenas Texto
                                </button>
                                <button
                                    onClick={() => handleChangeMessageType('image')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-bold text-sm
                                    ${messageType === 'image'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-input-dark'
                                        }`}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Imagem + Texto
                                </button>
                                <button
                                    onClick={() => handleChangeMessageType('video')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-bold text-sm
                                    ${messageType === 'video'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-input-dark'
                                        }`}
                                >
                                    <Video className="w-4 h-4" />
                                    Vídeo + Texto
                                </button>
                            </div>

                            {/* Media Upload */}
                            {(messageType === 'image' || messageType === 'video') && (
                                <div
                                    onDrop={handleFileDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative ${file
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border-light dark:border-border-dark hover:border-primary/50'
                                        }`}
                                    onClick={triggerFileInput}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept={messageType === 'image' ? 'image/*' : 'video/*'}
                                        onChange={handleFileSelect}
                                    />

                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            {messageType === 'image' ? (
                                                <ImageIcon className="w-12 h-12 text-primary mb-2" />
                                            ) : (
                                                <Video className="w-12 h-12 text-primary mb-2" />
                                            )}
                                            <p className="font-bold text-gray-900 dark:text-white">{file.name}</p>
                                            <p className="text-sm text-gray-500 mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <button
                                                onClick={clearFile}
                                                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 transition-colors z-10"
                                            >
                                                Remover Arquivo
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <UploadCloud className="w-12 h-12 text-gray-400 mb-2" />
                                            <p className="font-bold text-gray-900 dark:text-white">Clique ou arraste seu arquivo aqui</p>
                                            <p className="text-sm text-gray-500">
                                                Suporta {messageType === 'image' ? 'JPG, PNG' : 'MP4'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Text Input */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Mensagem Principal (Variação A)</label>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Padrão</span>
                                </div>
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    rows={5}
                                    className="block w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-xl bg-white dark:bg-input-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm resize-none"
                                    placeholder="Digite o conteúdo da sua mensagem..."
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Dica: Use variáveis como `{'{{name}}'}` para personalizar a mensagem.
                                </p>
                            </div>

                            {/* Variations List */}
                            {messageVariations.map((variation, index) => (
                                <div key={index} className="animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Variação {String.fromCharCode(66 + index)}</label>
                                        <button onClick={() => handleRemoveVariation(index)} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                                            <Trash2 className="w-3 h-3" /> Remover
                                        </button>
                                    </div>
                                    <textarea
                                        value={variation}
                                        onChange={(e) => handleVariationChange(index, e.target.value)}
                                        rows={5}
                                        className="block w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-xl bg-white dark:bg-input-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm resize-none"
                                        placeholder={`Digite a variação ${String.fromCharCode(66 + index)} da mensagem...`}
                                    />
                                </div>
                            ))}

                            <button
                                onClick={handleAddVariation}
                                className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar Variação de Texto
                            </button>
                        </section>
                    ) : (
                        <section className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold">2</div>
                                Conteúdo da Mensagem (Template)
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Selecione o Template</label>
                                    <div className="relative">
                                        <MessageCircle className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedTemplate?.name || ''}
                                            onChange={(e) => handleTemplateSelect(e.target.value)}
                                            className="w-full pl-10 bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                        >
                                            <option value="">Selecione um template...</option>
                                            {templates.map((t) => (
                                                <option key={t.name} value={t.name}>
                                                    {t.name} ({t.category}) - {t.language}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {selectedTemplate && (
                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Template Selecionado
                                        </h4>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-2">
                                            <p><strong>Nome:</strong> {selectedTemplate.name}</p>
                                            <p><strong>Categoria:</strong> {selectedTemplate.category}</p>
                                            <p><strong>Língua:</strong> {selectedTemplate.language}</p>
                                            <p><strong>Texto:</strong> {selectedTemplate.components.find(c => c.type === 'BODY')?.text}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}



                    {/* 3. Scheduling & Recurrence & Throttling */}
                    <section className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold">3</div>
                            Agendamento e Segurança
                        </h2>

                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setCampaignType('instant')}
                                className={`flex-1 py-3 rounded-lg border transition-all font-bold text-sm
                        ${campaignType === 'instant'
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500'
                                    }`}
                            >
                                Enviar Agora
                            </button>
                            <button
                                onClick={() => setCampaignType('scheduled')}
                                className={`flex-1 py-3 rounded-lg border transition-all font-bold text-sm
                        ${campaignType === 'scheduled'
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500'
                                    }`}
                            >
                                Agendar
                            </button>
                            <button
                                onClick={() => setCampaignType('recurring')}
                                className={`flex-1 py-3 rounded-lg border transition-all font-bold text-sm
                        ${campaignType === 'recurring'
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-gray-50 dark:bg-muted-dark border-transparent text-gray-500'
                                    }`}
                            >
                                Recorrente
                            </button>
                        </div>

                        {
                            campaignType === 'scheduled' && (
                                <div className="animate-in fade-in slide-in-from-top-2 mb-6">
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Data e Hora do Envio</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            )
                        }

                        {
                            campaignType === 'recurring' && (
                                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Dias da Semana</label>
                                        <div className="flex gap-2">
                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => toggleRecurrenceDay(index)}
                                                    className={`w-10 h-10 rounded-full font-bold text-sm transition-colors
                                        ${recurrenceDays.includes(index)
                                                            ? 'bg-primary text-black'
                                                            : 'bg-gray-100 dark:bg-muted-dark text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Horários</label>
                                        <div className="space-y-2">
                                            {recurrenceTimes.map((time, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        value={time}
                                                        onChange={(e) => {
                                                            const newTimes = [...recurrenceTimes];
                                                            newTimes[index] = e.target.value;
                                                            setRecurrenceTimes(newTimes);
                                                        }}
                                                        className="w-full bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                    />
                                                    {recurrenceTimes.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newTimes = [...recurrenceTimes];
                                                                newTimes.splice(index, 1);
                                                                setRecurrenceTimes(newTimes);
                                                            }}
                                                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setRecurrenceTimes([...recurrenceTimes, '09:00'])}
                                                className="text-sm text-primary font-bold flex items-center gap-1"
                                            >
                                                <Plus className="w-4 h-4" /> Adicionar Horário
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Throttling Section */}
                        <div className="pt-6 border-t border-border-light dark:border-border-dark">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-orange-500" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Segurança de Envio (Anti-Ban)</h3>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-4 mb-4">
                                <p className="text-xs text-orange-700 dark:text-orange-400">
                                    Defina um limite diário para evitar bloqueios no WhatsApp. O sistema irá distribuir os envios automaticamente ao longo dos dias.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Limite de Mensagens por Dia</label>
                                <input
                                    type="number"
                                    value={dailyLimit}
                                    onChange={(e) => setDailyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ex: 50"
                                    className="w-full bg-gray-50 dark:bg-input-dark border border-border-light dark:border-border-dark rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Deixe em branco para enviar sem limites (não recomendado para listas frias).</p>
                            </div>
                        </div>
                    </section >

                </div >

                {/* Preview Column */}
                < div className="xl:col-span-4" >
                    <div className="sticky top-6">
                        {/* Preview Phone */}
                        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex justify-between items-center">
                                <span>Pré-visualização</span>
                                {messageVariations.length > 0 && (
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full animate-pulse">
                                        Mostrando Variação {previewIndex === 0 ? 'A' : String.fromCharCode(65 + previewIndex)}
                                    </span>
                                )}
                            </h3>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden bg-[#E5DDD5] dark:bg-[#0b141a] h-[500px] relative">
                                {/* Header */}
                                <div className="bg-[#008069] dark:bg-[#202c33] p-3 flex items-center gap-3 text-white">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                        <Users className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold leading-none">{campaignName || 'Nome da Campanha'}</p>
                                        <p className="text-[10px] opacity-80 leading-none mt-1">
                                            {audience === 'all' ? 'Todos os contatos' : audience === 'leads' ? 'Leads Quentes' : 'Clientes Ativos'}
                                        </p>
                                    </div>
                                </div>

                                {/* Message Area */}
                                <div className="p-4 flex flex-col gap-2 h-full overflow-y-auto pb-20">
                                    <div className="self-end bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg p-2 max-w-[85%] shadow-sm relative">
                                        {/* Media Preview */}
                                        {file && (
                                            <div className="mb-2 rounded-lg overflow-hidden">
                                                {messageType === 'image' ? (
                                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-auto object-cover" />
                                                ) : (
                                                    <video src={URL.createObjectURL(file)} className="w-full h-auto" controls />
                                                )}
                                            </div>
                                        )}

                                        {/* Text Message (Template Body) */}
                                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                                            {provider === 'official' ? (
                                                selectedTemplate ? (
                                                    selectedTemplate.components.find(c => c.type === 'BODY')?.text || 'Este template não possui texto de corpo.'
                                                ) : 'Selecione um template para visualizar...'
                                            ) : (
                                                (previewIndex === 0 ? messageText : messageVariations[previewIndex - 1]) || 'Digite sua mensagem para visualizar...'
                                            )}
                                        </p>

                                        {/* Timestamp & Check */}
                                        <div className="flex justify-end items-center gap-1 mt-1">
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <CheckCheck className="w-3 h-3 text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resumo do Envio</h3>
                            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex justify-between">
                                    <span>Tipo:</span>
                                    <span className="font-bold capitalize">{campaignType === 'instant' ? 'Instantâneo' : campaignType === 'scheduled' ? 'Agendado' : 'Recorrente'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Variações:</span>
                                    <span className="font-bold">{1 + messageVariations.length} mensagens</span>
                                </div>
                                {dailyLimit && (
                                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                        <span>Limite Diário:</span>
                                        <span className="font-bold">{dailyLimit} msgs/dia</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={isSubmitting}
                                className={`w-full mt-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${isSubmitting
                                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400'
                                    : 'bg-primary text-black hover:bg-primary/90'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                        {selectedCampaignId ? 'Salvando...' : 'Enviando...'}
                                    </>
                                ) : (
                                    selectedCampaignId ? 'Salvar Alterações' : (campaignType === 'instant' ? 'Enviar Campanha' : 'Agendar Campanha')
                                )}
                            </button>
                        </div>
                    </div>
                </div >

            </div >
            {/* Modal de Confirmação de Exclusão */}
            < DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Campanha"
                message="Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos."
                isDeleting={isDeleting}
            />
        </div >
    );
};
