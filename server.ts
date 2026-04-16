import express from "express";
import { createServer as createViteServer } from "vite";
import sql from "mssql";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for SQL Server Query
  app.post("/api/sql-query", async (req, res) => {
    const { config, query } = req.body;

    if (!config || !query) {
      return res.status(400).json({ error: "Config and query are required" });
    }

    try {
      // Connect to SQL Server
      const pool = await sql.connect({
        user: config.user,
        password: config.password,
        server: config.server,
        database: config.database,
        options: {
          encrypt: true, // Use encryption for Azure/Cloud
          trustServerCertificate: true, // For local/self-signed certs
        },
      });

      const result = await pool.request().query(query);
      await pool.close();

      res.json({ data: result.recordset });
    } catch (err: any) {
      console.error("SQL Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
