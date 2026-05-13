'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = { role: 'user' | 'assistant'; content: string };

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hi! I’m **Aya’s AI Assistant**.\nAsk me about her **skills, projects or experience** ✨",
};

// ---------- TYPEWRITER COMPONENT ----------
function TypewriterAssistant({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const index = useRef(0);

  useEffect(() => {
    setDisplayed('');
    index.current = 0;

    const interval = setInterval(() => {
      setDisplayed(prev => prev + text.charAt(index.current));
      index.current++;

      if (index.current >= text.length) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="chat-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {displayed}
      </ReactMarkdown>

      {displayed.length < text.length && (
        <span className="cursor">|</span>
      )}

      <style jsx>{`
        .cursor {
          margin-left: 3px;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (
      messages[messages.length - 1]?.role === 'assistant' &&
      lastAssistantRef.current
    ) {
      lastAssistantRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    } else {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;

    const user: Message = { role: 'user', content: input };

    setMessages(prev => [...prev, user]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, user] }),
      });

      const data = await res.json();

      const assistant: Message = {
        role: 'assistant',
        content: data?.reply ?? 'No answer returned.',
      };

      setMessages(prev => [...prev, assistant]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `${error?.message ?? 'Connection error'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}>
      <div
        style={{
          width: 380,
          height: open ? 500 : 64,
          background: 'rgba(14, 18, 40, 0.85)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(118, 75, 162, 0.35)',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          color: '#fff',
          fontFamily: 'Poppins, Inter, sans-serif',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '14px 18px',
            background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          <span>✨ Aya Assistant</span>

          {/* ONLY OPEN/CLOSE BUTTON */}
          <HeaderButton onClick={() => setOpen(prev => !prev)}>
            {open ? '−' : '+'}
          </HeaderButton>
        </div>

        {open && (
          <>
            <div
              ref={containerRef}
              style={{
                padding: 14,
                height: 350,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.map((m, i) => {
                const isLastAssistant =
                  i === messages.length - 1 && m.role === 'assistant';

                return (
                  <div
                    key={i}
                    ref={isLastAssistant ? lastAssistantRef : null}
                    style={{
                      alignSelf:
                        m.role === 'user' ? 'flex-end' : 'flex-start',
                      background:
                        m.role === 'user'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(255,255,255,0.08)',
                      padding: '12px 15px',
                      borderRadius:
                        m.role === 'user'
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                      maxWidth: '80%',
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      boxShadow:
                        m.role === 'user'
                          ? '0 4px 15px rgba(118,75,162,0.35)'
                          : '0 2px 10px rgba(0,0,0,0.25)',
                    }}
                  >
                    {m.role === 'assistant' && isLastAssistant ? (
                      <TypewriterAssistant text={m.content} />
                    ) : (
                      <div className="chat-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Aya is thinking...
                </div>
              )}
            </div>

            {/* INPUT */}
            <form
              onSubmit={e => {
                e.preventDefault();
                send();
              }}
              style={{
                display: 'flex',
                padding: 14,
                gap: 8,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your question..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(20,25,45,0.9)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
              />

              <button
                disabled={loading}
                style={{
                  borderRadius: 12,
                  border: 'none',
                  background:
                    'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  color: '#fff',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>

      <style jsx global>{`
        .chat-md ul {
          margin: 6px 0 6px 16px;
        }
        .chat-md li {
          margin-bottom: 4px;
        }
        .chat-md strong {
          color: #f6aaff;
        }
        .chat-md em {
          color: #c5b8ff;
        }
      `}</style>
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.18)',
        border: 'none',
        color: '#fff',
        width: 28,
        height: 28,
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
