---
description: >-
  Send ITRS Geneos alerts to Spike with a Script effect, so a breached dataview cell pages your on-call rotation by phone, SMS, Slack or Teams, and the incident resolves when Geneos clears the alert.
---

# Integrate Spike with ITRS Geneos

[ITRS Geneos](https://www.itrsgroup.com/products/geneos) monitors servers, applications and middleware through Netprobes and a Gateway. When a dataview cell or headline crosses a threshold, the Gateway's **Alerting** subsystem runs an **effect**. Geneos has no built-in webhook, so you add a **Script** effect that posts the alert to Spike as JSON.

Once it is set up, an alert pages your on-call rotation when it fires, repeats and escalations land on the same incident, and the incident resolves itself when Geneos sends the clear.

## Service and integration

Add the ITRS Geneos integration to a service and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Set up the Script effect in Geneos

You need a host the Gateway runs on that has `curl` and `jq` installed and can reach `hooks.spike.sh` over HTTPS.

#### Step 1

On the Gateway host, create the script `spike-geneos.sh`, for example in `/opt/geneos/scripts/`, and make it executable with `chmod +x spike-geneos.sh`. Replace the URL with the webhook you copied from Spike.

```bash
#!/bin/bash
# Send a Geneos alert to Spike.sh

SPIKE_URL="https://hooks.spike.sh/********************/push-events"

jq -n \
  --arg _ALERT "$_ALERT" \
  --arg _ALERT_TYPE "$_ALERT_TYPE" \
  --arg _CLEAR "$_CLEAR" \
  --arg _ALERT_CREATED "$_ALERT_CREATED" \
  --arg _ALERT_CLEARED "$_ALERT_CLEARED" \
  --arg _HIERARCHY "$_HIERARCHY" \
  --arg _RULE "$_RULE" \
  --arg _SEVERITY "$_SEVERITY" \
  --arg _VALUE "$_VALUE" \
  --arg _VARIABLEPATH "$_VARIABLEPATH" \
  --arg _GATEWAY "$_GATEWAY" \
  --arg _PROBE "$_PROBE" \
  --arg _NETPROBE_HOST "$_NETPROBE_HOST" \
  --arg _MANAGED_ENTITY "$_MANAGED_ENTITY" \
  --arg _SAMPLER "$_SAMPLER" \
  --arg _DATAVIEW "$_DATAVIEW" \
  --arg _ROWNAME "$_ROWNAME" \
  --arg _COLUMN "$_COLUMN" \
  --arg _HEADLINE "$_HEADLINE" \
  --arg _REPEATCOUNT "$_REPEATCOUNT" \
  '$ARGS.named' |
curl --silent --show-error --max-time 20 \
  --header "Content-Type: application/json" \
  --request POST \
  --data @- \
  "$SPIKE_URL"
```

`jq` builds the JSON so that the quotes inside `_VARIABLEPATH` are escaped correctly. Do not assemble the body with plain string concatenation.

#### Step 2

Open the **Gateway Setup Editor**. In the navigation tree go to **Alerting** → **Effects** and add a new effect. Choose **Script** as its type and set:

| Field | Value |
| --- | --- |
| **Name** | `Spike` |
| **Script** | The full path to the script, for example `/opt/geneos/scripts/spike-geneos.sh` |

Leave the script's arguments empty. Geneos passes the alert to the script through environment variables, and the script reads them.

#### Step 3

Go to **Alerting** → **Hierarchies** and open the hierarchy that decides which data items alert (or create one). Add the `Spike` effect to the alert's **Effects**, and use it on the **Alert**, **Clear** and **Resume** notifications. Do not skip **Clear**: it is what resolves the Spike incident.

#### Step 4

Make sure a rule or **Alerting** → **Alerts** entry matches the data items you want to be paged for, and that it runs the hierarchy from step 3. Then **Save** the setup. The Gateway picks up the change on save.

#### Step 5

Trigger a test alert, or wait for a real one. The incident appears on the service in Spike within seconds.

## Payload

The script sends one JSON object per alert. All values are strings, and a field Geneos leaves empty is sent as an empty string. This is the body of a firing alert:

```json
{
  "_ALERT": "Production CPU/db-prod-03/CPU/CRITICAL/0",
  "_ALERT_TYPE": "Alert",
  "_CLEAR": "FALSE",
  "_ALERT_CREATED": "2026-10-09 03:12:44",
  "_ALERT_CLEARED": "",
  "_HIERARCHY": "Production CPU",
  "_RULE": "",
  "_SEVERITY": "CRITICAL",
  "_VALUE": "97.42",
  "_VARIABLEPATH": "/geneos/gateway[(@name=\"GW_PROD_LDN\")]/directory/probe[(@name=\"db-prod-03\")]/managedEntity[(@name=\"db-prod-03\")]/sampler[(@name=\"CPU\")][(@type=\"\")]/dataview[(@name=\"CPU\")]/rows/row[(@name=\"Average_cpu\")]/cell[(@column=\"percentUtilisation\")]",
  "_GATEWAY": "GW_PROD_LDN",
  "_PROBE": "db-prod-03",
  "_NETPROBE_HOST": "db-prod-03.ldn.example.com",
  "_MANAGED_ENTITY": "db-prod-03",
  "_SAMPLER": "CPU",
  "_DATAVIEW": "CPU",
  "_ROWNAME": "Average_cpu",
  "_COLUMN": "percentUtilisation",
  "_HEADLINE": "",
  "_REPEATCOUNT": "0"
}
```

And this is the body Geneos sends when the same alert clears:

```json
{
  "_ALERT": "Production CPU/db-prod-03/CPU/CRITICAL/0",
  "_ALERT_TYPE": "Clear",
  "_CLEAR": "TRUE",
  "_ALERT_CREATED": "2026-10-09 03:12:44",
  "_ALERT_CLEARED": "2026-10-09 03:27:10",
  "_HIERARCHY": "Production CPU",
  "_RULE": "",
  "_SEVERITY": "OK",
  "_VALUE": "41.08",
  "_VARIABLEPATH": "/geneos/gateway[(@name=\"GW_PROD_LDN\")]/directory/probe[(@name=\"db-prod-03\")]/managedEntity[(@name=\"db-prod-03\")]/sampler[(@name=\"CPU\")][(@type=\"\")]/dataview[(@name=\"CPU\")]/rows/row[(@name=\"Average_cpu\")]/cell[(@column=\"percentUtilisation\")]",
  "_GATEWAY": "GW_PROD_LDN",
  "_PROBE": "db-prod-03",
  "_NETPROBE_HOST": "db-prod-03.ldn.example.com",
  "_MANAGED_ENTITY": "db-prod-03",
  "_SAMPLER": "CPU",
  "_DATAVIEW": "CPU",
  "_ROWNAME": "Average_cpu",
  "_COLUMN": "percentUtilisation",
  "_HEADLINE": "",
  "_REPEATCOUNT": "0"
}
```

### Required and optional fields

| Field | Required | How Spike uses it |
| --- | --- | --- |
| `_VARIABLEPATH` | Yes | The identity of the alert. Firing, repeats, escalations and the clear all carry the same path, so they share one incident. |
| `_ALERT_TYPE` | Yes | `Clear` (or `Delete`) resolves the incident. `Alert` and `Resume` fire. `Suspend` and `ThrottleSummary` never open an incident. Compared case-insensitively. Empty when the script is run from a Rule Action. |
| `_CLEAR` | Yes | `TRUE` marks a clear. Used when `_ALERT_TYPE` is empty. |
| `_SEVERITY` | Yes | `UNDEFINED`, `OK`, `WARNING`, `CRITICAL` or `USER`. Shown at the start of the title. When `_ALERT_TYPE` is empty, `OK` means recovered. |
| `_VALUE` | No | The reading that triggered the alert, shown in the title. |
| `_ROWNAME`, `_COLUMN` | No | Together they name the table cell in the title. |
| `_HEADLINE` | No | Names the item in the title when the alert is on a headline instead of a table cell. |
| `_SAMPLER` | No | Names the item in the title when there is no row, column or headline. |
| `_DATAVIEW` | No | Shown as "in *dataview*". |
| `_MANAGED_ENTITY`, `_NETPROBE_HOST`, `_PROBE`, `_GATEWAY` | No | Where the problem is. The first one that is not empty is used, in that order. `_GATEWAY` also names a throttle summary. |
| `_ALERT`, `_HIERARCHY`, `_RULE`, `_REPEATCOUNT`, `_ALERT_CREATED`, `_ALERT_CLEARED` | No | Kept on the incident as context. They do not affect matching. |

Send the whole body as shown, even for fields you expect to be empty.

## How Spike handles each notification

| `_ALERT_TYPE` | What happens in Spike |
| --- | --- |
| `Alert`, `Resume` | Opens an incident, or adds an event to the one already open for the same `_VARIABLEPATH` |
| `Clear`, `Delete` | Resolves the open incident for that `_VARIABLEPATH` |
| `Suspend`, `ThrottleSummary` | Never opens an incident |
| Empty (Rule Action) | `_CLEAR` of `TRUE` or `_SEVERITY` of `OK` resolves. Anything else fires |

Identity is the data item, not the alert name. `_ALERT` includes the severity and escalation step, so it changes as an alert escalates and is not used for matching. A Critical alert that escalates, or whose value moves, stays one incident.

## Incident title

Geneos sends no sentence describing the fault, so Spike builds the title from the fields.

| Notification | Title |
| --- | --- |
| Firing | `Critical: Average_cpu percentUtilisation is 97 in CPU on db-prod-03` |
| Clear | `Cleared: Average_cpu percentUtilisation in CPU on db-prod-03` |

The title has these parts:

* **Severity** is `_SEVERITY` in title case.
* **What** is `_ROWNAME` and `_COLUMN`, else `_HEADLINE`, else `_SAMPLER`.
* **Value** is `_VALUE`. Numbers from 10 up are shown whole with thousands separators, numbers below 10 with two significant digits. Text is quoted and capped at 80 characters.
* **Where** is the first non-empty of `_MANAGED_ENTITY`, `_NETPROBE_HOST`, `_PROBE`, `_GATEWAY`.

The severity and value are shown only when `_VARIABLEPATH` is present. Without it, Spike can only match a repeat or clear by title, so it uses a plain title that never changes between notifications.

## Troubleshooting

* **No incident appears.** Run the script by hand on the Gateway host with the variables set (`_VARIABLEPATH=x _ALERT_TYPE=Alert ./spike-geneos.sh`) and check `curl` is not blocked by a proxy or firewall.
* **Incidents do not resolve.** Check that the `Spike` effect is also used on the **Clear** notification, and that `_VARIABLEPATH` is not empty.
* **Every notification opens a new incident.** `_VARIABLEPATH` is empty or missing. Confirm the script is run from an Alerting effect and that `jq` is installed.
