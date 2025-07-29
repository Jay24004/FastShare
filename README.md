# FastShare

FastShare is a modern, privacy-focused file sharing web app. Effortlessly upload files (up to 64MB), generate a secure share code or link, and send it to anyone—no login required. Files are stored temporarily and expire after 24 hours or after a one-time download (if enabled).

---

## ✨ Features

- **Drag & drop** or browse to upload files
- **ZIP compression** for multiple files (client-side)
- **Instant share link/code** generation
- **Download via code or link**
- **One-time access** option for sensitive shares
- **Local upload history** (client-side only, never sent to server)
- **No authentication required**
- **Files expire after 24 hours**
- **Share code and link validation**
- **History validation and cleanup**
- **Modern UI** with framer-motion animations
- **Security warning** for sensitive data
- **Client-side download experience** (like mega.nz)

---

## 🛠 How it works

1. Upload files (max 64MB per upload)
2. Optionally compress multiple files into a ZIP before upload
3. Get a share link or code to send to anyone
4. Recipient enters code or link to download files
5. Files are stored temporarily and expire after 24 hours or after one-time download (if enabled)
6. No user accounts or authentication required

---

## ⚙️ Environment Variables

Set the following environment variables in your `.env.local`:

```env
NEXT_PUBLIC_DOMAIN=http://localhost:3000
NEXT_PUBLIC_DOWNLOAD_PREFIX=https://{your-uploadthing-appname}.ufs.sh/f/
UPLOADTHING_TOKEN=your-uploadthing-token
UPLOADTHING_API_TOKEN=your-uploadthing-api-token
DATABASE_URL=your-database-url
```

---

## ⚠️ Security Note

Do **not** share files containing passwords, credentials, personal identification, financial information, or sensitive personal data.  
Anyone with the share code or link can download your files without authentication.
Files are stored temporarily and are not encrypted, so they should not contain sensitive information.
