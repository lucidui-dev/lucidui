# Build with an AI agent

Lucid UI is made to be written by AI coding agents as well as people. There are two ways to work with one: give it the docs and paste what it writes, or connect it to Builder so it renders, reads its own mistakes and fixes them while you watch.

## Option 1: connect your agent to Builder (recommended)

Builder, at [build.lucidui.dev](https://build.lucidui.dev), runs Lucid UI in your browser. The Lucid bridge is a small MCP server that lets your agent render straight into it. Everything runs on your computer; nothing is uploaded.

### 1. Add the bridge to your agent, once

Claude Code, available in every project:

```sh
claude mcp add --scope user lucid -- npx -y @lucidui-dev/bridge
```

Cursor, Windsurf, VS Code and other MCP clients: add this to the client's MCP settings.

```json
{
  "mcpServers": {
    "lucid": { "command": "npx", "args": ["-y", "@lucidui-dev/bridge"] }
  }
}
```

Start a new agent session afterwards so it loads the bridge. In Claude Code, `/mcp` should list `lucid` as connected.

### 2. Pair Builder

1. Say to your agent: "Connect to Lucid Builder."
2. It replies with a pairing link. Open it in Chrome, Edge or Firefox.
3. If the browser asks to let the page access apps on this device, choose Allow. That is how Builder reaches the bridge on your computer.
4. The button at the top right of Builder turns green and reads "Agent connected".

### 3. Ask for what you want

"Make a settings page for a podcast app." "Rethink an X feed so it ends." Your agent writes the app and renders it in Builder. Lucid UI checks it as it runs, and every error and diagnostic goes back to the agent with its fix. The agent repairs the code and renders again until the page is clean.

Each render shows a toast with Undo, so you can step back. Edit the code yourself at any time; the agent can read your changes.

### The agent's tools

| Tool | What it does |
| --- | --- |
| `connect_builder` | Gives the pairing link for your Builder tab |
| `render` | Runs an app in Builder and returns errors, console output and Lucid diagnostics with fixes |
| `get_code` | Reads the code in the Builder editor, including your edits |
| `status` | Says whether a Builder tab is paired |

### Troubleshooting

- **"Couldn't reach the bridge."** The agent session that made the link has ended. Ask your agent to connect again for a fresh link.
- **Nothing happens in Safari.** Safari can block a secure page from talking to your computer. Use Chrome, Edge or Firefox for Builder.
- **The browser blocked access to apps on this device.** Open the site settings for build.lucidui.dev, allow local network or device access, then reload with the pairing link.
- **"Agent disconnected."** Your agent session stopped or restarted. Ask it to connect again.
- **The agent doesn't see a `lucid` tool.** Start a new agent session after adding the bridge, and check its MCP list.
- **Port in use.** The bridge tries 7357 and the next few ports. Set `LUCID_BRIDGE_PORT` to choose another.

## Option 2: paste the brief

Any AI chat works, with or without tools. Copy this brief, paste it before your request, then paste the code it writes into Builder or your own page:

```text
Build this with Lucid UI from lucidui.dev, the npm package @lucidui-dev/core. Before writing any code, open https://lucidui.dev/llms-full.txt and read all of it: it is the complete documentation. If that link won't open, use https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/llms-full.txt instead. Do not web-search for "Lucid UI": unrelated projects share the name, such as AppNexus's React library lucid-ui, and their APIs are different. If you can't open either link, tell me rather than guess. When Lucid reports a diagnostic, apply the fix it gives.
```

The homepage has a button that copies it. If something comes out wrong, Builder's console shows each diagnostic and its fix; paste those back to the agent.

## What makes Lucid UI easy for agents

- The whole API reference is about 1,140 tokens, so an agent can read all of it before it writes.
- [llms-full.txt](https://lucidui.dev/llms-full.txt) holds every doc in one file, for agents that can only open one page.
- [Recipes](RECIPES.md) give complete pages to start from, built only from Lucid components.
- Every mistake has a stable code and a fix, listed in [Diagnostics](DIAGNOSTICS.md).
- Browser dialogs and native pickers are reported, so what agents build always looks designed.
