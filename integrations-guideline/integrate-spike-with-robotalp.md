---
description: >-
  Send Robotalp uptime alerts to Spike over a webhook so a robot going down pages on-call on phone, SMS, Slack or Teams, and recovery resolves the incident.
---

# Integrate Spike with Robotalp

[Robotalp](https://robotalp.com) watches your sites, APIs and servers with robots, and can push every event it raises to a webhook. Point that webhook at Spike and a robot going down opens an incident that escalates through your on-call policy, while the recovery for the same robot closes it again.

One Robotalp webhook integration serves every robot in the workspace. You choose which robots use it on each robot's **Alerts** tab, so a handful of production robots can page on-call while the rest stay quiet.

## What Spike does with each event

Robotalp sends the event type on every POST, and Spike reacts to it:

| Event | What happens in Spike |
| --- | --- |
| `down` | Opens an incident for that robot, or adds an event to the one already open |
| `up` | Resolves the open incident for that robot. Dropped when nothing is open |
| `paused` | Never opens an incident. Pausing a robot is a person's decision, not an outage |
| `test` | Opens an incident titled `Robot Alp test connection`, so you can see the delivery worked. Resolve it by hand |

Robotalp names the same states in more than one way depending on the robot and the account, so Spike matches on the words in the event rather than the exact string. `Robot Up`, `up`, `online`, `recovered` and `"isUp": true` all read as a recovery and resolve the open incident for that robot.

There is one incident per robot, matched on the robot id when Robotalp sends one and on the robot name, or its URL, when it does not.

The rest of the event lands on the incident page rather than in the title:

* The robot the event is for
* The error message Robotalp reported, such as the HTTP status or the timeout that failed the check
* When Robotalp recorded the event
* A link to the event in Robotalp, so on-call can open the timeline for the check

{% hint style="info" %}
Robotalp's **Notification frequency** setting re-sends an alert while a robot stays down. Spike groups those repeats onto the incident that is already open, so the team is paged once and the repeats show up on the incident timeline instead. Leave the setting wherever your team wants it in Robotalp.
{% endhint %}

## Incident titles

The title says what went wrong as well as which robot it was, so on-call can judge an alert without opening the incident first. That matters most when Spike reads the title out on a phone call.

The reason in the title is a short fixed category that Spike works out from the error message Robotalp sent — `timeout`, `HTTP 503`, `connection refused`, `DNS failure`, `missed heartbeat` and so on — never the raw error text. The full message Robotalp sent is still on the incident.

| What Robotalp sent | Incident title |
| --- | --- |
| Robot `Checkout API (prod)` down, `Connection timed out after 30000 ms from 3 locations` | `Checkout API (prod) is down: timeout` |
| The same robot down, `HTTP 503 Service Unavailable` | `Checkout API (prod) is down: HTTP 503` |
| The same robot back up | `Checkout API (prod) is up` |
| Robot `Nightly billing cron` down, `No ping received in the last 25 hours` | `Nightly billing cron is down: missed heartbeat` |
| Robot `shop.acme-demo.io` down, `SSL certificate expires in 6 days (threshold 14 days)` | `shop.acme-demo.io: SSL certificate expiring` |
| A down event that names no robot | `Robot Alp alert with no robot name` |

{% hint style="info" %}
Look at the SSL row. Robotalp's SSL and domain robots report an approaching certificate or domain expiry as a **Down** event, even though the site is still serving traffic. Spike recognises those and leaves `is down` off the title, so a certificate with a fortnight left on it does not read like an outage. The same goes for blacklist and PageSpeed robots.
{% endhint %}

A robot name long enough to push the title past 200 characters is shortened at a word boundary with `...`, and the `is down: timeout` part is kept whole rather than truncated away.

## Prerequisites

* A Robotalp account with access to **Integrations** in the workspace
* At least one robot you want to be paged for
* A Robotalp integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Robotalp**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Robotalp

1. In Robotalp, open the menu at the top right and go to **Integrations**.
2. Click **Add Integration** and choose **Webhook**.
3. Fill in the form:
   * **Webhook URL**: the URL you copied in Step 1
   * **Headers**: leave empty. Spike authenticates on the token in the URL and needs no header of its own
   * **Payload**: optional. `{"source": "robotalp"}` is worth adding — see below
4. Click **Test Connection**. Robotalp posts to the URL and tells you whether it got a response back.
5. Save the integration.

{% hint style="info" %}
Robotalp merges whatever you put in the **Payload** field into every POST it sends. Spike does not need anything in there: events arriving on this webhook URL are already known to be from this integration, because the token in the URL is what routes them.

`{"source": "robotalp"}` is still worth adding. It makes Robotalp bodies easy to spot when someone is reading an incident payload next to events from your other tools, and it gives alert rules a key to match on. Anything else you want on every incident goes alongside it, for example `{"source": "robotalp", "team": "platform"}`.
{% endhint %}

## Step 3 — Turn the webhook on for the robots you care about

Adding the integration does not page anyone on its own. Enable it per robot:

1. Open a robot and go to its **Alerts** tab.
2. Turn on the webhook integration you just created.
3. Save the robot, and repeat for every robot that should reach this Spike service.

Robots that should page a different team get their own Spike integration, with its own webhook URL and its own Robotalp integration entry, and you pick the right one per robot here.

## Step 4 — Check it works

The quickest end-to-end check is a robot that really fails. Point a throwaway HTTP robot at a URL that returns a 500, or at a hostname that does not resolve, enable the webhook on its **Alerts** tab and wait for it to go down. The incident should appear in Spike with the robot name in the title. Then point the robot back at something healthy and confirm the incident resolves on its own when Robotalp reports it up.

{% hint style="info" %}
**Test Connection** posts through the same path, so it is a good check that the URL is reachable and the token is right. It opens an incident in Spike, titled `Robot Alp test connection` when the body says it is a test. Robotalp does not document the shape of that body, so a test that looks like a real event is titled like one. Either way, resolve it by hand afterwards; nothing else is left behind.
{% endhint %}

## Severity

Robotalp does not send a severity with its events, so every incident arrives at your integration's default. Set it yourself with an [alert rule](../alerts/alert-rules.md), which can also route particular robots to a different escalation policy or suppress the ones you do not want to be paged for:

| Condition | Action |
| --- | --- |
| Incident title contains `Production API` | Set severity to `SEV-1` |
| Incident title contains `staging` | Set severity to `SEV-3` |
| Incident details, key `source`, equals `robotalp` | Set severity to `SEV-2` |

The last one is a catch-all for everything from this integration, useful when one Spike service takes events from more than one tool. It needs the `source` key from Step 2 to be on the payload; without it, match on the title instead.

## Event payload

Robotalp documents what it sends as a list rather than a schema, and does not publish the JSON key names:

* Robot name
* Event type, `down` or `up`
* Timestamp
* Error message
* Event URL
* Whatever you put in the **Payload** field

Spike reads the robot, the state, the time, the error message and the event link out of the body Robotalp sends. It does not depend on one fixed spelling for those: the robot arrives as `robot_name`, `robotName`, `Robot Name` or, for a robot with no name of its own, as the URL it checks, and Spike reads all of them the same way. Anything you add in the **Payload** field is carried onto the incident as-is, so it can be matched on in alert rules the same way as the table above.

To see exactly what your own account sends, open the incident in Spike and look at the payload on it. That is the body Robotalp posted, verbatim.

{% hint style="info" %}
Robotalp does not sign its webhooks. The token in the URL is the only credential on this integration, so treat the URL as a secret.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Work down the path the event takes:

* Click **Test Connection** on the integration in Robotalp. If it fails there, the URL is wrong. It must be the full `https://hooks.spike.sh/<your-token>/push-events` from the Spike integration, with nothing trimmed off the end.
* If the test succeeds but real events do not arrive, the webhook is probably not enabled on the robot. Open the robot's **Alerts** tab and check the integration is turned on there.
* Confirm the robot actually raised an event in the window you are looking at. A robot that never went down sends nothing.

</details>

<details>

<summary>An incident is titled "Robot Alp alert with no robot name"</summary>

That title means the event carried nothing Spike could name the robot by: no robot name, no robot id and no URL. Open the payload on the incident to see what did arrive.

The usual cause is a robot saved without a name in Robotalp. Give it one and later events will be titled with it. Robots that only ever have a URL are fine — Spike titles those with the URL, with the scheme stripped, as in `status.acme-demo.io/health is down: HTTP 502`.

Events like this still group together rather than opening one incident each, so a misconfigured robot does not flood the dashboard.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The recovery closes an incident only when it is for the same robot that opened it. Robotalp sends a robot id on most payloads and Spike matches on that first, so renaming a robot mid-outage still resolves the incident it opened. Where the payload carries no id, the name is all Spike has to go on, and a rename while the robot is down splits the two: the `up` no longer matches the open incident and is dropped.

If someone already resolved the incident by hand in Spike, the later `up` has nothing to close and is dropped, which is expected.

For robots where no recovery is ever coming, such as a one-off check you deleted, use a [resolve timer](resolve-timer-for-incidents.md) so the incident closes itself.

</details>

<details>

<summary>The same outage pages the team repeatedly</summary>

Repeats of a `down` event group onto the incident that is already open and do not raise a new alert. If you are being paged again for the same robot, check whether the incident was resolved in between, either by hand or by a resolve timer that is shorter than the outage. A resolved incident means the next repeat is treated as a new problem, because as far as Spike knows the old one was dealt with.

Turning **Notification frequency** down in Robotalp also cuts the repeats off at the source.

</details>

<details>

<summary>Someone shared the webhook URL</summary>

Robotalp does not sign its payloads, so the token in the URL is the only thing protecting the integration. If it leaks, archive the integration in Spike and create a new one, then update the URL in Robotalp.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

</details>
