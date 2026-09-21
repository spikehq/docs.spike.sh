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

There is one incident per robot. Incident titles read as the robot plus its state, which is what makes them understandable when Spike reads one out on a phone call:

```
Production API is down
```

The rest of the event lands on the incident page rather than in the title:

* The robot the event is for
* The error message Robotalp reported, such as the HTTP status or the timeout that failed the check
* When Robotalp recorded the event
* A link to the event in Robotalp, so on-call can open the timeline for the check

{% hint style="info" %}
Robotalp's **Notification frequency** setting re-sends an alert while a robot stays down. Spike groups those repeats onto the incident that is already open, so the team is paged once and the repeats show up on the incident timeline instead. Leave the setting wherever your team wants it in Robotalp.
{% endhint %}

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
   * **Payload**: `{"source": "robotalp"}` — see below, this one is not optional
4. Click **Test Connection**. Robotalp posts to the URL and tells you whether it got a response back.
5. Save the integration.

{% hint style="warning" %}
**The `source` key in the custom payload is required.** Robotalp merges whatever you put in the **Payload** field into every POST it sends, and it does not publish the key names it uses for the rest of the body. `{"source": "robotalp"}` gives Spike one stable key to recognise your events by. Without it, Spike cannot tell a Robotalp event apart from any other webhook body and the incident will be missing its robot name, error message and link.

Keep the value lowercase and exactly `robotalp`. If you want extra context of your own on every incident, add it alongside rather than replacing it, for example `{"source": "robotalp", "team": "platform"}`.
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
**Test Connection** posts through the same path, so it is a good check that the URL is reachable and the token is right. Robotalp does not document whether the test body is shaped like a real `down` event, so it may open an incident in Spike. If one shows up, resolve it by hand; nothing else is left behind.
{% endhint %}

## Severity

Robotalp does not send a severity with its events, so every incident arrives at your integration's default. Set it yourself with an [alert rule](../alerts/alert-rules.md), which can also route particular robots to a different escalation policy or suppress the ones you do not want to be paged for:

| Condition | Action |
| --- | --- |
| Incident title contains `Production API` | Set severity to `SEV-1` |
| Incident title contains `staging` | Set severity to `SEV-3` |
| Incident details, key `source`, equals `robotalp` | Set severity to `SEV-2` |

The last one is a catch-all for everything from this integration, which is useful when one Spike service takes events from more than one tool.

## Event payload

Robotalp documents what it sends as a list rather than a schema, and does not publish the JSON key names:

* Robot name
* Event type, `down` or `up`
* Timestamp
* Error message
* Event URL
* Whatever you put in the **Payload** field

Spike reads the robot, the state, the time, the error message and the event link out of the body Robotalp sends, and branches on the `source` key you added in Step 2. Anything else you add to the custom payload is carried onto the incident as-is, so it can be matched on in alert rules the same way as the table above.

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

<summary>Incidents arrive but the robot name and error message are missing</summary>

This is the missing `source` key. Open the integration in Robotalp and put `{"source": "robotalp"}` in the **Payload** field, then save. Events sent before that are not reprocessed, so resolve the incomplete incidents by hand.

If the field already has a payload of your own in it, merge the key in rather than replacing what is there: `{"source": "robotalp", "team": "platform"}`.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The recovery closes an incident only when it is for the same robot that opened it. Renaming a robot in Robotalp while it is down splits the two, so the `up` no longer matches the open incident and Spike drops it.

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
