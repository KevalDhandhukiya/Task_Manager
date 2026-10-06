# Deployment Guide (MySQL Edition)

Since we have successfully shifted the database to MySQL, here is how you can deploy your application.

## 1. Prerequisites
- **MySQL Hosting**: You need a live MySQL database.
    - Recommended: **PlanetScale**, **Railway**, **TiDB Cloud**, or **Clever Cloud**.
- **Application Hosting**: **Render**, **Railway**, or **Vercel**.

## 2. Environment Variables (.env)
In your production dashboard (e.g., Render), add these variables:

| Variable | Description |
|---|---|
| `DB_HOST` | Hostname from your MySQL provider |
| `DB_USER` | MySQL Username |
| `DB_PASS` | MySQL Password |
| `DB_NAME` | Database Name |
| `PORT` | `5000` (or whatever the host defines) |
| `VITE_API_URL` | The URL of your live backend (e.g., `https://api.yourdomain.com/api`) |

## 3. Deployment Steps

### Step A: Serve Backend & Frontend Together
To make deployment easier, I can update your `server/index.js` to serve the React `dist` folder automatically. This way, you only need to deploy **one** service.

### Step B: Build the Frontend
Before deploying, run the build command in the root folder:
```bash
npm run build
```

### Step C: Start the Server
Your start command should be:
```bash
cd server && npm install && npm start
```

## 4. Summary of Modern Stack
- **Frontend**: React (Vite)
- **Backend**: Node.js (Express)
- **Database**: MySQL (Sequelize)
- **Email**: Nodemailer (Gmail)

---
**Recommendation**: Would you like me to update `server/index.js` now to automatically serve your frontend? This makes it so you don't have to host the frontend and backend separately.
