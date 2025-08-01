# CallBook AI - Frontend

🎥 **A real-time video calling application with AI-powered transcription and translation capabilities**

CallBook AI Frontend is an Angular-based web application that provides seamless video conferencing with intelligent features including real-time speech transcription and multi-language translation.

## ✨ Features

- **📹 Real-time Video Calls**: High-quality video conferencing powered by LiveKit
- **🎤 Live Transcription**: Real-time speech-to-text conversion using AssemblyAI
- **🌍 Multi-language Translation**: Automatic translation of conversations
- **🔄 Modern UI**: Responsive design built with Angular 19 and TailwindCSS
- **🐳 Docker Support**: Containerized deployment ready
- **📱 Cross-platform**: Works on desktop and mobile browsers

## 🚀 Tech Stack

- **Framework**: Angular 19.1
- **Styling**: TailwindCSS 4.1
- **Video Communication**: LiveKit Client 2.15
- **Speech Recognition**: AssemblyAI 4.14
- **Language**: TypeScript 5.7
- **Testing**: Jasmine & Karma
- **Containerization**: Docker

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 20+ installed
- npm or yarn package manager
- Angular CLI 19.1.3+
- Access to LiveKit server
- AssemblyAI API key (for transcription features)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd callbook-front
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Update the environment files in `src/environments/`:
   
   ```typescript
   // environment.ts (development)
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8000',
     livekitUrl: 'wss://your-livekit-server.livekit.cloud',
     appName: 'CallBook AI',
     version: '1.0.0',
   };
   ```

## 🏃‍♂️ Running the Application

### Development Server

Start the development server:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The app will automatically reload when you make changes.

### Network Development Server

To run the server accessible from other devices on your network:

```bash
npm run start:network
# or
ng serve --host 0.0.0.0 --port 4200
```

### Production Build

Build the application for production:

```bash
npm run build:prod
# or
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t callbook-front .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

### Environment Variables for Docker

The following build arguments can be customized:

- `API_URL`: Backend API endpoint
- `LIVEKIT_URL`: LiveKit server WebSocket URL
- `APP_NAME`: Application name
- `APP_VERSION`: Application version

Example:
```bash
docker build \
  --build-arg API_URL=https://your-api.com \
  --build-arg LIVEKIT_URL=wss://your-livekit.cloud \
  -t callbook-front .
```

## 🧪 Testing

### Unit Tests

Run unit tests with Karma:

```bash
npm test
# or
ng test
```

### Watch Mode

Run tests in watch mode during development:

```bash
npm run watch
# or
ng build --watch --configuration development
```

## 📁 Project Structure

```
src/
├── app/
│   ├── call/                    # Video call components
│   │   ├── user-call/          # Individual user call interface
│   │   └── call.component.*    # Main call interface
│   ├── home/                   # Home page and call setup
│   │   └── call-form/          # Call creation form
│   ├── services/               # Application services
│   │   ├── external/           # External service integrations
│   │   │   ├── transcription/  # AssemblyAI transcription services
│   │   │   ├── translation/    # Translation services
│   │   │   └── videocall/      # LiveKit video call services
│   │   └── home/              # Home page services
│   └── shared/                 # Shared components and models
│       ├── models/            # TypeScript interfaces and models
│       └── form-validators/   # Custom form validators
└── environments/              # Environment configurations
```

## 🔧 Key Services

### Video Call Services
- **VideocallService**: Manages LiveKit room connections
- **ParticipantManagerService**: Handles participant management
- **TrackManagerService**: Manages audio/video tracks
- **RoomConnectionService**: Establishes room connections

### Transcription Services
- **TranscriptionService**: Main transcription orchestrator
- **AudioProcessorService**: Processes audio for transcription
- **TranscriberService**: Interfaces with AssemblyAI
- **MultiTranscriberService**: Handles multiple participant transcription

### Translation Services
- **TranslationService**: Handles real-time translation of transcribed text

## 🌐 API Integration

The application integrates with:

- **Backend API**: RESTful API for application data
- **LiveKit**: WebRTC-based video calling platform
- **AssemblyAI**: Real-time speech recognition API

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Scaffolding

Generate new components using Angular CLI:

```bash
# Generate a new component
ng generate component component-name

# Generate a new service
ng generate service service-name

# Generate a new module
ng generate module module-name

# See all available schematics
ng generate --help
```

## 🐛 Troubleshooting

### Common Issues

1. **LiveKit Connection Issues**
   - Verify your LiveKit URL and credentials
   - Check network connectivity and firewall settings

2. **Transcription Not Working**
   - Ensure AssemblyAI API key is configured
   - Check browser microphone permissions

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Update Angular CLI: `npm install -g @angular/cli@latest`

## 📚 Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Angular CLI Overview](https://angular.dev/tools/cli)
- [LiveKit Documentation](https://docs.livekit.io/)
- [AssemblyAI Documentation](https://www.assemblyai.com/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using Angular 19 and modern web technologies**
