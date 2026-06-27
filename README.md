# Lo de Granados v2 — MCP-Based Rebuild

Winery boutique web app rebuilt from scratch using MCPs (Model Context Protocol) + Claude Code.

## Stack

| Capa | Tecnología | MCP |
|---|---|---|
| Dev | Claude Code | — |
| Frontend | React 19 + Vite + Tailwind v4 | Vercel MCP |
| Backend / DB | Supabase (Postgres + Auth + Storage) | Supabase MCP |
| Pagos | MercadoPago | MercadoPago MCP |
| Repo | GitHub | GitHub MCP |
| Email | Resend | — |

## MCP Configuration

MCPs are configured **per-project** in `.mcp.json` at the project root. Claude Code reads this automatically.

### `.mcp.json` template

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<your-access-token>",
        "SUPABASE_PROJECT_ID": "<your-project-id>"
      }
    },
    "mercadopago": {
      "command": "npx",
      "args": ["-y", "@mercadopago/mcp-server"],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "<your-access-token>"
      }
    },
    "vercel": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp-server"],
      "env": {
        "VERCEL_TOKEN": "<your-vercel-token>"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "<your-github-token>"
      }
    }
  }
}
```

### Setup Steps (Local)

1. Clone this repo:
   ```bash
   git clone https://github.com/lauta-rial/lodegranados-v2.git
   cd lodegranados-v2
   ```

2. Create `.mcp.json` with your credentials (use the template above)

3. Start Claude Code:
   ```bash
   claude
   ```

4. Claude Code will auto-load the MCP servers from `.mcp.json`

### Services to set up

| Service | Action |
|---|---|
| **Supabase** | Create project → get project ID + access token |
| **MercadoPago** | Get production access token |
| **Vercel** | Get API token from dashboard |
| **GitHub** | Use your existing token or create a fine-grained one |

## Project Structure (planned)

```
lodegranados-v2/
├── .mcp.json              # MCP servers config (git-ignored)
├── frontend/              # React + Vite + Tailwind
│   ├── src/
│   └── ...
├── docs/                  # User stories, DB schema, flow diagrams
├── supabase/
│   └── migrations/        # DB migrations
└── README.md
```

## v1 Reference

- Production: https://lodegranado.vercel.app
- API: https://api.34.239.137.66.nip.io
- Old repo: `lauta-rial/lodegranados-fe`
- Old DB: SQLite 14 tables (to migrate to Supabase Postgres)
