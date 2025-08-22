import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [autoListen, setAutoListen] = useState(false);
  const [lastUserInputTime, setLastUserInputTime] = useState(null);
  const [currentMode, setCurrentMode] = useState("text"); // "text" or "voice"

  const audioRef = useRef(null);
  const conversationEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Backend API URL
  const API_BASE_URL =
    "https://ai-voice-assistant-backend-072o.onrender.com/bot";

  // Initialize speech synthesis
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health/check/v1`, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        setBackendStatus("connected");
        console.log("Backend status:", response.data);
      } else {
        setBackendStatus("disconnected");
        console.error("Backend health check failed:", response.status);
      }
    } catch (error) {
      setBackendStatus("disconnected");
      console.error("Backend not available:", error.message);
    }
  };

  const startListening = () => {
    if (isListening) {
      console.log("Already listening");
      return;
    }

    setAutoListen(true);
    console.log("Starting speech recognition...");
    setIsListening(true);
    setIsLoading(false);

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech recognized:", transcript);

        if (!isSpeaking) {
          handleVoiceMessage(transcript);
        } else {
          console.log("Ignoring speech input while AI is speaking");
          setIsUserSpeaking(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setIsLoading(false);

        if (autoListen && event.error === "network") {
          console.log("Network error, retrying in 2 seconds...");
          setTimeout(() => {
            if (autoListen) {
              startListening();
            }
          }, 2000);
        }
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(() => false);

        if (autoListen && !isLoading) {
          console.log("Speech ended, restarting...");
          setTimeout(() => {
            if (autoListen) {
              startListening();
            }
          }, 500);
        }
      };

      try {
        recognitionRef.current.start();
        console.log("Speech recognition started successfully");
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
        setIsLoading(false);

        if (autoListen) {
          setTimeout(() => {
            if (autoListen) {
              startListening();
            }
          }, 2000);
        }
      }
    } else {
      console.error("Speech recognition not supported");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        setAutoListen(false);
        setIsListening(false);
        setIsUserSpeaking(false);
        recognitionRef.current.stop();
        console.log("Stopped listening manually");
      } catch (error) {
        console.log("Error stopping recognition:", error);
      }
    }
  };

  const handleVoiceMessage = async (transcript) => {
    if (!transcript.trim() || isLoading || isSpeaking) {
      console.log("Skipping voice message - empty, loading, or speaking");
      setIsUserSpeaking(false);
      return;
    }

    const currentTime = Date.now();
    if (lastUserInputTime && currentTime - lastUserInputTime < 1000) {
      console.log("Skipping - too soon after last input");
      setIsUserSpeaking(false);
      return;
    }
    setLastUserInputTime(currentTime);

    console.log("Processing voice message:", transcript);

    const userMessage = {
      role: "user",
      content: transcript,
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userMessage]);

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log("Speech recognition already stopped");
      }
      setIsListening(false);
    }

    setIsLoading(true);
    setIsUserSpeaking(false);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/generate/response/v1/`,
        {
          message: transcript,
        }
      );

      console.log("API Response:", response.data);

      const aiResponse =
        response.data.data ||
        response.data.response ||
        response.data.ai_response ||
        response.data.text;

      if (aiResponse) {
        const assistantMessage = {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        };
        setConversation((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        speakText(aiResponse);
      } else {
        console.error("No AI response received");
        setIsLoading(false);

        if (autoListen) {
          setTimeout(() => {
            if (autoListen) {
              startListening();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error calling API:", error);
      setIsLoading(false);

      if (autoListen) {
        setTimeout(() => {
          if (autoListen) {
            startListening();
          }
        }, 1000);
      }
    }
  };

  const speakText = (text) => {
    console.log("speakText called with:", text);

    if ("speechSynthesis" in window) {
      console.log("Speech synthesis available, starting to speak");
      setIsSpeaking(true);

      if (recognitionRef.current && isListening) {
        console.log("Stopping speech recognition while AI speaks...");
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log("Speech recognition already stopped");
        }
        setIsListening(false);
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice =
          voices.find(
            (voice) =>
              voice.lang.includes("en") && voice.name.includes("Google")
          ) || voices[0];
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log("Started speaking:", text);
      };

      utterance.onend = () => {
        console.log("Finished speaking");
        setIsSpeaking(() => false);

        setTimeout(() => {
          startListening();
        }, 1000);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        setTimeout(() => {
          startListening();
        }, 1000);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.error("Speech synthesis not available in this browser");
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/generate/response/v1/`,
        {
          message: message,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("Backend response:", response.data);

      if (response.data.success) {
        const aiResponse =
          response.data.data ||
          response.data.response ||
          response.data.ai_response ||
          response.data.text;

        console.log("AI Response to display:", aiResponse);

        const aiMessage = {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        };

        setConversation((prev) => [...prev, aiMessage]);

        if (currentMode == "voice") {
          speakText(aiResponse);
        }
      } else {
        throw new Error(response.data.error || "Chat failed");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(userInput);
    setUserInput("");
  };

  const clearConversation = () => {
    setConversation([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const reconnectBackend = () => {
    checkBackendHealth();
  };

  const getStatusIcon = () => {
    switch (backendStatus) {
      case "connected":
        return "🟢";
      case "disconnected":
        return "🔴";
      case "checking":
        return "🟡";
      default:
        return "⚪";
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header1">
          <h1>✨ AI Assistant</h1>
          <p>Choose your preferred way to interact</p>
        </div>
        {/* Mode Toggle */}

        <div className="toggle-connection">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${currentMode === "text" ? "active" : ""}`}
              onClick={() => setCurrentMode("text")}
              disabled={isLoading || isSpeaking}
            >
              <span className="mode-icon">💬</span>
              <span className="mode-label">Text Chat</span>
            </button>
            <button
              className={`mode-btn ${currentMode === "voice" ? "active" : ""}`}
              onClick={() => setCurrentMode("voice")}
              disabled={isLoading || isSpeaking}
            >
              <span className="mode-icon">🎤</span>
              <span className="mode-label">Voice Chat</span>
            </button>
          </div>

          {/* Backend Status */}
          <div className={`backend-status ${backendStatus}`}>
            {backendStatus === "connected" ? (
              <span>{getStatusIcon()} Connected</span>
            ) : backendStatus === "disconnected" ? (
              <div>
                <span>{getStatusIcon()} Disconnected</span>
                <button onClick={reconnectBackend} className="reconnect-btn">
                  🔄 Reconnect
                </button>
              </div>
            ) : (
              <span>{getStatusIcon()} Checking...</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Conversation Area */}
        <div className="conversation-area">
          <div className="conversation">
            {conversation.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {currentMode === "text" ? "💬" : ""}
                </div>
                <h3>
                  {currentMode === "text"
                    ? "Start a text conversation"
                    : "Start a voice conversation"}
                </h3>
                <p>
                  {currentMode === "text"
                    ? "Type your message below to begin chatting with AI"
                    : "Click the microphone button to start talking with AI"}
                </p>
              </div>
            ) : (
              conversation.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {message.role === "user" ? "👤 You" : "🤖 AI"}
                      </span>
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-text">{message.content}</div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="message assistant">
                <div className="message-content">
                  <div className="loading">
                    <span>🤔 AI is thinking</span>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isUserSpeaking && (
              <div className="message user">
                <div className="message-content">
                  <div className="loading">
                    <span>🎤 You are speaking</span>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="input-area">
          {currentMode === "text" ? (
            // Text Mode Input
            <form className="text-input" onSubmit={handleTextSubmit}>
              <div className="input-container">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your message here..."
                  disabled={isLoading || backendStatus !== "connected"}
                />
                <button
                  type="submit"
                  disabled={
                    !userInput.trim() ||
                    isLoading ||
                    backendStatus !== "connected"
                  }
                  className="send-btn"
                >
                  📤 Send
                </button>
              </div>
            </form>
          ) : (
            // Voice Mode Input
            <div className="voice-input">
              <div className="voice-controls">
                {!autoListen ? (
                  <button
                    className="mic-btn"
                    onClick={startListening}
                    disabled={
                      isLoading || isSpeaking || backendStatus !== "connected"
                    }
                  >
                    <span className="mic-icon">🎤</span>
                    <span className="mic-label">Start Speaking</span>
                  </button>
                ) : (
                  <button
                    className="mic-btn listening"
                    onClick={stopListening}
                    disabled={isLoading || isSpeaking}
                  >
                    <span className="mic-icon">⏹️</span>
                    <span className="mic-label">Stop Listening</span>
                  </button>
                )}
              </div>

              {isListening && (
                <div className="listening-indicator">
                  <div className="pulse"></div>
                  <span>🎧 Listening...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      {conversation.length > 0 && (
        <button className="clear-btn" onClick={clearConversation}>
          🗑️ Clear Conversation
        </button>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;
