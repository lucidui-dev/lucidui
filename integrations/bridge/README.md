# Lucid UI bridge

Connect your coding agent to [Lucid Builder](https://build.lucidui.dev). Your agent writes a Lucid UI app, it renders live in your browser, and every error and Lucid diagnostic goes straight back to the agent with its fix.

It is a small MCP server with no dependencies. It runs on your computer and talks to your Builder tab over `127.0.0.1`. Nothing is uploaded.

## Add it to your agent

Claude Code:

```sh
claude mcp add lucid -- npx -y @lucidui-dev/bridge
```

Cursor, Windsurf, VS Code and other MCP clients:

```json
{
  "mcpServers": {
    "lucid": { "command": "npx", "args": ["-y", "@lucidui-dev/bridge"] }
  }
}
```

## Use it

1. Ask your agent: "Connect to Lucid Builder." It replies with a pairing link.
2. Open the link in Chrome, Edge or Firefox. If the browser asks to allow access to apps on this device, allow it.
3. Ask for what you want: "Make a settings page." The agent renders it, reads the diagnostics, and fixes them until the page is clean.

## Tools

| Tool | What it does |
| --- | --- |
| `connect_builder` | Returns the pairing link for your Builder tab |
| `render` | Runs an app in the Builder and returns errors, console output and Lucid diagnostics with fixes |
| `get_code` | Reads the code in the Builder editor, including your hand edits |
| `status` | Says whether a Builder tab is paired |

## Settings

- `LUCID_BRIDGE_PORT`: first port to try, default `7357`
- `LUCID_BUILDER_URL`: Builder address, default `https://build.lucidui.dev`

Safari may block a secure page from talking to `127.0.0.1`. Use Chrome, Edge or Firefox for the Builder tab.

MIT licensed. Part of [Lucid UI](https://lucidui.dev).
