# Live Stream Tester

A web application built with SolidJS to test device compatibility with different live streaming formats.
Demo: https://live-stream-tester.vercel.app/

## Features

- Test compatibility with multiple streaming formats:
  - HLS (HTTP Live Streaming)
  - DASH (Dynamic Adaptive Streaming over HTTP)
  - WebRTC
  - MP4 (Direct)
- Real-time status indicators for playback
- Device capability detection
- Comprehensive test results

## Prerequisites

- Node.js (v14 or newer)
- pnpm (v6 or newer)

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/wingskh/live-stream-tester.git
cd live-stream-tester
```

2. Install dependencies

```bash
pnpm install
```

3. Start the development server

```bash
pnpm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Building for Production

To build the application for production:

```bash
pnpm run build
```

The built files will be in the `dist` directory.

## Testing Different Stream Formats

The application includes sample streams for each format. To test your own streams:

1. Select the desired format from the dropdown
2. Enter your stream URL in the input field
3. Click "Start Test"

## Supported Browsers

The application works best in modern browsers that support Media Source Extensions (MSE):

- Chrome (recommended)
- Firefox
- Edge
- Safari

For HLS streaming, Safari has native support, while other browsers use the hls.js library.

## License

MIT

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Learn more about deploying your application with the [documentations](https://vite.dev/guide/static-deploy.html)
