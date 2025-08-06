import React, { useState, useEffect, useRef, useContext } from 'react';
import UserContext from '../../context/UserContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import api from '../../api/api';

const Chatbot = () => {
  const { user } = useContext(UserContext);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // System welcome message based on role
  const welcomeMessages = {
    admin: 'Hello Admin! How can I assist you with drug management today?',
    institute: 'Hello Institute Manager! Need help with inventory or orders?',
    pharmacy: 'Hello Pharmacist! How can I help with your orders today?',
  };

  // Predefined suggestions based on user role
  const quickSuggestions = {
    admin: [
      'Show expiring drugs',
      'List pending orders',
      'View institute statistics',
      'Check low stock items',
    ],
    institute: [
      'My inventory status',
      'Drugs expiring soon',
      'Recent orders',
      'Create new order',
    ],
    pharmacy: [
      'Current stock levels',
      'Pending shipments',
      'Expiring medications',
      'Order history',
    ],
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          text:
            welcomeMessages[user?.role] || 'Hello! How can I help you today?',
          sender: 'bot',
          isMarkdown: false,
        },
      ]);
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMarkdown = (text) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({  ...props }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border" {...props} />
            </div>
          ),
          th: ({  ...props }) => (
            <th className="border px-4 py-2 bg-gray-100" {...props} />
          ),
          td: ({  ...props }) => (
            <td className="border px-4 py-2" {...props} />
          ),
          h2: ({  ...props }) => (
            <h2 className="text-xl font-bold mt-4 mb-2" {...props} />
          ),
          h3: ({  ...props }) => (
            <h3 className="text-lg font-semibold mt-3 mb-1" {...props} />
          ),
          ul: ({  ...props }) => (
            <ul className="list-disc pl-5 mb-2" {...props} />
          ),
          li: ({  ...props }) => <li className="mb-1" {...props} />,
          p: ({  ...props }) => <p className="mb-2" {...props} />,
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message to chat immediately
    const userMessage = { text: message, sender: 'user', isMarkdown: false };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare conversation history, excluding welcome messages
      const conversationHistory = messages
        .filter((m) => !Object.values(welcomeMessages).includes(m.text))
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await api.post('/chatbot', {
        query: message,
        conversation_history: conversationHistory,
      });

      // Add bot response to chat
      setMessages((prev) => [
        ...prev,
        {
          text: response.data.reply,
          sender: 'bot',
          isMarkdown: true,
        },
      ]);
    } catch (error) {
      console.error('Chatbot error:', error);

      let errorMessage =
        'Sorry, I encountered an error. Please try again later.';

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          // Optionally handle logout here if needed
          // localStorage.removeItem('token');
          // window.location.reload();
        } else if (error.response.data?.reply) {
          errorMessage = error.response.data.reply;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: 'bot',
          isMarkdown: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  if (!user) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isOpen ? 'w-[350px]' : ''}`}>
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-[500px] overflow-hidden border border-gray-200">
          <div className="bg-green-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Drug Management Assistant</h3>
            <button
              className="text-white hover:text-gray-200 focus:outline-none"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-3 p-3 rounded-lg max-w-[90%] ${
                  message.sender === 'user'
                    ? 'bg-blue-100 ml-auto rounded-br-none'
                    : 'bg-gray-200 mr-auto rounded-bl-none'
                }`}
              >
                {message.isMarkdown
                  ? renderMarkdown(message.text)
                  : message.text.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-2 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
              </div>
            ))}

            {isLoading && (
              <div className="mb-3 p-3 rounded-lg bg-gray-200 mr-auto rounded-bl-none max-w-[80%]">
                <div className="flex space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick suggestions for new conversations */}
            {messages.length === 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Try asking:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions[user?.role]?.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-white border border-gray-300 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-gray-200 bg-white"
          >
            <div className="flex items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-r-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 h-full"
                disabled={isLoading || !inputMessage.trim()}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          className="bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-green-700 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Chatbot;
