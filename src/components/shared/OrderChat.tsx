import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageCircle, X, Bell } from 'lucide-react';
import type { UserRole } from '@/types/erp';

interface OrderChatProps {
    orderId: string;
    orderNumber: string;
    allowedRoles?: UserRole[]; // quais roles podem enviar mensagem
    compact?: boolean;        // modo compacto (sem header)
}

const ROLE_COLORS: Record<UserRole, string> = {
    vendedor: 'bg-vendedor/20 text-vendedor border-vendedor/30',
    financeiro: 'bg-financeiro/20 text-financeiro border-financeiro/30',
    gestor: 'bg-gestor/20 text-gestor border-gestor/30',
    producao: 'bg-producao/20 text-producao border-producao/30',
};

const ROLE_LABELS: Record<UserRole, string> = {
    vendedor: 'Vendedor',
    financeiro: 'Financeiro',
    gestor: 'Gestor',
    producao: 'Produção',
};

const OrderChat: React.FC<OrderChatProps> = ({
    orderId,
    orderNumber,
    allowedRoles = ['vendedor', 'producao'],
    compact = false,
}) => {
    const { chatMessages, sendMessage, loadChat, markChatAsRead, getUnreadCount } = useERP();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [open, setOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const msgs = chatMessages[orderId] ?? [];
    const canSend = user?.role ? allowedRoles.includes(user.role) : false;
    const unread = user?.role ? getUnreadCount(orderId, user.role) : 0;

    useEffect(() => {
        loadChat(orderId);
    }, [orderId, loadChat]);

    useEffect(() => {
        if (open && user?.role) {
            markChatAsRead(orderId, user.role);
        }
    }, [open, orderId, user?.role, markChatAsRead, msgs.length]);

    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [msgs, open]);

    const handleSend = async () => {
        if (!message.trim() || !user || sending) return;
        setSending(true);
        try {
            await sendMessage({
                orderId,
                senderId: user.id,
                senderName: user.name,
                senderRole: user.role,
                message: message.trim(),
            });
            setMessage('');
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Botão flutuante se compact
    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setOpen(v => !v)}
                    className={`relative w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all ${open ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    title="Chat interno"
                >
                    <MessageCircle className="w-4 h-4" />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-destructive text-white text-[8px] font-extrabold flex items-center justify-center px-0.5 animate-pulse">
                            {unread}
                        </span>
                    )}
                </button>

                {open && (
                    <div className="absolute right-0 top-10 z-50 w-80 max-h-[400px] card-section shadow-2xl flex flex-col animate-scale-in border border-border">
                        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-foreground">Chat — {orderNumber}</span>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <ChatBody msgs={msgs} messagesEndRef={messagesEndRef} />
                        {canSend && (
                            <ChatInput
                                message={message}
                                setMessage={setMessage}
                                onSend={handleSend}
                                onKeyDown={handleKeyDown}
                                sending={sending}
                                textareaRef={textareaRef}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Modo inline (full)
    return (
        <div className="card-section overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chat Interno — {orderNumber}</h3>
                {unread > 0 && (
                    <span className="ml-auto text-[9px] font-extrabold bg-destructive text-white px-2 py-0.5 rounded-full animate-pulse">
                        {unread} nova{unread !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <ChatBody msgs={msgs} messagesEndRef={messagesEndRef} />

            {canSend ? (
                <ChatInput
                    message={message}
                    setMessage={setMessage}
                    onSend={handleSend}
                    onKeyDown={handleKeyDown}
                    sending={sending}
                    textareaRef={textareaRef}
                />
            ) : (
                <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border/40">
                    Você pode visualizar o chat mas não pode enviar mensagens nesta área.
                </div>
            )}
        </div>
    );
};

// ── Sub-components ──────────────────────────────────────────

const ROLE_COLORS_LOCAL: Record<string, string> = {
    vendedor: 'from-vendedor/20 border-vendedor/30',
    financeiro: 'from-financeiro/20 border-financeiro/30',
    gestor: 'from-gestor/20 border-gestor/30',
    producao: 'from-producao/20 border-producao/30',
};

const ROLE_LABEL: Record<string, string> = {
    vendedor: 'Vendedor',
    financeiro: 'Financeiro',
    gestor: 'Gestor',
    producao: 'Produção',
};

const ROLE_TEXT: Record<string, string> = {
    vendedor: 'text-vendedor',
    financeiro: 'text-financeiro',
    gestor: 'text-gestor',
    producao: 'text-producao',
};

const ChatBody: React.FC<{
    msgs: ReturnType<typeof useERP>['chatMessages'][string];
    messagesEndRef: React.RefObject<HTMLDivElement>;
}> = ({ msgs, messagesEndRef }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[320px]">
        {msgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Inicie a conversa com a equipe.</p>
            </div>
        ) : (
            msgs.map(msg => (
                <div key={msg.id} className="flex flex-col gap-0.5">
                    <div className={`flex items-center gap-1.5 mb-0.5`}>
                        <span className={`text-[10px] font-bold ${ROLE_TEXT[msg.senderRole] ?? 'text-muted-foreground'}`}>
                            {msg.senderName}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-muted/60 text-muted-foreground`}>
                            {ROLE_LABEL[msg.senderRole] ?? msg.senderRole}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 ml-auto">
                            {new Date(msg.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </span>
                    </div>
                    <div className={`px-3 py-2 rounded-xl text-sm text-foreground bg-muted/40 border border-border/30 whitespace-pre-wrap`}>
                        {msg.message}
                    </div>
                </div>
            ))
        )}
        <div ref={messagesEndRef} />
    </div>
);

const ChatInput: React.FC<{
    message: string;
    setMessage: (v: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    sending: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ message, setMessage, onSend, onKeyDown, sending, textareaRef }) => (
    <div className="px-4 py-3 border-t border-border/40 flex gap-2 items-end">
        <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            className="flex-1 input-modern resize-none text-xs min-h-[40px] max-h-[100px] py-2"
            rows={1}
        />
        <button
            onClick={onSend}
            disabled={!message.trim() || sending}
            className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
        >
            <Send className="w-3.5 h-3.5" />
        </button>
    </div>
);

export default OrderChat;
