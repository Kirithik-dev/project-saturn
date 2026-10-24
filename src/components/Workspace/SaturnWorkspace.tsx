import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { SaturnToast } from '../Auth/SaturnToast';
import { LogOut, Plus, Trash2, Clock, Tag, Sparkles, Database, ShieldCheck } from 'lucide-react';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function SaturnWorkspace() {
  const { user, signOut } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    isOpen: boolean;
    heading: string;
    supportingText: string;
    type: 'success' | 'info' | 'error';
  }>({
    isOpen: false,
    heading: '',
    supportingText: '',
    type: 'success'
  });

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table not created yet in user's Supabase instance
        if (error.code === '42P01' || error.message.includes('relation "public.notes" does not exist')) {
          setDbTableMissing(true);
        } else {
          console.error('Error fetching notes:', error.message);
        }
      } else if (data) {
        setNotes(data as Note[]);
        setDbTableMissing(false);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoadingNotes(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !user) return;

    setIsSubmitting(true);
    const tagsArray = newTag
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const generatedTitle = newTitle.trim() || newContent.trim().slice(0, 40) + (newContent.length > 40 ? '...' : '');

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            user_id: user.id,
            title: generatedTitle,
            content: newContent.trim(),
            tags: tagsArray
          }
        ])
        .select();

      if (error) {
        if (error.code === '42P01') {
          setDbTableMissing(true);
          setToastConfig({
            isOpen: true,
            heading: 'Database Setup Required',
            supportingText: 'Run the supabase-schema.sql script in your Supabase SQL editor to create the notes table.',
            type: 'info'
          });
        } else {
          setToastConfig({
            isOpen: true,
            heading: 'Failed to Save Note',
            supportingText: error.message,
            type: 'error'
          });
        }
      } else if (data && data[0]) {
        setNotes((prev) => [data[0] as Note, ...prev]);
        setNewTitle('');
        setNewContent('');
        setNewTag('');
        setToastConfig({
          isOpen: true,
          heading: 'Thought Captured',
          supportingText: 'Stored securely in your private SATURN vault.',
          type: 'success'
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setToastConfig({
        isOpen: true,
        heading: 'Error',
        supportingText: errorMessage,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (!error) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setToastConfig({
          isOpen: true,
          heading: 'Note Deleted',
          supportingText: 'Removed from your encrypted storage.',
          type: 'info'
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut();
    setIsLoggingOut(false);
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Explorer';

  return (
    <>
      <SaturnToast
        isOpen={toastConfig.isOpen}
        heading={toastConfig.heading}
        supportingText={toastConfig.supportingText}
        type={toastConfig.type}
        onClose={() => setToastConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-y-auto">
        {/* Top Liquid Glass Bar */}
        <header className="pointer-events-auto w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="saturn-login-card rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 transition-all">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0" aria-hidden="true">
                <svg className="w-7 h-7 text-[#F7D794]" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="23" fill="#E29A38" />
                  <path d="M 88,42 C 86,64 14,64 12,42" stroke="#FFEFC9" strokeWidth="3.4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <span className="font-['Cinzel',serif] text-base font-bold tracking-[0.24em] text-[#F5F0E5]">
                  SATURN
                </span>
                <span className="hidden sm:inline-block ml-2.5 text-[9px] font-mono tracking-[0.2em] uppercase text-[#F7D794]/75">
                  VAULT ACTIVE
                </span>
              </div>
            </div>

            {/* User Session & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-[#F5F0E5] tracking-tight truncate max-w-[180px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#E0D8CC]/60 font-mono truncate max-w-[180px]">
                  {user?.email}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 text-xs text-[#F5F0E5]/90 hover:text-[#FFE2A8] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794] transition-all cursor-pointer"
                title="Sign out of SATURN"
              >
                <LogOut className="w-3.5 h-3.5 text-[#F7D794]" />
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="pointer-events-auto flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
          {/* Database Setup Notice if table not created yet */}
          {dbTableMissing && (
            <div className="saturn-login-card rounded-2xl p-4 sm:p-5 border border-[#F7D794]/25 flex items-start gap-3">
              <Database className="w-5 h-5 text-[#F7D794] shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <h2 className="font-semibold text-sm text-[#F5F0E5] mb-1">
                  Database Table Ready for Provisioning
                </h2>
                <p className="text-[#E0D8CC]/80 leading-relaxed">
                  Your Supabase authentication is active! To enable cloud-synced user notes with Row Level Security, run the script in <code className="text-[#F7D794] bg-black/40 px-1.5 py-0.5 rounded font-mono">supabase-schema.sql</code> in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          )}

          {/* Quick Capture Liquid Glass Panel */}
          <section className="saturn-login-card rounded-2xl p-5 sm:p-6 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F7D794]" />
                <h2 className="text-sm font-semibold tracking-wide text-[#F5F0E5]">
                  Neural Capture
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F7D794]/75 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F7D794]" />
                <span>RLS Encrypted</span>
              </div>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full h-10 px-3.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 focus:outline-none"
              />

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What insight, thought, or architecture are you storing today?..."
                rows={3}
                required
                className="w-full p-3.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 focus:outline-none resize-none"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#F5F0E5]/40">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tags: ideas, architecture, draft (comma separated)"
                    className="w-full h-9 pl-9 pr-3 saturn-glass-input rounded-xl text-xs text-[#F5F0E5] placeholder-[#F5F0E5]/35 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newContent.trim()}
                  className="h-9 px-4 rounded-xl bg-[#F7D794] hover:bg-[#FFE2A8] active:bg-[#EAC77E] text-[#120B06] font-semibold text-xs tracking-wide shadow-[0_2px_10px_rgba(247,215,148,0.16)] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Capture Thought</span>
                </button>
              </div>
            </form>
          </section>

          {/* Notes Vault Grid */}
          <section className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#E0D8CC]/60">
                Stored Vault Entries ({notes.length})
              </h3>
            </div>

            {loadingNotes ? (
              <div className="saturn-login-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-5 h-5 border-2 border-[#F7D794]/30 border-t-[#F7D794] rounded-full animate-spin mb-2" />
                <span className="text-xs text-[#E0D8CC]/60">Decrypting vault entries...</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="saturn-login-card rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                <p className="text-sm font-medium text-[#F5F0E5]/80">Your vault is clean.</p>
                <p className="text-xs text-[#E0D8CC]/55 mt-1 max-w-sm">
                  Record thoughts or notes using the Neural Capture panel above. Your records are protected by Row Level Security and accessible only to your account.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="saturn-login-card rounded-2xl p-4.5 flex flex-col justify-between hover:border-[#FFEBC3]/25 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[#F5F0E5] tracking-tight">
                          {note.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-white/30 hover:text-[#F87171] p-1 -mr-1 -mt-1 rounded transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-[#E0D8CC]/85 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-[10px] text-[#E0D8CC]/50 font-mono">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#F7D794]/60" />
                        <span>{new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {note.tags.map((t, idx) => (
                            <span key={idx} className="text-[#F7D794]/75">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Minimal Footer */}
        <footer className="pointer-events-none w-full text-center py-3 text-[10px] font-mono text-[#E0D8CC]/40 tracking-wider">
          SATURN SECOND BRAIN · SECURE SESSION PROTECTED BY ROW LEVEL SECURITY
        </footer>
      </div>
    </>
  );
}
