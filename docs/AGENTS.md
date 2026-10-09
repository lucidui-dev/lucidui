# Build with an AI agent

[Watch Claude build a wind farm dashboard in Builder, in 47 seconds.](https://lucidui.dev/#watch)

Lucid UI is made to be written by AI coding agents as well as people. There are four ways to work with one: connect a coding agent on your computer to Builder, so it renders, reads its own mistakes and fixes them while you watch; connect claude.ai, ChatGPT or another web app through the hosted bridge; ask any chatbot for a link that opens its work in Builder; or give it the docs and paste what it writes.

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

## Option 2: claude.ai, ChatGPT and other web apps

AI apps that run in the browser can't start the bridge on your computer, so Lucid hosts one for them. Add it once as a remote MCP connector:

```text
https://build.lucidui.dev/mcp
```

- **claude.ai:** Settings → Connectors → Add custom connector, then paste the address.
- **ChatGPT:** turn on developer mode, then add a connector under Connectors with the same address.
- **Any other app** that supports remote MCP servers over HTTP: use the same address. No sign-in is needed.

Then ask your agent to connect to Lucid Builder and open the link it gives you, which ends in `#relay=`. Keep that Builder tab open while the agent works: it renders there, reads every diagnostic and fixes its own code, just like the local bridge. Your code passes through Lucid's server only to reach your tab, and pairings expire when you disconnect.

## Option 3: any chatbot, with a link that opens in Builder

Grok, ChatGPT, Gemini, Muse and other assistants that can't use MCP can still hand their work straight to Builder. Ask for an "Open in Builder" link at the end, or paste the brief below, which asks for one. The link looks like this:

```text
https://build.lucidui.dev/#name=Pomodoro&code=import%20%7B%20signal...
```

Opening it creates a project from the code and runs it. Builder explains any mistake with its fix, and Share → Publish gives you a short link to post. The code travels in the part of the link after `#`, which browsers never send to a server.

## Option 4: paste the brief

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
