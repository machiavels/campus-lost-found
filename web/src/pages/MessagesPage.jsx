import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState(null);
  const [text, setText] = useState('');

  const { data: threads, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messagesApi.list(),
    select: (r) => r.data.threads ?? r.data,
    refetchInterval: 15_000,
  });

  const { data: thread } = useQuery({
    queryKey: ['thread', activeThread],
    queryFn: () => messagesApi.getThread(activeThread),
    select: (r) => r.data,
    enabled: !!activeThread,
    refetchInterval: 10_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.send({ threadId: activeThread, content: text }),
    onSuccess: () => { setText(''); qc.invalidateQueries(['thread', activeThread]); },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  const handleSend = (e) => { e.preventDefault(); if (text.trim()) sendMutation.mutate(); };

  if (isLoading) return <Spinner />;

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      <div className="w-72 flex-shrink-0 card overflow-y-auto">
        <div className="p-4 border-b font-semibold text-gray-900">Conversations</div>
        {!threads?.length ? (
          <EmptyState icon="💬" title="Aucune conversation" />
        ) : (
          threads.map((t) => {
            const other = t.participants?.find((p) => p.id !== user?.id);
            return (
              <button key={t.id} onClick={() => setActiveThread(t.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${activeThread === t.id ? 'bg-primary-50' : ''}`}>
                <p className="font-medium text-sm text-gray-900">{other?.username ?? 'Utilisateur'}</p>
                <p className="text-xs text-gray-400 truncate">{t.lastMessage?.content ?? ''}</p>
              </button>
            );
          })
        )}
      </div>
      <div className="flex-1 card flex flex-col">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Sélectionnez une conversation</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {thread?.messages?.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p>{m.content}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-primary-200' : 'text-gray-400'}`}>
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
              <input className="input flex-1" placeholder="Votre message..." value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="btn-primary px-3" disabled={sendMutation.isPending}><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
