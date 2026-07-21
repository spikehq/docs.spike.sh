---
description: >-
  Connect AI assistants like Claude, ChatGPT, Cursor, and coding agents directly
  to Spike over the Model Context Protocol (MCP).
---

# Remote MCP server

The Spike MCP server lets you connect any AI assistant that supports the Model Context Protocol directly to your Spike data. Query incidents, analyse alerts, check who's on call, acknowledge pages, and manage your on-call configuration — all from the AI tools you already use.

It's a hosted, remote server available at `https://mcp.spike.sh/mcp`. There's nothing to install and nothing to run — point your assistant at the URL and authenticate.

{% hint style="info" %}
The server is a stateless bridge to the Spike API. It stores no data and keeps no credentials — every request forwards your own key or token to Spike and reshapes the response for the assistant. It can create and update, but it **cannot delete, archive, or restore** anything. Irreversible actions stay in the dashboard by design.
{% endhint %}

## What you can do

### Incident analysis and reporting

Ask questions across your incident history without manual data gathering:

> "How many incidents did we have this week, and what's our MTTR?"
>
> "What are the top offenders this month by incident count?"
>
> "Show me every open sev1 and who owns it right now."

The `incident_stats` tool returns totals, MTTA/MTTR, and top offenders over any window. Follow the stats → list → show pattern to go from the shape of the data down to a single incident.

### Incident management

Create and update incidents, and keep the timeline moving:

> "Create a sev2 incident for the payments API degradation."
>
> "Acknowledge the checkout incident and add a note that I'm investigating."
>
> "Resolve INC-456 and set it to p3."

Tools cover create, acknowledge, resolve, unacknowledge, escalate, set priority/severity, reassign, add or remove responders, add notes, and mute/unmute.

### On-call and escalation management

Check schedules, see who's carrying the pager, and set up rotations:

> "Who's on call for the platform team right now, and who's up next?"
>
> "Who would get paged if payments goes down?"
>
> "Set up a day/night on-call: Ada & Ben 9am–9pm, Cy & Dana overnight."
>
> "Override tomorrow's morning shift with me."

The schedule and layer tools take a per-layer restriction (a daily window or weekly day/time ranges), so day/night and weekday-only rotations are a single request.

### Alert routing and outbound webhooks

Inspect and tune how alerts turn into incidents, and where Spike forwards events:

> "List our alert routing rules and what each one matches."
>
> "Add a routing rule that sends database alerts to the platform escalation policy."
>
> "Test the PagerDuty outbound webhook."

### Configuration and setup

Manage the building blocks of your Spike account — services, escalation policies, integrations, and schedules:

> "Create a service for the billing team with a new escalation policy."
>
> "Add a Datadog integration and route it to the payments service."

### Team and organisation visibility

See what exists and how it's wired together:

> "List all teams and their on-call schedules."
>
> "What escalation policies and integrations does the platform team own?"

## Setup

The remote MCP server is available at `https://mcp.spike.sh/mcp`. There are two ways to authenticate, depending on your use case.

### Find MCP in your dashboard

1. Go to **Integrations** in the Spike dashboard.
2. Click **New**.
3. Search for **MCP** — or hit `Cmd + K` anywhere in the dashboard and search for MCP.

