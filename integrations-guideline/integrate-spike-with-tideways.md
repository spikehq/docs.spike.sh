---
description: >-
  Send Tideways threshold incidents and exceptions to Spike so your PHP on-call rotation is paged by phone, SMS, Slack or Teams, and incidents resolve themselves when Tideways closes the incident or the exception is resolved.
---

# Integrate Spike with Tideways

[Tideways](https://tideways.com) profiles PHP applications and watches them for slow response times, rising error rates, slow SQL and new exceptions. Its **Webhook** integration posts a JSON notification to a URL you choose, so a Spike integration URL turns a Tideways monitoring notification into an incident that pages your on-call rotation, and turns the matching close or resolve notification into an auto-resolve.

Nothing is installed anywhere. You add the webhook once at the Tideways organization level, enable it on the projects that should page somebody, and the two stay in sync from there.

## What Spike does with each notification

Every Tideways delivery carries a `type`, and the `type` decides which of two lifecycles applies.

### Threshold incidents

`response_time`, `error_rate`, `transaction-response-time`, `transaction-failure-rate`, `slow-sql` and `missing-data` are threshold notifications. They carry a `notification.status` and a `notification.incident_id`.

| `notification.status` | What happens in Spike |
| --- | --- |
| `opened` | Opens an incident for that Tideways incident and pages the escalation policy |
| `ongoing` | Added as an event to the incident already open. It never pages again |
| `closed` | Auto-resolves the open incident. Dropped when nothing is open |

Spike identifies a threshold incident by the organization, the application and `notification.incident_id` together, so the whole life of one Tideways incident — opened, every `ongoing` update, and the close — lands on a single Spike incident, and the same `incident_id` arriving for a different application stays a separate incident.

### Exceptions

`exception` notifications carry an error group instead of an incident id, and their own set of statuses.

| `notification.status` | What happens in Spike |
| --- | --- |
| `new` | Opens an incident for that error group and pages the escalation policy |
| `open` | Opens an incident for that error group if none is open, otherwise added as an event |
| `resolved` | Auto-resolves the open incident |
| `not_error` | Auto-resolves the open incident. Somebody marked the exception as not an error in Tideways |
| `ignored` | Auto-resolves the open incident. Somebody ignored the exception in Tideways |

Exceptions are identified by `notification.error_group.id` alone. That id is stable for the life of the error group in Tideways, so an exception that reappears after being resolved opens a fresh incident and pages again.

### Notifications Spike ignores

| `type` | What happens in Spike |
| --- | --- |
| `weekly_report` | Nothing. No incident, no event |
| `release` | Nothing. No incident, no event |
| `compare_release` | Nothing. No incident, no event |

These three are informational: a digest and two deployment notices. They carry neither an incident id nor an error group, so there is nothing for Spike to open an incident about or attach an event to. Send them to email or Slack from Tideways if you want them.

{% hint style="info" %}
A threshold incident and an exception in the same application can never collide, even when they fire at the same second. They are identified by different fields — `incident_id` against `error_group.id` — so each gets its own Spike incident with its own escalation.
{% endhint %}

## `missing-data` has no close notification

`missing-data` tells you Tideways stopped receiving data from an application. Tideways sends it **once** and never sends a close for it, so nothing in the payload can ever resolve that incident.

Turn on [Resolve by Timer](../incidents/resolve-timer.md) on the Tideways integration, or resolve those incidents by hand. A few hours is a reasonable duration: long enough that nobody loses the incident they are working on, short enough that a one-off gap in profiling data does not sit open all week.

{% content-ref url="../incidents/resolve-timer.md" %}
[resolve-timer.md](../incidents/resolve-timer.md)
{% endcontent-ref %}

{% hint style="info" %}
The timer applies to the whole integration, including the threshold types that do close themselves. That is harmless — a `closed` notification resolves the incident first, and the timer only ever catches an incident that nothing else resolved. If you would rather scope the timer to `missing-data` alone, add a **Resolve After** action on an [alert rule](../alerts/alert-rules.md) that matches the `missing-data` title instead.
{% endhint %}

## Incident titles

Titles are built from the fields that stay the same for the life of a Tideways incident, so repeats group onto the incident already open and read the same way on a phone call, in Slack and on a lock screen.

| Notification | Title | Built from |
| --- | --- | --- |
| Threshold incident | `checkout-api: response_time above threshold` | `application` and `type` |
| Exception | `PDOException: SQLSTATE[HY000] [2002] Connection refused` | `notification.error_group.class` and `notification.error_group.message` |

Every threshold type reads the same way, with its own `type` in the middle:

```
checkout-api: response_time above threshold
checkout-api: error_rate above threshold
checkout-api: transaction-response-time above threshold
checkout-api: transaction-failure-rate above threshold
checkout-api: slow-sql above threshold
checkout-api: missing-data above threshold
```

The measured value, the threshold it crossed, the Tideways organization and the link back to Tideways stay in the payload and show up on the incident page. They are deliberately kept out of the title: `value` changes on every `ongoing` update, and a title that moves breaks the **Repeated N times** grouping on an incident, duplicate suppression, and any [alert rule](../alerts/alert-rules.md) matching on title text.

### Title Remapper sample

Use a [Title Remapper](../alerts/title-remapper.md) if you would rather see the Tideways organization, the value or a team name in the title:

```handlebars
{{data.organization}}/{{data.application}}: {{data.type}} at {{data.notification.value}}
```

Output: `acme/checkout-api: response_time at 1250`

Write the remapper against `organization`, `application` and `type`, which are fixed for the life of a Tideways incident. A remapper built on `notification.value` produces a different title on every update, which splits one problem across several incidents, and exception deliveries carry no `value` at all.

## Severity

Tideways notifications carry no severity of their own, so incidents come in at your integration's default. Set severity with [alert rules](../alerts/alert-rules.md) — the same rules route the incident to another escalation policy or suppress it entirely, which is how you send `slow-sql` on a staging application somewhere quieter than the pager while `error_rate` on production still rings a phone.

Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Tideways organization you are an **Owner** or **Administrator** of, so you can add an organization-level integration
* A Tideways integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Tideways**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook to your Tideways organization

Webhooks live at the organization level in Tideways. You add one, and then enable it on each project that should use it.

{% tabs %}
{% tab title="Setup on Tideways" %}
1. **Open your organization's integrations:**
   In Tideways, go to **Organizations**, pick your organization, and open **Integrations**.

2. **Add the integration:**
   Click **Add New Integration** and choose **Webhook**.

3. **Point it at Spike:**
   Paste the webhook URL from Step 1 into the URL field and give the integration a name you will recognise in the per-project list, for example `Spike — PHP on-call`.

4. **Save it.**
   The integration now exists for the whole organization. It does not notify on anything yet.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Add one Tideways webhook integration per Spike integration. Two Spike integrations pointing at different services — one for the checkout team, one for the platform team — means two webhook integrations in Tideways, each enabled on its own set of projects.
{% endhint %}

## Step 3 — Enable it on each project

An organization-level integration does nothing until a project turns it on.

{% tabs %}
{% tab title="Setup on Tideways" %}
1. **Open the project:**
   Go to the project you want paged for and open **Project Settings → Configure Notifications**.

2. **Enable the webhook:**
   Find the webhook integration you created in Step 2 and enable it.

3. **Pick what it notifies on:**
   Enable the notification types this project should page for — response time, error rate, transaction metrics, slow SQL, missing data and exceptions. Leave the weekly report and the release notifications off if you only want them elsewhere; Spike ignores them anyway.

4. **Save, and repeat for every project** that should page this Spike integration.
{% endtab %}
{% endtabs %}

## Step 4 — Verify with Preview

The webhook integration in Tideways has a **Preview** feature that sends a sample delivery to the URL. Use it to confirm the wiring before waiting on a real problem:

1. Open the webhook integration under **Organizations → your organization → Integrations**.
2. Click **Preview**.
3. Watch for the incident in Spike. It shows up within a few seconds, titled from the sample payload.
4. Resolve that incident in Spike once you have seen it.

A Preview delivery is a real POST to a real integration, so it pages whoever is on call for the attached escalation policy. Run it during working hours, or attach the integration to a test service first and move it once the wiring is confirmed.

## Things worth knowing

* **Tideways does not retry.** A delivery that fails — a network blip, a URL with a typo — is gone, and no incident is created for it. If a problem you expected to be paged for produced nothing in Spike, check the URL on the webhook integration rather than waiting for a redelivery.
* **The URL is the credential.** Tideways sends no signature header, so there is nothing for Spike to verify. Your webhook URL carries a token only your integration has, the same model every other Spike integration uses. If it leaks, archive the integration in Spike, create a new one and update the URL in Tideways.
* **Resolving in Spike does not change anything in Tideways.** Resolve the Tideways incident or the exception on the Tideways side and let the `closed`/`resolved` notification resolve the Spike incident, to keep the two in step.
* **A close that arrives with nothing open is dropped.** That is the normal case after somebody resolved the Spike incident by hand, or after the resolve timer fired.
* **One incident per Tideways incident, not per notification.** A threshold incident that stays open for an hour and sends a dozen `ongoing` updates is one Spike incident with a dozen events on it.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Payload reference

Tideways posts `application/json`. Every delivery uses the same envelope, and `notification` holds the part that differs per `type`:

```json
{
  "type": "response_time",
  "link": "https://app.tideways.io/incidents/8f3c2a1d",
  "organization": "acme",
  "application": "checkout-api",
  "date": "2026-09-24T09:15:00Z",
  "notification": { }
}
```

| Field | What Spike does with it |
| --- | --- |
| `type` | Decides the lifecycle: threshold, exception, or ignored. Part of the title on threshold incidents |
| `link` | Shown on the incident, so you can open the incident or the exception in Tideways |
| `organization` | Part of how threshold incidents are identified. Shown on the incident |
| `application` | Part of how threshold incidents are identified, and the first half of a threshold title |
| `date` | Recorded on the event. Incident times in Spike are shown in your own time zone |
| `notification` | The per-type body, described below. Kept on the incident in full |

### A threshold incident opening

```json
{
  "type": "response_time",
  "link": "https://app.tideways.io/incidents/8f3c2a1d",
  "organization": "acme",
  "application": "checkout-api",
  "date": "2026-09-24T09:15:00Z",
  "notification": {
    "incident_id": "8f3c2a1d",
    "incidient_id": "8f3c2a1d",
    "status": "opened",
    "value": "1250",
    "criticalThreshold": "1000"
  }
}
```

Opens `checkout-api: response_time above threshold` and pages the escalation policy. `value` is what Tideways measured and `criticalThreshold` is the limit it crossed; both are shown on the incident.

{% hint style="info" %}
`incidient_id` is not a typo in these docs. Tideways sends the misspelling alongside the correct `incident_id`, with the same value in both, and documents it that way. Spike reads `incident_id` and keeps both keys in the payload untouched, so a script of yours that already reads the misspelled key keeps working.
{% endhint %}

### The same threshold incident closing

```json
{
  "type": "response_time",
  "link": "https://app.tideways.io/incidents/8f3c2a1d",
  "organization": "acme",
  "application": "checkout-api",
  "date": "2026-09-24T09:45:00Z",
  "notification": {
    "incident_id": "8f3c2a1d",
    "incidient_id": "8f3c2a1d",
    "status": "closed",
    "value": "420",
    "criticalThreshold": "1000"
  }
}
```

Same organization, application and `incident_id`, so this resolves the incident the `opened` notification created. An `ongoing` notification in between looks identical apart from `status` and `value`, and is added to the open incident.

### An exception

```json
{
  "type": "exception",
  "link": "https://app.tideways.io/exceptions/error-group-771",
  "organization": "acme",
  "application": "checkout-api",
  "date": "2026-09-24T09:15:00Z",
  "notification": {
    "error_group": {
      "id": "error-group-771",
      "class": "PDOException",
      "message": "SQLSTATE[HY000] [2002] Connection refused"
    },
    "status": "new"
  }
}
```

Opens `PDOException: SQLSTATE[HY000] [2002] Connection refused`. The resolving delivery repeats the same `error_group` and carries `resolved`, `not_error` or `ignored`:

```json
{
  "type": "exception",
  "link": "https://app.tideways.io/exceptions/error-group-771",
  "organization": "acme",
  "application": "checkout-api",
  "date": "2026-09-24T10:00:00Z",
  "notification": {
    "error_group": {
      "id": "error-group-771",
      "class": "PDOException",
      "message": "SQLSTATE[HY000] [2002] Connection refused"
    },
    "status": "resolved"
  }
}
```

### Every type and status in one table

| `type` | Identified by | Opens on | Appends on | Resolves on |
| --- | --- | --- | --- | --- |
| `response_time` | `organization` + `application` + `notification.incident_id` | `opened` | `ongoing` | `closed` |
| `error_rate` | `organization` + `application` + `notification.incident_id` | `opened` | `ongoing` | `closed` |
| `transaction-response-time` | `organization` + `application` + `notification.incident_id` | `opened` | `ongoing` | `closed` |
| `transaction-failure-rate` | `organization` + `application` + `notification.incident_id` | `opened` | `ongoing` | `closed` |
| `slow-sql` | `organization` + `application` + `notification.incident_id` | `opened` | `ongoing` | `closed` |
| `missing-data` | `organization` + `application` + `notification.incident_id` | Sent once, so it always opens | — | Never. Use a [resolve timer](../incidents/resolve-timer.md) |
| `exception` | `notification.error_group.id` | `new`, `open` | Repeats of `open` | `resolved`, `not_error`, `ignored` |
| `weekly_report` | — | Never | — | — |
| `release` | — | Never | — | — |
| `compare_release` | — | Never | — | — |

## Troubleshooting

<details>

<summary>No incidents show up in Spike</summary>

Work down the three places it can be switched off. The webhook integration has to exist at the **organization** level, it has to be **enabled on the project**, and the **notification type** has to be enabled for that project under **Project Settings → Configure Notifications**. An integration added to the organization and never enabled on a project sends nothing at all, which looks exactly like a broken URL.

Once all three are set, click **Preview** on the webhook integration. If the Preview arrives and real notifications do not, the wiring is fine and the notification types or their thresholds are the thing to look at.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Check the `type` first. `missing-data` has no close notification at all, by design in Tideways, so those incidents only ever end on a [resolve timer](../incidents/resolve-timer.md) or by hand.

For every other threshold type, Spike resolves on `closed`, and for exceptions on `resolved`, `not_error` and `ignored`. If the Tideways incident is closed on their side and the Spike incident is still open, confirm the project still has the webhook enabled — the close follows the same route as the open, so a webhook disabled between the two leaves the incident with nothing to resolve it.

</details>

<details>

<summary>Nothing happened for a weekly report or a release</summary>

That is deliberate. `weekly_report`, `release` and `compare_release` create no incident and no event. They are digests and deployment notices with no incident identity in them, so there is nothing to page about or attach to. Send them to email or Slack from Tideways.

</details>

<details>

<summary>One problem opened two incidents</summary>

Usually two Tideways notifications, each with its own identity. A slow deploy can trip `response_time` and `error_rate` at the same moment, and those are two Tideways incidents with two `incident_id` values, so they are two Spike incidents by design. The same applies to a threshold incident and an exception in the same application.

The other cause is an exception that was resolved in Tideways and came back. A new delivery for an error group with no open incident opens a fresh one, which is the behaviour you want for a bug that was closed too early. Use [grouping](../incidents/grouping-incidents.md) or an [alert rule](../alerts/alert-rules.md) if you would rather see them together.

</details>

<details>

<summary>A Preview delivery paged the on-call</summary>

Preview sends a real notification to a real integration, so it escalates like anything else. Point the Spike integration at a test service while you are wiring things up, or run Preview during working hours and tell whoever is on call.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Tideways notifications carry no severity field, so there is nothing for Spike to read. Set severity from [alert rules](../alerts/alert-rules.md), which also gets it onto the incident from the first page.

</details>
