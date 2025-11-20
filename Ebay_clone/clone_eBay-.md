# eBay-like Portal

A modern, responsive buyer and seller portal built with React and TypeScript, designed to mimic the core functionality of eBay with a premium user interface.

## 🚀 Tech Stack

- **Framework**: [React](https://react.dev/) (v18+)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (Custom Design System with CSS Variables)
- **Routing**: [React Router](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Project Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd ionic-supernova
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Building for Production

Create a production-ready build:
```bash
npm run build
```
The output will be in the `dist` directory.

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components (Button, Input, Card, etc.)
├── pages/          # Page-level components (Home, SellerDashboard, etc.)
├── types/          # Shared TypeScript interfaces and types
├── index.css       # Global styles and Design System variables
├── App.tsx         # Main application component and routing
└── main.tsx        # Entry point
```

## 🎨 Design System

The project uses a custom design system defined in `src/index.css`. It relies on CSS variables for consistency:

- **Colors**: `--color-primary`, `--color-secondary`, `--bg-surface`, etc.
- **Spacing**: `--spacing-sm`, `--spacing-md`, etc.
- **Typography**: Inter/System fonts.

## 🤝 Contributing

1. Ensure code is typed using TypeScript interfaces.
2. Use the shared UI components from `src/components` instead of hardcoding HTML.
3. Follow the BEM-like naming convention for CSS classes (e.g., `.component-element`).