Or jump straight there: [https://app.spike.sh/integrations/apps/mcp](https://app.spike.sh/integrations/apps/mcp)

### For interactive use (OAuth)

If you're a human connecting through an AI assistant like Claude, ChatGPT, or Cursor, authenticate with your Spike account via OAuth. The MCP client handles the flow — you just approve access in your browser when prompted. Actions are attributed to your user account, run with your role's permissions, and show you the same data you'd see in the dashboard.

Spike isn't in the connector directories yet, so add it as a **custom connector** using the URL below.

{% tabs %}
{% tab title="Claude Code" %}
Add the remote MCP server:

```bash
claude mcp add spike --transport http https://mcp.spike.sh/mcp
```

Claude Code will prompt you to authorise via your browser on first use.
{% endtab %}

{% tab title="claude.ai" %}
1. Open **Settings → Connectors**.
2. Click **Add custom connector**.
3. Enter `https://mcp.spike.sh/mcp` and save.
4. Click **Connect** and approve access on the Spike consent screen.

Custom connectors are available on Claude's paid plans (Pro, Max, Team, Enterprise). If you don't see **Add custom connector**, it isn't enabled for your plan.
{% endtab %}

{% tab title="Cursor" %}
Add `.cursor/mcp.json` to your project:

```json
{
  "mcpServers": {
    "spike": {
      "url": "https://mcp.spike.sh/mcp"
    }
  }
}
```

Cursor opens your browser to authorise on first use.
{% endtab %}

{% tab title="Claude Desktop" %}
1. Open **Settings → Connectors**.
2. Click **Add custom connector**.
3. Enter `https://mcp.spike.sh/mcp` and save.
4. Click **Connect** and approve access in your browser.
{% endtab %}

{% tab title="ChatGPT" %}
In **Settings → Connectors**, add a custom connector pointing at `https://mcp.spike.sh/mcp` and approve access when prompted.

Requires a plan where custom connectors / developer mode are available.
{% endtab %}

{% tab title="Codex" %}
Use the `mcp-remote` bridge in `~/.codex/config.toml`:

```toml
[mcp_servers.spike]
command = "npx"
args = ["-y", "mcp-remote", "https://mcp.spike.sh/mcp"]
```

`mcp-remote` opens your browser to authorise on first use.
{% endtab %}
{% endtabs %}

### For automated systems (API keys)

If you're connecting programmatic agents, custom workflows, or automation pipelines, use an API key. It authenticates as your organisation rather than a specific user and doesn't expire until you delete it.

1. Get your API key from **Settings → API** in the Spike dashboard.
2. Find your team ID (`x-team-id`) — the team's `_id`, visible in the dashboard URL, or returned by the `list_teams` tool.
3. Pass both as headers when connecting your MCP client to `https://mcp.spike.sh/mcp`:

```json
{
  "mcpServers": {
    "spike": {
      "type": "http",
      "url": "https://mcp.spike.sh/mcp",
      "headers": {
        "x-api-key": "YOUR_API_KEY",
        "x-team-id": "YOUR_TEAM_ID"
      }
    }
  }
}
```

To test connectivity, send the MCP `initialize` request — every MCP client opens a session with this call, and a successful response confirms the endpoint is reachable, your key is valid, and the protocol version is compatible:

```bash
curl -X POST https://mcp.spike.sh/mcp \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-team-id: YOUR_TEAM_ID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "curl", "version": "0.0.1" }
    }
  }'
```

{% hint style="warning" %}
`x-team-id` is **required** for the incident write tools — without it, the request isn't scoped to your organisation and the server refuses to make it. Eight write tools (reassign, add/remove responders, add note, mute/unmute) are **OAuth only** and won't appear on an API-key connection, because they must be attributed to a real person.
{% endhint %}

## Getting the most out of it

### Read your configuration first

Before filtering, routing, or creating anything, ask the discovery tools for what already exists — `list_teams`, `list_services`, `list_integrations`, and `list_escalation_policies` give you the IDs and names you'll need for everything else.

### Get the full briefing with `get_incident`

`get_incident` returns an eight-part briefing rather than a raw record — a one-line assessment, the raw alert payload, the execution timeline, who it routes to, blast radius, repeat pattern, and suggested next tools. Reach for it when you want the AI to actually reason about an incident, not just list its fields.

### Start with stats, then drill in

For analytical questions, follow the stats → list → show pattern:

1. `incident_stats` for the shape (counts, MTTA/MTTR, top offenders)
2. `list_incidents` / `search_incidents` to browse the interesting groups
3. `get_incident` for full detail on specific incidents

This is far more efficient than paginating through incidents one by one.

### Use the right identifier

Identifiers in Spike are **not interchangeable** — the single commonest cause of a failed tool call. Each tool's description says where its IDs come from; the rules are:

| You want | Use this identifier |
|---|---|
| `x-team-id` and any `team_id` | Team **`_id`** from `list_teams` (not the short slug) |
| `create_incident` integration | Integration **`token`** from `list_integrations` |
| `get_integration`, `update_integration` | Integration **`token`** (an `_id` is rejected) |
| `get_service`, `update_service` | Service **`counterId`** (a number) from `list_services` |
| Escalation policy / alert rule | The entity **`_id`** from its `list_*` tool |
| `remove_override` | The override **`id`** from `list_overrides` |

## Security and privacy

* **No storage, no secrets.** The server keeps no database and no copy of your credentials. Each request forwards your key or token to Spike and forgets it.
* **Nothing destructive.** There are no tools to archive, delete, or restore. The one deletion — removing an on-call override — is reversible by re-creating it. An assistant acting on a bad prompt can't wipe your escalation policies.
* **OAuth respects your role.** Signed-in actions run as you, are limited by your Spike permissions, and are attributed to you in the incident timeline.
* **Team scoping is enforced.** Incident write tools refuse to run without a team ID, so a request is always scoped to your organisation.

## Available tools

51 tools are available with an API key; 59 with OAuth. Tools marked **OAuth only** need a real user identity and appear only on a signed-in connection.

**Discovery**

| Tool | Description |
|---|---|
| `list_teams` | List teams and their IDs |
| `list_users` | List users in your organisation |
| `list_integrations` | List integrations with their tokens |
| `list_integration_types` | List available integration types |
| `list_escalation_policies` | List escalation policies |
| `list_services` | List services |
| `get_integration` | Full integration details |
| `get_service` | Full service details |
| `get_escalation_policy` | Full escalation policy details |

**Incidents**

| Tool | Description |
|---|---|
| `list_incidents` | Search and browse incidents with filters |
| `get_incident` | Full incident briefing — assessment, timeline, routing, blast radius |
| `incident_overview` | What needs attention right now |
| `incident_stats` | Totals, MTTA/MTTR, and top offenders over a window |
| `get_incident_activity` | Activity log for an incident |
| `search_incidents` | Search incidents by text |
| `who_owns_incident` | Who is on call for this incident this minute |
| `create_incident` | Create a new incident |
| `acknowledge_incidents` | Acknowledge one or more incidents |
| `resolve_incidents` | Resolve one or more incidents |
| `unacknowledge_incidents` | Move incidents back to open |
| `escalate_incidents` | Escalate to the next level |
| `set_incident_priority` | Set priority (p1–p5) |
| `set_incident_severity` | Set severity (sev1–sev3) |
| `reassign_incidents` *(OAuth only)* | Reassign to another responder |
| `add_responders` *(OAuth only)* | Add responders to an incident |
| `remove_responders` *(OAuth only)* | Remove responders |
| `add_incident_note` *(OAuth only)* | Add a note to the timeline |
| `mute_incidents` *(OAuth only)* | Mute alerts for incidents |
| `unmute_incidents` *(OAuth only)* | Unmute incidents |

**On-call**

| Tool | Description |
|---|---|
| `who_is_on_call` | Who is on call now |
| `get_active_shift` | The currently active shift for a schedule |
| `list_schedules` | List on-call schedules |
| `get_schedule` | Schedule details with current and upcoming shifts |
| `who_is_on_call_next` | Who is up next |
| `get_user_upcoming_shifts` | A user's upcoming shifts |
| `check_user_on_call` | Whether a user is on call now |
| `list_overrides` | List overrides on a schedule |
| `create_override` | Override an on-call slot |
| `remove_override` | Remove an override (reversible) |

**Alert routing**

| Tool | Description |
|---|---|
| `list_alert_routing_rules` | List alert routing rules |
| `get_alert_routing_rule` | Full rule details |
| `update_alert_routing_rule` | Update a rule |
| `create_alert_routing_rule` *(OAuth only)* | Create a rule |

**Outbound webhooks**

| Tool | Description |
|---|---|
| `list_outbound_webhooks` | List outbound webhooks |
| `get_outbound_webhook` | Full webhook details |
| `update_outbound_webhook` | Update a webhook |
| `test_outbound_webhook` | Send a test event |
| `create_outbound_webhook` *(OAuth only)* | Create a webhook |

**Configuration**

| Tool | Description |
|---|---|
| `create_escalation_policy` | Create an escalation policy |
| `update_escalation_policy` | Update an escalation policy |
| `create_service` | Create a service |
| `update_service` | Update a service |
| `create_integration` | Create an integration |
| `update_integration` | Update an integration |
| `create_oncall_schedule` | Create an on-call schedule |
| `update_oncall_schedule` | Update a schedule |
| `add_oncall_layer` | Add a rotation layer to a schedule |
| `update_oncall_layer` | Update a layer |
| `remove_oncall_layer` | Remove a layer |

Still stuck? Email [support@spike.sh](mailto:support@spike.sh).
