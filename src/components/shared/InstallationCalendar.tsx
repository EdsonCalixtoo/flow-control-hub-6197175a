import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchInstallations, InstallationAppointment } from '@/lib/installationServiceSupabase';

interface InstallationCalendarProps {
    onSelect: (date: string, time: string) => void;
    selectedDate?: string;
    selectedTime?: string;
}

const TIMES = [
    '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export const InstallationCalendar: React.FC<InstallationCalendarProps> = ({ onSelect, selectedDate, selectedTime }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<InstallationAppointment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAppointments();
    }, [currentDate]);

    const loadAppointments = async () => {
        setLoading(true);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const data = await fetchInstallations(dateStr);
        setAppointments(data);
        setLoading(false);
    };

    const isTimeOccupied = (time: string) => {
        // Normalizar formato do tempo do banco (pode vir HH:mm:ss)
        return appointments.some(app => app.time.substring(0, 5) === time);
    };

    const getOccupantInfo = (time: string) => {
        const app = appointments.find(app => app.time.substring(0, 5) === time);
        if (!app) return null;
        return {
            name: app.client_name,
            type: app.type || 'instalacao'
        };
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/40">
                <button onClick={() => setCurrentDate(prev => addDays(prev, -1))} className="p-2 hover:bg-background rounded-xl transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Dia Selecionado</p>
                    <p className="text-sm font-black text-foreground capitalize">
                        {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                </div>
                <button onClick={() => setCurrentDate(prev => addDays(prev, 1))} className="p-2 hover:bg-background rounded-xl transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {TIMES.map(time => {
                    const occupied = isTimeOccupied(time);
                    const isSelected = selectedDate === format(currentDate, 'yyyy-MM-dd') && selectedTime === time;
                    const info = getOccupantInfo(time);

                    return (
                        <button
                            key={time}
                            type="button"
                            disabled={occupied && !isSelected}
                            onClick={() => onSelect(format(currentDate, 'yyyy-MM-dd'), time)}
                            className={`
                p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all
                ${occupied
                                    ? 'bg-destructive/5 border-destructive/20 text-destructive/60 cursor-not-allowed'
                                    : isSelected
                                        ? 'bg-success/10 border-success text-success scale-105 shadow-lg shadow-success/10'
                                        : 'bg-card border-border/40 hover:border-primary/50 text-foreground'
                                }
               `}
                        >
                            <Clock className={`w-4 h-4 ${isSelected ? 'animate-pulse' : ''}`} />
                            <span className="text-sm font-black tracking-tight">{time}</span>
                            {occupied && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] font-bold uppercase truncate max-w-[80px] italic">
                                        {info?.name || 'Indisponível'}
                                    </span>
                                    <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${info?.type === 'manutencao' ? 'bg-indigo-500 text-white' : 'bg-producao text-white'}`}>
                                        {info?.type === 'manutencao' ? 'Manutenção' : 'Instalação'}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground animate-pulse">
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Sincronizando agenda...</span>
                </div>
            )}

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-600">Agenda Compartilhada</p>
                    <p className="text-[11px] text-amber-600/80 leading-relaxed font-medium">
                        Horários marcados em vermelho já estão ocupados por outros vendedores.
                        Escolha um horário vago para evitar conflitos de instalação.
                    </p>
                </div>
            </div>
        </div>
    );
};
