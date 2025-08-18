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
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [lastUserInputTime, setLastUserInputTime] = useState(null);

  const audioRef = useRef(null);
  const conversationEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Backend API URL
  const API_BASE_URL =
    "https://ai-voice-assistant-backend-072o.onrender.com/bot";

  // Initialize speech synthesis only
  useEffect(() => {
    // Initialize speech synthesis
    if ("speechSynthesis" in window) {
      // Pre-load speech synthesis
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
      // Try the health check endpoint
      const response = await axios.get(`${API_BASE_URL}/health/check/v1`, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000, // 5 second timeout
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

      if (error.code === "ECONNREFUSED") {
        console.error("Backend not running or wrong port");
      } else if (error.response?.status === 404) {
        console.error("Health endpoint not found");
      } else if (error.message.includes("CORS")) {
        console.error("CORS error - backend needs CORS configuration");
      } else {
        console.error("Backend not available:", error.message);
      }
    }
  };

  const startListening = () => {
    setIsUserSpeaking(true);
    if (isListening) {
      console.log("Cannot start listening - already listening");
      return;
    }

    setAutoListen(true);

    console.log("Starting speech recognition...");
    setIsListening(true);
    setIsLoading(false);

    // Create a new recognition instance each time to avoid state issues
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      // Create new instance
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech recognized:", transcript);

        // Show user speaking state

        // Only process if we're not currently speaking
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

        // Simple: Only retry for network errors, ignore no-speech
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
        setIsListening(false);

        // Simple: Only restart if auto-listen is enabled and not loading
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

        // Simple retry after delay
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

    // Add timestamp to prevent processing old audio
    const currentTime = Date.now();
    if (lastUserInputTime && currentTime - lastUserInputTime < 1000) {
      console.log("Skipping - too soon after last input");
      setIsUserSpeaking(false);
      return;
    }
    setLastUserInputTime(currentTime);

    console.log("Processing voice message:", transcript);

    // Add user message to conversation
    const userMessage = {
      role: "user",
      content: transcript,
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, userMessage]);

    // Stop listening while processing
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log("Speech recognition already stopped");
      }
      setIsListening(false);
    }

    setIsLoading(true);
    setIsUserSpeaking(false); // Stop showing user speaking when processing

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
        // Speak the response - this will automatically restart listening when done
        speakText(aiResponse);
      } else {
        console.error("No AI response received");
        setIsLoading(false);

        // Simple restart if no response
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

      // Simple restart after error
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
    if ("speechSynthesis" in window) {
      setIsSpeaking(true);

      // Stop speech recognition while AI is speaking to prevent feedback loop
      if (recognitionRef.current && isListening) {
        console.log("Stopping speech recognition while AI speaks...");
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log("Speech recognition already stopped");
        }
        setIsListening(false);
      }

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Get available voices and set a good one
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a good voice
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
        setIsSpeaking(false);

        setTimeout(() => {
          startListening();
        }, 1000);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);

        // If auto-listen is enabled, start listening again after error
        if (autoListen) {
          console.log("Speech error, starting to listen...");
          setTimeout(() => {
            if (autoListen) {
              startListening();
            }
          }, 1000);
        }
      };

      window.speechSynthesis.speak(utterance);
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
    setTypingIndicator(true);

    try {
      // Send text message to backend
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
          timeout: 10000, // 10 second timeout
        }
      );

      console.log("Backend response:", response.data);

      if (response.data.success) {
        // Extract the response text from the 'data' field
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

        // Speak the AI response
        speakText(aiResponse);
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
      setTypingIndicator(false);
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
    // Stop any ongoing speech
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

  const getMicButtonIcon = () => {
    if (isListening) return "⏹️";
    if (isSpeaking) return "🔊";
    return "🎤";
  };

  return (
    <div className="app">
      <div className="header-container">
        <div className="header">
          <h1>✨ AI Voice Assistant</h1>
          <p>Experience the future of conversation with AI</p>

          {/* Backend Status Indicator */}
          {/* <div className={`backend-status ${backendStatus}`}>
            {backendStatus === "connected" ? (
              <span>{getStatusIcon()} Backend Connected</span>
            ) : backendStatus === "disconnected" ? (
              <div>
                <span>{getStatusIcon()} Backend Disconnected</span>
                <button onClick={reconnectBackend} className="reconnect-btn">
                  🔄 Reconnect
                </button>
              </div>
            ) : (
              <span>{getStatusIcon()} Checking Backend...</span>
            )}
          </div> */}

          <div className="voice-controls">
            {!autoListen ? (
              <button
                className="mic-button"
                onClick={startListening}
                disabled={
                  isLoading || isSpeaking || backendStatus !== "connected"
                }
              >
                <span className="mic-icon">🎤</span>
                <span className="mic-text">Start Speaking</span>
              </button>
            ) : (
              <button
                className="mic-button listening"
                onClick={stopListening}
                disabled={isLoading || isSpeaking}
              >
                <span className="mic-icon">⏹️</span>
                <span className="mic-text">Stop Chat</span>
              </button>
            )}

            {isListening && (
              <div className="listening-indicator">
                <div className="pulse"></div>
                <span>🎧 Listening...</span>
              </div>
            )}

            {autoListen && (
              <div className="auto-listen-indicator">
                <span>🔄 Infinite Mode Active - Say "bye" to stop</span>
              </div>
            )}
          </div>
        </div>

        <div className="conversation-container">
          <div className="conversation">
            {conversation.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>Click "Start Speak" to begin a continuous conversation!</p>
                {/* <p className="demo-tip">
                  💡 Say "bye", "exit", or "stop" to end the conversation
                </p> */}
                {backendStatus !== "connected" && (
                  <p className="backend-warning">
                    ⚠️ Make sure your backend is running on
                    http://127.0.0.1:8000
                  </p>
                )}
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
      </div>

      <form className="text-input-form" onSubmit={handleTextSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="💭 Type your message here..."
            disabled={isLoading || isSpeaking || backendStatus !== "connected"}
          />
          <button
            type="submit"
            disabled={
              !userInput.trim() ||
              isLoading ||
              isSpeaking ||
              backendStatus !== "connected"
            }
            className="send-button"
          >
            📤 Send
          </button>
        </div>
      </form>

      {conversation.length > 0 && (
        <button className="clear-button" onClick={clearConversation}>
          🗑️ Clear Conversation
        </button>
      )}

      {/* Hidden audio element for playing responses */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;
