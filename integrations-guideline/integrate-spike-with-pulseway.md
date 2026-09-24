---
description: >-
  Create a Pulseway notification webhook with its REST API so Critical and Elevated device notifications open incidents in Spike and page your on-call team by phone, SMS, Slack or Teams.
---

# Integrate Spike with Pulseway

[Pulseway](https://www.pulseway.com/) is remote monitoring and management for IT teams and MSPs. It watches servers, workstations and network devices and raises a notification when something on one of them needs attention: a disk filling up, a service that stopped, a machine that went offline. Its notification webhooks post a JSON payload for every notification at the priorities you pick, so Spike can open an incident titled after the notification and page whoever is on call, without anybody watching the Pulseway console.

Nothing is installed on the monitored devices. You create one webhook through Pulseway's REST API, pointed at a Spike integration URL, and it covers every device in the organisations you name.

{% hint style="warning" %}
**Pulseway never sends a recovery notification.** There is no field anywhere in the payload that says a problem is over, and no later notification that refers back to an earlier one, so nothing Pulseway sends can close a Spike incident. Give the integration a [resolve timer](../incidents/resolve-timer.md), as described in Step 4 below, or resolve incidents by hand. Without one, Pulseway incidents stay open until somebody closes them.
{% endhint %}

## What Spike does with each notification

| Pulseway notification | What happens in Spike |
| --- | --- |
| The first notification with a given `Title` for a given device | Opens an incident and pages your escalation policy |
| The same `Title` on the same device again | Added as an event to the incident already open. It never pages again |
| A different `Title` on the same device | A separate incident, paged on its own |
| The same `Title` on a different device | A separate incident, paged on its own |
| A notification that reads like a recovery ("back online") | A brand new incident of its own. It does not close the earlier one |
| A notification at a priority you did not ask for | Pulseway never sends it, so Spike never sees it |

Every delivery Spike receives becomes an incident or joins one. Spike does not filter by priority, because you already chose the priorities when you created the webhook in Step 3.

## One incident per device and problem

Spike identifies a Pulseway incident by `DeviceIdentifier` and `Title` together:

* A condition that keeps re-notifying while it persists, the same disk on the same server every monitoring cycle, stays **one** incident and pages once.
* The same problem on two machines, `Low disk space` on two different servers, is **two** incidents, because two machines need two people to do two things.
* Two different problems on one machine, `Low disk space` and `Service stopped` on the same server, are **two** incidents.

`DeviceIdentifier` is Pulseway's own device GUID, which does not change when a device is renamed or moved between groups, so repeats keep landing on the same incident across those changes. Read more about [grouping](../incidents/grouping-incidents.md) and about [suppressing duplicates](../incidents/rate-limiting-on-duplicate-incidents.md) while an incident is open.

## How incidents are titled

The incident title is Pulseway's own `Title` field, exactly as Pulseway sends it. Nothing is added in front of it or after it:

| `Title` in the payload | Incident title in Spike |
| --- | --- |
| `Low disk space` | `Low disk space` |
| `Service stopped` | `Service stopped` |
| `Device offline` | `Device offline` |
| `Ping failed` | `Ping failed` |

{% hint style="info" %}
`Message`, the longer description that names the drive, the computer, the group and the numbers ("The free space on disk drive C: on the computer 'KA-B5796J3' in group 'Acme - IT - HQ' is below 9%"), is deliberately kept out of the title. It changes on every monitoring cycle as the numbers move, and a title that moves breaks the things that read it: the **Repeated N times** grouping on an incident, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text. `Message` is shown in full on the incident page instead.
{% endhint %}

Pulseway titles are short and name the problem rather than the machine. If your team would rather read the device or the client in the title, use a [Title Remapper](../alerts/title-remapper.md), see the sample under the payload reference below.

## Severity

Spike reads the notification's `Priority` and sets the incident's severity from it:

| `Priority` | Severity in Spike |
| --- | --- |
| `Critical` | SEV1 |
| `Elevated` | SEV2 |
| `Normal` | SEV3 |
| `Low` | SEV3 |

Pulseway has four priorities and Spike has three severities, which is why `Normal` and `Low` both land on SEV3. The value is matched without regard to case, so `Critical` and `critical` are read the same way; Pulseway's own API reference writes these values both ways in different places.

Because Pulseway's field is literally named `Priority`, its value also reaches the incident's [priority](../incidents/priority-and-severity.md) where Spike has a matching one: `critical` sets P1, `normal` sets P3 and `low` sets P4. Severity is the field worth writing [alert rules](../alerts/alert-rules.md) against, since all four Pulseway priorities map onto it. Those same rules can route an incident to another escalation policy or suppress it entirely, which is how you send a whole client's `Low` notifications somewhere quieter than the pager.

## Prerequisites

* A Pulseway account with permission to create API tokens, and the REST API available on your plan
* A Pulseway integration in Spike and its webhook URL
* `curl`, or any HTTP client, to create the webhook

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Pulseway**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Create a Pulseway API token

Pulseway's REST API authenticates with an API token sent as HTTP Basic auth: the token is the username and the password is empty, which is the trailing `:` in the `curl` commands below.

Create the token from your account in the Pulseway web app, then keep it somewhere safe; Pulseway shows it once. Pulseway's [REST API reference](https://api.pulseway.com/) and its [REST API walkthrough](https://www.pulseway.com/blog/customize-your-pulseway-experience-with-the-rest-api-and-the-cloud-api) cover where tokens live for your account type and which roles may create them.

{% hint style="info" %}
The token is only used by you, once, to create the webhook. Spike never holds a Pulseway token and never calls back into Pulseway: notifications only travel from Pulseway to Spike.
{% endhint %}

## Step 3 — Create the notification webhook

Send one `POST` to `/v3/notifications/webhooks` with the Spike webhook URL from Step 1 and the priorities you want to be paged for:

```bash
curl -X POST https://api.pulseway.com/v3/notifications/webhooks \
  -u "<your-api-token>:" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Spike",
    "Url": "https://hooks.spike.sh/<your-token>/push-events",
    "Priorities": ["Critical", "Elevated"],
    "OrganizationIds": [],
    "Headers": {},
    "Language": "en"
  }'
```

| Field | What to put in it |
| --- | --- |
| `Name` | Anything you will recognise later in the webhook list, such as `Spike` or `Spike — MSP on-call` |
| `Url` | The full Spike webhook URL from Step 1, including `/push-events` |
| `Priorities` | The priorities that should page. Notifications at any other priority are never sent, see below |
| `OrganizationIds` | The Pulseway organisations to cover. An empty array covers all of them, which is what an MSP paging one on-call rotation for every client wants |
| `Headers` | Extra HTTP headers to send. Spike needs none, so leave it empty |
| `Language` | The language Pulseway writes `Title` and `Message` in. Pick one and leave it alone, see the note below |

The response carries the webhook's `Id` and a `SecretKey`. Keep the `Id`, it is how you change or delete the webhook later. The `SecretKey` needs nothing done with it, see "The webhook secret key" below.

{% hint style="warning" %}
`Language` decides the wording of `Title`, and Spike groups repeats on `Title`. Changing the language on a live webhook renames every notification, so conditions that were already firing open fresh incidents under their new names and page again. Set it once, when you create the webhook.
{% endhint %}

Pulseway's API also has the rest of what you need to live with the webhook:

| What you want | Request |
| --- | --- |
| Check what is configured | `GET /v3/notifications/webhooks` |
| Read one webhook | `GET /v3/notifications/webhooks/<id>` |
| Change the priorities, URL or organisations | `PATCH /v3/notifications/webhooks/<id>` |
| Turn the integration off | `DELETE /v3/notifications/webhooks/<id>` |

{% hint style="info" %}
Creating the webhook through the REST API is the path this guide documents, because that is where Pulseway documents notification webhooks. If your Pulseway version also exposes them in the console, the fields are the same ones as above.
{% endhint %}

### Choosing which priorities page you

Priority filtering happens on Pulseway's side, at the moment you create the webhook. Pulseway only delivers the priorities named in `Priorities`, and everything it delivers becomes an incident in Spike, so this one array decides how loud the integration is:

| `Priorities` | What it suits | What to expect |
| --- | --- | --- |
| `["Critical"]` | Teams who only want to be woken for outright failures | The fewest pages. Nothing arrives for degraded-but-working conditions |
| `["Critical", "Elevated"]` | Most on-call rotations, and the recommended starting point | Failures page as SEV1, conditions worth looking at page as SEV2 |
| `["Critical", "Elevated", "Normal"]` | Small estates, or a service whose incidents are triaged rather than paged | Noticeably more incidents. Pair with [alert rules](../alerts/alert-rules.md) to suppress or reroute the SEV3s |
| All four, including `"Low"` | Rarely what you want on a pager | An incident for every notification Pulseway raises on every covered device |

To change your mind later, `PATCH` the webhook rather than trying to filter in Spike. Anything Pulseway sends becomes an incident, so keeping noise out of Spike is cheaper than suppressing it once it is here.

## Step 4 — Set a resolve timer

Pulseway never tells Spike a problem is over, so a resolve timer is the only thing that closes these incidents without a human:

1. Edit the Pulseway integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration comfortably longer than the gap between repeat notifications, so a condition that is still firing is not resolved out from under the person looking at it.

| How often the condition re-notifies | Suggested resolve timer |
| --- | --- |
| Every few minutes, a threshold condition being re-checked | 1 hour |
| Hourly | 4 hours |
| One-shot notifications that never repeat, such as a service that stopped | 8 hours, or 1 day |

A repeat notification is added to the open incident but does not restart the timer. If the timer fires while the condition is still being re-notified, the next notification opens a fresh incident and pages again, which is the behaviour you want for a problem nobody picked up.

{% hint style="info" %}
A timer can also be set from an [alert rule](../alerts/alert-rules.md) instead, if you only want it on some of your Pulseway incidents; for example a long timer on SEV1s and a short one on SEV3s.
{% endhint %}

## The webhook secret key

Pulseway signs each delivery with the `SecretKey` it returned when the webhook was created, and sends the result as a base64 HMAC-SHA-256 of the body in an `x-hmac-signature` header. Spike does not verify that header today, so there is nothing to configure and nothing to paste anywhere.

That makes your webhook URL the credential, exactly as it is for every other Spike integration: it carries a token only your integration has. Treat it as a secret, and if it leaks, archive the integration in Spike, create a new one, and `PATCH` the Pulseway webhook with the new URL.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Payload reference

Pulseway posts `application/json`. A Critical notification looks like this:

```json
{
  "Id": 2733,
  "Title": "Low disk space",
  "Message": "The free space on disk drive C: on the computer 'KA-B5796J3' in group 'Acme - IT - HQ' is below 9% (29.94 GB free of 476.31 GB).",
  "DateTime": "2026-09-24T16:15:02Z",
  "Priority": "Critical",
  "DeviceIdentifier": "8f3c2a1d-4b5e-6f70-8192-a3b4c5d6e7f8",
  "OrganizationId": 4821
}
```

| Field | What Spike does with it |
| --- | --- |
| `Title` | The incident title, verbatim, and half of the grouping key |
| `DeviceIdentifier` | The other half of the grouping key. The device GUID, stable across renames |
| `Priority` | Sets severity: `Critical` SEV1, `Elevated` SEV2, `Normal` and `Low` SEV3. Matched without regard to case |
| `Message` | Shown in full on the incident page. Never used in the title |
| `DateTime` | Recorded per notification, so you can tell the repeats apart on a long-running incident |
| `Id` | Pulseway's notification id. New on every notification, including repeats of the same condition, so it is recorded but never grouped on |
| `OrganizationId` | Shown on the incident, so you can tell which client it came from |

An hour later, the same disk on the same device is still filling up. The `Id`, the `DateTime` and the numbers in `Message` are all different, but `Title` and `DeviceIdentifier` are not, so this joins the incident already open instead of paging again:

```json
{
  "Id": 2745,
  "Title": "Low disk space",
  "Message": "The free space on disk drive C: on the computer 'KA-B5796J3' in group 'Acme - IT - HQ' is below 7% (23.10 GB free of 476.31 GB).",
  "DateTime": "2026-09-24T17:15:02Z",
  "Priority": "Critical",
  "DeviceIdentifier": "8f3c2a1d-4b5e-6f70-8192-a3b4c5d6e7f8",
  "OrganizationId": 4821
}
```

An `Elevated` notification on a different device. Different title, different device, so this is its own incident, opened at SEV2:

```json
{
  "Id": 2801,
  "Title": "Service stopped",
  "Message": "The service 'Print Spooler' on the computer 'ACME-WKS-014' has stopped unexpectedly.",
  "DateTime": "2026-09-24T18:02:11Z",
  "Priority": "Elevated",
  "DeviceIdentifier": "1b2c3d4e-5f60-7182-93a4-b5c6d7e8f9a0",
  "OrganizationId": 4821
}
```

`Normal` and `Low` notifications have the same shape and open incidents at SEV3. They only arrive at all if you named those priorities when you created the webhook:

```json
{
  "Id": 2846,
  "Title": "Windows updates available",
  "Message": "There are 14 Windows updates available on the computer 'ACME-WKS-014'.",
  "DateTime": "2026-09-24T19:30:00Z",
  "Priority": "Normal",
  "DeviceIdentifier": "1b2c3d4e-5f60-7182-93a4-b5c6d7e8f9a0",
  "OrganizationId": 4821
}
```

```json
{
  "Id": 2902,
  "Title": "Device rebooted",
  "Message": "The computer 'ACME-WKS-014' has been restarted.",
  "DateTime": "2026-09-24T20:11:45Z",
  "Priority": "Low",
  "DeviceIdentifier": "1b2c3d4e-5f60-7182-93a4-b5c6d7e8f9a0",
  "OrganizationId": 4821
}
```

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the Pulseway integration replaces the default title with one you write against the payload, which is how an MSP folds the client or the machine into the title:

```handlebars
{{data.Title}} on {{data.DeviceIdentifier}}
```

Output: `Low disk space on 8f3c2a1d-4b5e-6f70-8192-a3b4c5d6e7f8`

Build the remapper from `Title`, `DeviceIdentifier` and `OrganizationId` only. Those three are the same on every notification about the same problem on the same device, so repeats still group under the one incident. `Message`, `Id` and `DateTime` change on every notification, and a title built on them stops repeats grouping and pages your team once per monitoring cycle.

## Things worth knowing

* **Nothing auto-resolves.** Pulseway has no recovery event, so the resolve timer in Step 4 is the answer. This is not a limitation of the integration; there is nothing in the payload to key a resolution off.
* **A "back online" notification is a new incident.** When a device comes back, Pulseway raises that as its own notification with its own `Title`, carrying no reference to the notification that reported the device down. Spike has nothing to match it against, so it opens an incident of its own rather than closing the original. Expect a short-lived pair of incidents for a device that dropped and returned.
* **Priority filtering is Pulseway's job, not Spike's.** Everything delivered becomes an incident. The `Priorities` array is the volume control.
* **Priority casing does not matter.** Pulseway's documentation writes `Critical`, and some of its API responses write `critical`. Both are read the same way.
* **One webhook covers every device.** There is nothing to configure per device or per client, other than `OrganizationIds`. Create a second webhook pointed at a second Spike integration when different clients should page different teams, or keep one and split it with [alert rules](../alerts/alert-rules.md).
* **The URL is the credential.** `x-hmac-signature` is not verified today, so guard the webhook URL.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the webhook first with `GET /v3/notifications/webhooks`, using the same token you created it with. Confirm the `Url` is the full Spike webhook including `/push-events`, and that `Priorities` contains a priority that has actually fired since you created the webhook. A webhook set to `["Critical"]` on a healthy estate is silent and looks exactly like a broken one.

If the webhook looks right, raise something Pulseway will notify on at one of those priorities, such as stopping a monitored service on a test machine, and watch the service in Spike.

</details>

<details>

<summary>Incidents open but never close</summary>

Expected without a resolve timer. Pulseway never sends a recovery notification, so no code path in Spike can close a Pulseway incident. Turn on **Resolve by Timer** on the integration (Step 4), or add a **Resolve After** action on an [alert rule](../alerts/alert-rules.md) if you only want it for some incidents.

</details>

<details>

<summary>Every notification opens a new incident</summary>

The previous incident was already resolved, by hand or by the resolve timer, and Spike only appends to an incident that is still open. If it happens constantly, the resolve timer is shorter than the gap between repeat notifications; raise it using the table in Step 4.

Check the titles too. Grouping is on `Title` and `DeviceIdentifier`, so a title that differs between notifications, because the webhook's `Language` changed or because a [Title Remapper](../alerts/title-remapper.md) reads a field that moves, splits one problem into many incidents.

</details>

<details>

<summary>Two incidents for what looks like one problem</summary>

Usually two devices. `Low disk space` on two servers is two incidents on purpose, because the grouping key includes `DeviceIdentifier`; the device is named in `Message` on each incident, so compare those. Two different conditions on one device, a full disk and a service that stopped because of it, are also two incidents, each paging on its own.

</details>

<details>

<summary>Severity is not what we expected</summary>

Severity comes from `Priority` on the notification that opened the incident: `Critical` SEV1, `Elevated` SEV2, `Normal` and `Low` SEV3. A notification that joins an incident already open does not change that incident's severity, so a condition that opened at SEV2 and later re-notifies as `Critical` stays SEV2 with the newer notification recorded on it. Use [alert rules](../alerts/alert-rules.md) to set severity from the title or the service when Pulseway's priority is not the judgement you want.

</details>

<details>

<summary>On-call is being paged for things that are not incidents</summary>

Look at `Priorities` on the webhook rather than at Spike. If `Normal` or `Low` is in that array, every routine notification, updates available, a device rebooted, reaches Spike and becomes an incident. `PATCH` the webhook down to `["Critical", "Elevated"]`. For a single noisy condition that is Critical in Pulseway but not worth a page for you, an [alert rule](../alerts/alert-rules.md) matching its title can suppress or reroute it.

</details>
