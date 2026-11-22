# Ollama Service Monitoring System

[中文版](README.md)

This is a system for monitoring and detecting the availability and performance of Ollama services. It provides a modern web interface, supports multiple languages (Chinese/English), and features real-time detection and data visualization.

[Online Demo](https://ollama.vincentko.top)

Support online model testing
<video controls width="100%">
  <source src="https://pic-bed-1302552283.cos.ap-guangzhou.myqcloud.com/undefinedClipboard-20250227-115959-828.mp4" type="video/mp4">
  您的浏览器不支持视频播放。
</video>

## Features

- 🔍 Service Detection
  - Supports batch detection of Ollama services
  - Real-time display of detection status and results
  - Supports exporting detection results
  - Supports automatic FOFA scanning

- 📊 Performance Monitoring
  - Tests service response time and TPS
  - Displays a list of available models
  - Visualizes performance data

- 🌐 Multi-language Support
  - Chinese interface
  - English interface
  - One-click language switching

- 🎯 Advanced Filtering
  - Model filtering
  - TPS/Update Time sorting
  - Paginated display

## Technology Stack

- ⚡️ Next.js 14 - React Framework
- 🔥 TypeScript - Type Safety
- 🎨 Tailwind CSS - CSS Framework
- 🌍 next-intl - Internationalization
- 🔄 Server Components - Server Components
- 📱 Responsive Design - Mobile Adaptation

## Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the project
git clone git@github.com:forrany/Awesome-Ollama-Server.git
cd Awesome-Ollama-Server

# Install dependencies
npm install
# or
yarn install
```

### Development Environment

```bash
# Start the development server
npm run dev
# or
yarn dev
```

Visit http://localhost:3000 to view the application.

### Production Environment

```bash
# Build the project
npm run build
# or
yarn build

# Start the server
npm start
# or
yarn start
```

## Usage Instructions

### Detect Services

1. Click the "Service Detection" button
2. Enter Ollama service addresses in the pop-up dialog (one per line)
3. Click "Start Detection"
4. Wait for the detection to complete and view the results
5. Option to download detection results

### Filter and Sort

- Use the model filter to select specific models
- Click TPS or Update Time to sort
- Use the search box to quickly find models

### Language Switching

- Click the language switch button in the upper right corner
- Select Chinese or English

## Project Structure

```
src/
├── app/              # Next.js Application Directory
├── components/       # React Components
├── i18n/            # Internationalization Files
├── lib/             # Utility Functions
├── types/           # TypeScript Type Definitions
└── config/          # Configuration Files
```

## Environment Variables

Create a `.env` file and set the following variables. Github Actions will automatically execute monitoring and upload after filling in.

```env
# Optional: Redis Configuration (if used)
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token

# Optional: FOFA scanning country list (if used)
COUNTRYS=US,CN,RU
```

## Docker Deployment

This project supports Docker deployment for easy setup in various environments.

### Using Docker Compose (Recommended)

1. Make sure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

2. Clone the repository and navigate to the project directory
   ```bash
   git clone https://github.com/vincexiv/ollama-monitor-service.git
   cd ollama-monitor-service
   ```

3. Create an environment variables file (if you need Upstash Redis for data storage)
   ```bash
   cp .env.example .env
   ```
   
   Then edit the `.env` file and fill in your Upstash Redis credentials:
   ```
   UPSTASH_REDIS_URL=your_redis_url
   UPSTASH_REDIS_TOKEN=your_redis_token
   ```

4. Start the services
   ```bash
   docker-compose up -d
   ```

   This will start two services:
   - `ollama-monitor`: Web application, accessible at http://localhost:3000
   - `monitor-service`: Background monitoring service that automatically collects Ollama service data

### Using Docker Only

If you only need to deploy the web application without the background monitoring service:

```bash
# Build the image
docker build -t ollama-monitor .

# Run the container
docker run -d -p 3000:3000 --name ollama-monitor \
  -e UPSTASH_REDIS_URL=your_redis_url \
  -e UPSTASH_REDIS_TOKEN=your_redis_token \
  ollama-monitor
```

Access the application at http://localhost:3000.

## Contribution Guidelines

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

VincentKo (@forrany) - [GitHub](https://github.com/forrany)

## Disclaimer

1. This project is for security research and educational purposes only.
2. This project must not be used for any illegal purposes.
3. The author is not responsible for any loss caused by the use of this project.
4. Data is sourced from the internet. If there is any infringement, please contact the author to delete it.


## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=forrany/Awesome-Ollama-Server&type=Date)](https://star-history.dera.page/#forrany/Awesome-Ollama-Server&Date)
