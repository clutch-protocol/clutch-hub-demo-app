# Clutch Hub Demo App

A simple React app for ride requests, built with Vite.

## Project Structure

```
clutch-hub-demo-app/
├── public/
├── src/
│   ├── components/
│   │   └── RideForm.jsx         // Ride request form component
│   ├── App.jsx                  // Main app component
│   ├── main.jsx                 // React entry point
│   └── config.js                // API config (e.g., export const API_URL)
├── package.json
├── vite.config.js
├── README.md
└── .gitignore
```

## Getting Started

```bash
npm install
npm run dev
```

## Using with clutch-hub-sdk-js (local npm link)

1. In your `clutch-hub-sdk-js` directory:
   ```bash
   npm run build
   npm link
   ```
2. In this project directory:
   ```bash
   npm link clutch-hub-sdk-js
   ```

---

Stay true to the philosophy of decentralization and blockchain.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
