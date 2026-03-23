# Hostinger Migration Guide

This guide describes how to move your TechCRM application from Vercel to **Hostinger Business Web Hosting**.

## 1. Prerequisites
- Ensure your Hostinger plan supports **Node.js**. (Usually found in the *Advanced* or *Node.js* section of hPanel).
- Ensure you have a domain or subdomain pointed to Hostinger.

## 2. Prepare the Application
I have already created the necessary bridge files:
- **`server.mjs`**: A custom Express server that replaces Vercel's serverless functions and handles routing.
- **`package.json`**: Updated with a `"start": "node server.mjs"` script.

### Build the Frontend
Run the following command locally to generate the production build:
```bash
npm run build
```
This will create a `dist/` folder.

## 3. Upload to Hostinger
You can use the **File Manager** in hPanel or **FTP** to upload your files.

**Upload only these files/folders:**
- `dist/` (The entire folder)
- `api/` (The entire folder)
- `server.mjs`
- `package.json`
- `.env` (Create this file on Hostinger with your InstantDB credentials)

## 4. Setup Node.js on Hostinger
1. Go to your **hPanel** > **Node.js**.
2. Create a new Node.js application.
3. Select the **Directory** where you uploaded the files.
4. Set the **App Start File** to `server.mjs`.
5. Click **Install Dependencies** (This runs `npm install` on the server).
6. Once installation is complete, click **Start**.

## 5. Configuration (Environment Variables)
In the Node.js setup area (or by creating a `.env` file in the root), make sure to set:
- `VITE_INSTANT_APP_ID=your_id`
- `INSTANT_ADMIN_TOKEN=your_token`
- `PORT=3000` (or whatever Hostinger assigns)

## 6. Verification
Once the status shows "Running," visit your domain. The Express server will now serve both your React frontend and your Backend APIs natively.

---
> [!TIP]
> If your Hostinger plan uses **Apache** (typical for shared hosting), you may need a `.htaccess` file in the `public_html` folder to proxy requests to your Node.js app port. Hostinger usually provides this automatically when you enable the Node.js application.
