// Chatbox.tsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Lang = "en" | "hindi";
type MessageItem = { role: "user" | "bot"; text: string };

export default function Chatbox(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [lang, setLang] = useState<Lang | null>(null);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // Resolve API base URL from multiple environment variable patterns (Vite, CRA, Next)
  const resolveApiBase = (): string => {
    // Vite: import.meta.env (available in Vite builds)
    // Fallback to common env var names used in CRA / Next on the server
    const viteUrl =
      typeof import.meta !== "undefined" &&
      (import.meta as any).env?.VITE_CHATBOT_URL;

    const candidate = (viteUrl || craUrl || nextUrl || "").toString().trim();
    if (candidate) {
      // strip trailing slash for safety
      return candidate.replace(/\/+$/, "");
    }
    return "http://localhost:8001";
  };

  const API_BASE = resolveApiBase();
  const API_ENDPOINT = `${API_BASE}/api/chat`;

  // Send to /api/chat using axios; retry once to localhost if first attempt fails
  const postToChatApi = async (langValue: Lang, messageText: string) => {
    setSending(true);
    setLastError(null);

    if (messageText !== "initial_message") {
      setMessages((m) => [...m, { role: "user", text: messageText }]);
    }

    const body = { lang: langValue, message: messageText };

    const tryPost = async (url: string) => {
      try {
        const res = await axios.post(url, body, { timeout: 10000 });
        // Expecting { reply: "..." } from your Python backend
        const replyText =
          res?.data?.reply ?? "Sorry — backend returned no reply.";
        setMessages((m) => [...m, { role: "bot", text: String(replyText) }]);
        return { ok: true };
      } catch (err: any) {
        const msg = err?.response
          ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data)}`
          : err?.message ?? String(err);
        return { ok: false, error: msg };
      }
    };

    // First try configured API endpoint
    const first = await tryPost(API_ENDPOINT);
    if (!first.ok) {
      // If the configured API wasn't localhost already, try explicit localhost fallback once
      if (!API_BASE.includes("localhost")) {
        const fallback = "http://localhost:8001/api/chat";
        const second = await tryPost(fallback);
        if (!second.ok) {
          const errMsg = `Attempts failed. Primary: ${API_ENDPOINT} -> ${first.error}. Fallback: ${fallback} -> ${second.error}`;
          setMessages((m) => [
            ...m,
            { role: "bot", text: `Something went wrong. ${errMsg}` },
          ]);
          setLastError(errMsg);
        }
      } else {
        const errMsg = `Request to ${API_ENDPOINT} failed -> ${first.error}`;
        setMessages((m) => [
          ...m,
          { role: "bot", text: `Something went wrong. ${errMsg}` },
        ]);
        setLastError(errMsg);
      }
    }

    setSending(false);
  };

  const openChat = () => setOpen(true);
  const closeChat = () => setOpen(false);

  const handleLanguageSelect = (l: Lang) => {
    setLang(l);
    setMessages([]); // reset locally when language changed
    postToChatApi(l, "initial_message"); // backend may return welcome text
  };

  const handleSend = () => {
    if (!lang) return;
    const text = input.trim();
    if (!text) return;
    postToChatApi(lang, text);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button
          onClick={openChat}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 w-96 max-h-[70vh] flex flex-col shadow-xl z-50">
<CardHeader className="relative flex items-center pb-3 px-4 border-b">
  <CardTitle className="text-lg">Chatbot</CardTitle>
  <div className="flex items-center gap-2">
    <div className="text-sm text-muted-foreground mr-2">
      {lang
        ? lang === "en"
          ? "English"
          : "हिन्दी"
        : "Choose language"}
    </div>
  </div>
  <Button
    variant="destructive"
    size="icon"
    onClick={closeChat}
    className="absolute top-5 right-2 h-8 w-8"
  >
    <X className="h-8 w-8" />
  </Button>
</CardHeader>


          {/* Fix: CardContent uses flex-1 so it fills the card height */}
          <CardContent className="flex flex-col flex-1 p-0 min-h-0">
            {/* Message area fills available space, never overlaps input */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 && !sending && !lang && (
                  <div className="text-sm text-muted-foreground">
                    Please choose a language to start the chat / कृपया भाषा
                    चुनें
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 break-words ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="max-w-[60%] rounded-lg p-3 bg-muted text-muted-foreground">
                      ...
                    </div>
                  </div>
                )}
                {lastError && (
                  <div className="text-xs text-red-600 whitespace-pre-wrap">
                    Debug: {lastError}
                  </div>
                )}
                <div className="h-8" />
              </div>
            </div>
            {/* Input area always visible at bottom */}
            {!lang ? (
              <div className="p-4 border-t flex flex-col items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Choose language / भाषा चुनें
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleLanguageSelect("en")}>
                    English
                  </Button>
                  <Button onClick={() => handleLanguageSelect("hindi")}>
                    हिन्दी
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  You can switch language by reopening the chat.
                </div>
              </div>
            ) : (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={
                      lang === "en" ? "Type a message..." : "संदेश लिखें..."
                    }
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    disabled={sending}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Language: {lang === "en" ? "English" : "हिन्दी"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sending ? "Sending..." : "Ready"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
