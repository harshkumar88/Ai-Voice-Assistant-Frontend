# 🤖 AI Voice Assistant

A modern, voice-enabled AI chatbot built with React that allows you to have natural conversations with AI using just your voice or text input.

## ✨ Features

- **🎤 Voice Recognition**: Click the microphone button to start talking
- **🔊 Text-to-Speech**: AI responses are spoken back to you
- **💬 Text Input**: Alternative text input for typing messages
- **🎨 Modern UI**: Beautiful, responsive design with smooth animations
- **📱 Mobile Friendly**: Works perfectly on all devices
- **🔄 Real-time**: Live conversation with visual feedback

## 🚀 Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- OpenAI API key (free tier available)

### Installation

1. **Clone or download this project**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**

   Create a `.env` file in the root directory:

   ```bash
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   ```

   Get your free API key from: https://platform.openai.com/api-keys

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173` and start talking!

## 🎯 How to Use

### Voice Mode

1. Click the **🎤 Click to Talk** button
2. Speak your message clearly
3. The AI will respond both in text and voice
4. Click **🛑 Stop** to stop listening

### Text Mode

1. Type your message in the text input field
2. Press Enter or click **Send**
3. The AI will respond both in text and voice

### Features

- **Clear Conversation**: Click the "Clear Conversation" button to start fresh
- **Visual Feedback**: The microphone button changes color and animates based on status
- **Loading States**: See when the AI is processing your request
- **Timestamps**: Each message shows when it was sent

## 🔧 Configuration

### API Settings

The app is configured to use OpenAI's GPT-3.5-turbo model. You can modify the API settings in `src/App.jsx`:

```javascript
// Change the model
model: 'gpt-4', // or 'gpt-3.5-turbo'

// Adjust response length
max_tokens: 150, // increase for longer responses

// Modify the system prompt
{ role: 'system', content: 'Your custom system prompt here' }
```

### Voice Settings

You can customize the speech synthesis in the `speak` function:

```javascript
utterance.rate = 0.9; // Speed (0.1 to 10)
utterance.pitch = 1; // Pitch (0 to 2)
utterance.volume = 1; // Volume (0 to 1)
```

## 🌐 Browser Compatibility

This app uses the Web Speech API which is supported in:

- ✅ Chrome/Chromium (recommended)
- ✅ Edge
- ✅ Safari (limited support)
- ❌ Firefox (no speech recognition)

**Note**: For best experience, use Chrome or Edge browsers.

## 🛠️ Troubleshooting

### Microphone Not Working

1. Make sure you're using a supported browser (Chrome/Edge)
2. Allow microphone permissions when prompted
3. Check that your microphone is working in other applications
4. Try refreshing the page

### API Errors

1. Verify your OpenAI API key is correct
2. Check your OpenAI account has available credits
3. Ensure you have a stable internet connection

### Voice Not Playing

1. Check your system volume
2. Make sure your browser allows autoplay
3. Try clicking the microphone button to trigger audio context

## 📱 Mobile Usage

The app is fully responsive and works great on mobile devices:

- Touch-friendly interface
- Optimized for small screens
- Voice recognition works on mobile browsers
- Responsive design adapts to screen size

## 🔒 Privacy & Security

- Voice recognition happens locally in your browser
- Text messages are sent to OpenAI's servers for processing
- No conversation data is stored locally or on our servers
- API keys are stored locally in your browser's environment

## 🎨 Customization

### Styling

Modify `src/App.css` to customize the appearance:

- Change colors in the CSS variables
- Adjust animations and transitions
- Modify layout and spacing

### Functionality

Extend `src/App.jsx` to add features:

- Different AI models
- Conversation history
- Voice commands
- Integration with other APIs

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this project!

---

**Enjoy your conversations with AI! 🚀**
# Ai-Voice-Assistant-Frontend
