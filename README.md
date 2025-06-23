# Random Video Call App

A real-time random video calling application with text chat functionality, built with Next.js, Socket.IO, and WebRTC.

## Features

- 🎥 Random video calling with strangers
- 💬 Real-time text chat during calls
- 🎛️ Media controls (mute/unmute video/audio)
- 👥 Live user count display
- 📱 Responsive design for mobile and desktop
- 🔒 Peer-to-peer WebRTC connections

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Real-time Communication**: Socket.IO
- **Video Calling**: WebRTC
- **Styling**: Tailwind CSS, shadcn/ui
- **Deployment**: Render, GitHub

## Local Development

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd random-video-call-app
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in multiple browser tabs to test the functionality.

## Deployment

### GitHub Setup

1. Create a new repository on GitHub
2. Push your code:
\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
\`\`\`

### Render Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18 or higher

## Environment Variables

No environment variables are required for basic functionality. The app will automatically use the PORT provided by the hosting platform.

## Browser Permissions

Users need to grant camera and microphone permissions for the video calling functionality to work.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.
