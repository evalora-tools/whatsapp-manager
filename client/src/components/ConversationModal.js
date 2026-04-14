import React, { useState } from 'react';

const ConversationModal = ({ conversation, messages, loading, onClose, onRefreshMessages }) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Verificar si el último mensaje del usuario fue hace menos de 24 horas
  const canSendMessage = () => {
    if (!messages || messages.length === 0) return false;
    
    // Buscar el último mensaje del usuario (cliente)
    const userMessages = messages.filter(msg => msg.sender_type === 'user');
    if (userMessages.length === 0) return false;
    
    const lastUserMessage = userMessages[userMessages.length - 1];
    const messageTime = new Date(lastUserMessage.created_at);
    const now = new Date();
    const hoursDiff = (now - messageTime) / (1000 * 60 * 60);
    
    return hoursDiff < 23;
  };

  const getTimeSinceLastMessage = () => {
    if (!messages || messages.length === 0) return null;
    
    const userMessages = messages.filter(msg => msg.sender_type === 'user');
    if (userMessages.length === 0) return null;
    
    const lastUserMessage = userMessages[userMessages.length - 1];
    const messageTime = new Date(lastUserMessage.created_at);
    const now = new Date();
    const hoursDiff = (now - messageTime) / (1000 * 60 * 60);
    
    return Math.floor(hoursDiff);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    if (!canSendMessage()) {
      setSendError('Solo puedes responder a mensajes enviados hace menos de 24 horas.');
      return;
    }

    setSending(true);
    setSendError('');

    try {
      // Extraer el número de teléfono del ID de la conversación
      const phoneNumber = conversation.id.replace('whatsapp:', '').replace('@c.us', '');
      
      const response = await fetch('https://n8n-n8n.2y9all.easypanel.host/webhook/bbb33573-d87c-4320-81b8-1167dd8f85c1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: newMessage
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }

      // Limpiar el campo de texto después de enviar
      setNewMessage('');
      
      // Esperar un momento y recargar los mensajes para mostrar el nuevo mensaje
      setTimeout(() => {
        if (onRefreshMessages) {
          onRefreshMessages();
        }
      }, 1000);
      
      console.log('Mensaje enviado correctamente');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Error al enviar el mensaje. Por favor, intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-slideUp border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {conversation.title || 'Conversación'}
              </h3>
              <p className="text-xs text-gray-600 font-mono mt-0.5">
                ID: {conversation.id.substring(0, 12)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-base text-gray-900 font-semibold">El cliente aún no ha respondido</p>
              <p className="mt-2 text-sm text-gray-600">La plantilla de contacto ha sido enviada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'user' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                      message.sender_type === 'user'
                        ? 'bg-white text-gray-900 border border-gray-200'
                        : message.sender_type === 'Admin'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-xs font-bold ${
                        message.sender_type === 'user' 
                          ? 'text-gray-600' 
                          : message.sender_type === 'Admin'
                          ? 'text-purple-100'
                          : 'text-blue-100'
                      }`}>
                        {message.sender_type === 'user' 
                          ? '👤 Cliente' 
                          : message.sender_type === 'Admin'
                          ? '👨‍💼 Administrador'
                          : '🤖 Asistente'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.sender_type === 'user' 
                        ? 'text-gray-500' 
                        : message.sender_type === 'Admin'
                        ? 'text-purple-200'
                        : 'text-blue-200'
                    }`}>
                      {new Date(message.created_at).toLocaleString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Enviar mensaje */}
        <div className="p-4 border-t bg-gray-50">
          {!canSendMessage() && messages.length > 0 && (
            <div className="mb-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-800">No puedes enviar mensajes</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Solo puedes responder a mensajes del cliente enviados hace menos de 24 horas. 
                  {getTimeSinceLastMessage() !== null && (
                    <> Han pasado {getTimeSinceLastMessage()} horas desde el último mensaje del cliente.</>
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-end space-x-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Enviar mensaje
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={canSendMessage() ? "Escribe tu mensaje..." : "No disponible - Han pasado más de 24 horas"}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={sending || !canSendMessage()}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim() || !canSendMessage()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span className="text-sm">Enviar</span>
            </button>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm"
            >
              Cerrar
            </button>
          </div>
          {sendError && (
            <p className="text-xs text-red-600 flex items-center space-x-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{sendError}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationModal;
