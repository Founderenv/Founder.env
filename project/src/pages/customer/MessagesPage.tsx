import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft, Image as ImageIcon, Tag, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/States';
import { messageService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import { cn, timeAgo, formatTime } from '@/utils/format';
import type { Conversation, Message } from '@/types';

export function MessagesPage() {
  const currentCustomer = useCurrentCustomer();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMedia, setSendingMedia] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messageService.getConversations().then((c) => {
      setConversations(c);
      setLoading(false);
    });
  }, []);

  const openConversation = (conv: Conversation) => {
    setSelected(conv);
    messageService.getMessages(conv.id).then((msgs) => {
      setMessages(msgs);
      messageService.markRead(conv.id);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  };

  const send = () => {
    if (!text.trim() || !selected) return;
    messageService.sendMessage(selected.id, currentCustomer.id, 'customer', text.trim()).then((m) => {
      setMessages((prev) => (prev.some((item) => item.id === m.id) ? prev : [...prev, m]));
      setText('');
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  };

  const handleMediaUpload = async (file: File) => {
    if (!selected) return;
    setSendingMedia(true);
    try {
      const msg = await messageService.sendMedia(selected.id, file);
      setMessages((prev) => (prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to upload message image.');
    } finally {
      setSendingMedia(false);
    }
  };

  useEffect(() => {
    if (!selected) return;
    return messageService.subscribe(selected.id, (message) => {
      setMessages((previous) => (previous.some((item) => item.id === message.id) ? previous : [...previous, message]));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
  }, [selected]);

  if (loading) return <LoadingSpinner size={32} className="py-12" />;

  if (selected) {
    return (
      <div className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
          <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </button>
          <Link to={`/business/${selected.businessName.toLowerCase().replace(/\s/g, '')}`}>
            <Avatar src={selected.businessLogo} alt={selected.businessName} size="md" />
          </Link>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.businessName}</p>
            <p className="text-xs text-success-600">{selected.isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.senderType === 'customer' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                  m.senderType === 'customer'
                    ? 'rounded-br-sm bg-brand-600 text-white'
                    : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                )}
              >
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="Attachment" className="mb-2 max-h-60 rounded-lg object-cover" />
                )}
                {m.text && <p>{m.text}</p>}
                <p className={cn('mt-1 text-[10px]', m.senderType === 'customer' ? 'text-white/60' : 'text-gray-400')}>{formatTime(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-gray-200 p-3 dark:border-gray-800">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleMediaUpload(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sendingMedia}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Attach image"
          >
            {sendingMedia ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </button>
          <button
            onClick={() => window.alert('Deal and post sharing will be persisted when messaging is connected.')}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Share deal"
          >
            <Tag size={20} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            className="input flex-1"
          />
          <button onClick={send} disabled={!text.trim()} className={cn('rounded-xl p-2.5', text.trim() ? 'text-brand-600' : 'text-gray-300')}>
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-4">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
      {conversations.length > 0 ? (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => openConversation(conv)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="relative">
                <Avatar src={conv.businessLogo} alt={conv.businessName} size="md" />
                {conv.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success-500 ring-2 ring-white dark:ring-gray-950" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{conv.businessName}</p>
                  <span className="text-xs text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">{conv.lastMessage}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{conv.unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon="MessageCircle" title="No messages yet" description="Start a conversation with a business." />
      )}
    </div>
  );
}
