import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/lib/useRole";
import { ChatAPI } from "@/api/Chat";
import { formatDisplayDateTime } from "@/lib/utils";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Chat() {
  const { user } = useAuth();
  const { roleLabel, roleColor } = useRole();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const userName = user?.full_name || user?.email || "Usuario";
  const userId = user?.id || user?.email || "unknown";
  const userRole = roleLabel || "Usuario";

  // Cargar mensajes existentes
  useEffect(() => {
    const cargarMensajes = async () => {
      try {
        setLoading(true);
        const data = await ChatAPI.obtenerMensajes(100);
        setMessages(data);
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarMensajes();
  }, []);

  // Suscripción en tiempo real
  useEffect(() => {
    const subscription = ChatAPI.suscribirse((nuevoMensaje) => {
      setMessages((prev) => [...prev, nuevoMensaje]);
    });

    return () => {
      ChatAPI.cancelarSuscripcion(subscription);
    };
  }, []);

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await ChatAPI.enviarMensaje({
        userId,
        userName,
        userRole,
        message: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, userId, userName, userRole]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * @param {string} name
   */
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <MessageCircle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Chat General</h1>
          <p className="text-sm text-muted-foreground">
            Comunicación interna del taller
          </p>
        </div>
      </div>

      {/* Chat container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <CardTitle className="text-sm font-medium">
              En línea
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Messages area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle size={48} className="mb-2 opacity-30" />
                <p className="text-sm">No hay mensajes aún</p>
                <p className="text-xs">¡Sé el primero en escribir!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.user_id === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                        <AvatarFallback
                          className={`text-[10px] font-bold ${isOwn ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                        >
                          {getInitials(msg.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}
                      >
                        <div
                          className={`rounded-2xl px-3.5 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-tr-md"
                              : "bg-secondary text-secondary-foreground rounded-tl-md"
                          }`}
                        >
                          {!isOwn && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-semibold opacity-80">
                                {msg.user_name}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded border ${roleColor}`}
                              >
                                {msg.user_role}
                              </span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                          {formatDisplayDateTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                size="icon"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}