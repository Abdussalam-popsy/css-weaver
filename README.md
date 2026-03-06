# CSS Weaver

Visualize CSS animations from any website as a timeline (like After Effects).

![CSS Weaver Preview](docs/preview.png)

## Features

- **Timeline Visualization** - See all CSS animations on a page as horizontal bars
- **Stagger Pattern Detection** - Instantly see animation sequences and delays
- **Element Highlighting** - Hover over bars to highlight corresponding elements
- **Animation Details** - Click to see keyframes, timing functions, and all properties

## Installation

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Load in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist` folder

## Usage

1. Visit any website with CSS animations
2. Click the CSS Weaver extension icon
3. A new tab opens with the animation timeline
4. Hover over bars to highlight elements
5. Click bars to see animation details

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **CRXJS** - Chrome extension development

## Project Structure

```
css-weaver/
├── src/
│   ├── content/           # Injected into pages
│   │   ├── scanner.ts     # CSS animation detection
│   │   ├── highlighter.ts # Element highlighting
│   │   └── index.ts       # Content script entry
│   ├── background/        # Extension service worker
│   │   └── service-worker.ts
│   ├── panel/             # Timeline UI (React)
│   │   ├── components/
│   │   ├── store/
│   │   └── hooks/
│   └── shared/            # Shared types and messages
├── public/icons/          # Extension icons
└── manifest.json          # Chrome extension config
```

## License

MIT
