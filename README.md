# Clutch Hub Demo App

![Alpha](https://img.shields.io/badge/status-alpha-orange.svg)
![Experimental](https://img.shields.io/badge/stage-experimental-red.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

> ⚠️ **ALPHA SOFTWARE** - This project is in active development and is considered experimental. Use at your own risk. Features may not work as expected and APIs may change without notice.

A decentralized ride-sharing application showcasing blockchain integration using the Clutch Hub SDK.

## Features

### User Profile Management
- Store public and private keys securely
- Option to remember keys between sessions
- Visual feedback for active profile

### Ride Request
- Interactive map to select pickup and dropoff locations
- Simple fare input
- Automatic transaction signing when keys are stored
- Visual feedback during transaction processing

### Transaction History
- Records all ride requests (successful and failed)
- Collapsible interface to save space
- Persistent storage tied to user's public key

## Security Considerations

- Private keys are optionally stored in the browser's localStorage
- Warning is displayed about the risks of storing private keys
- Keys are never transmitted to any server except during transaction signing
- All blockchain interactions happen client-side

## Decentralization Benefits

This application demonstrates several key blockchain principles:

1. **User sovereignty**: Users own and control their keys
2. **Transparency**: All transactions are recorded and visible
3. **No central authority**: Ride requests are processed by the blockchain network
4. **Trustless operations**: Smart contracts enforce the rules without third-party oversight

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Visit `http://localhost:5173` in your browser

## Development

### Dependencies
- React for UI components
- Leaflet for interactive maps
- Clutch Hub SDK for blockchain interactions

### Local Storage
The application uses the following localStorage keys:
- `clutchPublicKey`: User's public key
- `clutchPrivateKey`: User's private key (if "remember keys" is enabled)
- `clutch_tx_[publicKey]`: Transaction history for a specific user

## Best Practices

The application follows blockchain best practices:
- Minimizes private key exposure
- Uses client-side signing
- Keeps transaction history for transparency
- Provides clear feedback on transaction status

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
