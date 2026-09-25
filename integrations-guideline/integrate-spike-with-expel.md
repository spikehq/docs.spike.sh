---
description: >-
  Send Expel Workbench incidents and investigations to Spike over a webhook, so a new detection pages your security on-call and closing it in Workbench resolves the incident.
---

# Integrate Spike with Expel

[Expel](https://expel.com) is a managed detection and response service. Its analysts watch your alerts around the clock, open an **investigation** when something looks wrong, and raise it to an **incident** when it turns out to be real. Workbench can post every one of those moments to a webhook, so pointing it at a Spike integration wakes your security on-call the moment Expel decides something needs a human.

Nothing is installed anywhere. You add a webhook destination in Workbench, point notifications at it, and Expel posts to Spike from there.

{% hint style="success" %}
Unlike Expel's PagerDuty integration, this one auto-resolves. Expel's own PagerDuty documentation says that after a security incident is resolved in Workbench you have to resolve it in PagerDuty by hand. The webhook path sends the closure events, so when the analyst closes the investigation, the incident in Spike resolves itself and the escalation stops. The webhook path also takes as many destinations as you like, where PagerDuty notifications can only reach a single service.
{% endhint %}

## What Spike does with each event

Every delivery carries an `event_name`, and that is what Spike acts on — not the name of the notification that fired, so you can rename or split notifications in Workbench without changing anything in Spike.

Workbench's picker lists nearly fifty notification rules, which come down to 33 distinct `event_name` values across nine data models. Every one of them has a decided behaviour in Spike. Nothing falls through to "opens an incident" because it is unrecognised, so turning on another notification to get more detail on the incident page can never start paging your team for it.

### Events that open an incident and page

| `event_name` | Notification in Workbench | Why it pages |
| --- | --- | --- |
| `incident_created` | Incident is created | Expel has confirmed something real |
| `investigation_created` | Investigation is created | Expel has started looking into something |
| `incident_reopened` | Incident is reopened | Closed work is live again, and the previous incident in Spike is already resolved |
| `remediation_action_assigned` | Remediation action is assigned to me / to my org | Expel has handed a containment step to your team and is waiting on you |
| `remediation_action_automation_failed` | Remediation action automation failed | A containment step that was meant to run itself did not, so it is on your team now |

### Events that resolve the incident

| `event_name` | Notification in Workbench |
| --- | --- |
| `incident_closed` | Incident is closed |
| `investigation_closed` | Investigation is closed |

A closure that arrives with nothing open is dropped, which is what happens when the incident was already resolved by hand.

### Events that are added to the open incident

These appear on the incident's timeline, never page anyone and never resolve anything. When no incident is open for that investigation they are dropped.

| `event_name` | Notification in Workbench |
| --- | --- |
| `incident_assigned` | Incident is assigned to my org |
| `investigation_assigned` | Investigation is assigned to my org |
| `incident_downgraded` | Incident is downgraded |
| `investigation_alert_added` | Investigation has an alert added |
| `investigation_manual_remediations_completed` | Investigation manual remediations completed |
| `investigative_action_assigned` | Investigative action is assigned / to me / to my org |
| `investigative_action_analysis_assigned` | Investigative action analysis is assigned / to me / to my org |
| `investigative_action_manual_action` | Investigative action has manual action |
| `notify_action_assigned` | Notify action is assigned to my org |
| `verify_action_assigned` | Verify action is assigned to me / to my org |
| `verify_action_approved`, `verify_action_denied` | Verify action has outcome |
| `verify_action_acknowledged`, `verify_action_unacknowledged` | Verify action is acknowledged |
| `remediation_action_automated` | Remediation action is automated |

{% hint style="info" %}
A downgrade — Expel deciding an incident is really an investigation after all — appends rather than resolves. The work is still open, so the page should still stand. The same goes for an assignment: it records who owns it now and leaves the escalation running.
{% endhint %}

### Events Spike ignores

| `event_name` | Notification in Workbench | Why |
| --- | --- | --- |
| `expel_alert_created`, `expel_alert_assigned`, `expel_alert_closed`, `expel_alert_reopened` | Expel alert is created / assigned to my org / closed / reopened | Raw alerts are what Expel's analysts triage for you. Paging on them is the noise an MDR service exists to absorb — you want the investigation, which is what Expel opens once an alert means something |
| `security_device_healthy`, `security_device_unhealthy`, `security_device_first_healthy` | Security device has a health status change / is first healthy | Onboarding and plumbing health, not a security event on your estate |
| `assembler_connected`, `assembler_disconnected` | Assembler has a health status change | As above |
| `announcement_created` | Announcement is created | An Expel announcement is reading material |
| `custom_rule_created` | Custom rule is created | A configuration change in Workbench |

Send these to email or Slack in Workbench rather than to the pager. If you do point them at the Spike webhook, Spike answers `200` and drops them.

{% hint style="warning" %}
Workbench also has a few organization notifications — emerging threats, support tickets and the phishing notifications — whose `event_name` Expel does not publish. They are ignored like everything else Spike does not recognise, so they cannot page your team. If you need one of them to open an incident, tell us the `event_name` it arrives with and we will classify it.
{% endhint %}

### Incident identity

Spike identifies an Expel incident by `data.investigation_id`. Expel incidents *are* investigations under the hood — promoting one does not give it a new id — so that one field ties the whole story together: the investigation opens, gets assigned, becomes an incident, collects a remediation action, and is closed, all on one incident in Spike, paging your team once.

An investigation that becomes an incident therefore does not open a second incident in Spike. Read more about [grouping incidents](../incidents/grouping-incidents.md).

### Incident title

The title is the investigation's own title, so it reads as a sentence when Spike dials the on-call and speaks it:

```
Suspicious PowerShell execution on WEB-PROD-03
```

Expel's `data` object is not one shape. Each of the nine models wraps the object it describes in `current` and `previous`, so an investigation event carries its title at `data.current.title` while a remediation action event carries something else entirely. Spike takes the title from wherever that event type keeps it, and when an event carries none, the title falls back to the event itself:

```
Expel remediation_action_assigned
```

A title like that means the event type had no title to give rather than that something went wrong. The link back to Workbench and the rest of the payload are on the incident page either way, so the responder is one click from the investigation. Use a [Title Remapper](../alerts/title-remapper.md) to build it differently, for example to put the event type in front:

```handlebars
{{data.body.event_name}} — {{data.body.data.current.title}}
```

### Severity

The webhook envelope has no severity field, so set severity with [alert rules](../alerts/alert-rules.md). The same rules route an incident to another escalation policy or suppress it entirely, which is how you keep remediation actions off the phone at 3am while incidents still page.

{% hint style="info" %}
Expel's own rating, `analyst_severity`, is inside the investigation at `data.current.analyst_severity` with values `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` and `INFO`. Spike does not map it onto the incident's severity today, because it is Expel's analyst rating of the investigation rather than a statement about your service. An alert rule can match on it and set the severity you want. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* A Workbench user who can reach **Organization Settings**, which an organization administrator has
* An Expel integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Expel**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook destination in Workbench

{% tabs %}
{% tab title="Setup on Expel Workbench" %}
1. **Open your organization's settings:**
   In the Workbench side menu, go to [**Settings → Organization Settings**](https://workbench.expel.io/settings/organizations). If you have more than one organization, pick the one this Spike service covers.

2. **Open the Integrations tab:**
   On the My Organization page, select the **Integrations** tab and scroll to the **Webhooks** section.

3. **Add the destination:**
   Select **Add a webhook destination** and fill in:

   * **Webhook destination name** — `Spike`, or the name of the service you attached the integration to
   * **Webhook destination URL** — the webhook URL from Step 1, starting with `https://`
   * **Webhook auth type** — **Basic Auth**, **HMAC Header** or **Bearer Token**. Spike does not check any of them, so pick whichever your team is comfortable with and put a throwaway value in it. See [The webhook signature](#the-webhook-signature) below

4. **Save and test:**
   Select **Add**, then **Test connection**. Workbench shows "Successfully sent" with a timestamp when the request reached Spike.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Expel does not let you edit a webhook's authentication after it is created, and it will not show you the HMAC secret again. Changing it means deleting the destination and adding it back, which also means re-pointing every notification at the new one.
{% endhint %}

{% hint style="warning" %}
Keep the webhook URL out of shared documents and tickets. The token in it is what identifies your integration, so anyone holding it can open incidents on your account. If it leaks, archive the integration in Spike and create a new one.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 3 — Point notifications at it

Still in **Organization Settings**, open the **Notifications** tab and select **Add Notification** for each rule you want. Set **Conditions** to the event, and **Notify via** to the `Spike` destination from Step 2. Save to activate it.

This is the set worth starting with:

| Notification | What it gives you |
| --- | --- |
| Incident is created | The page you actually want. Expel has confirmed something real |
| Investigation is created | Pages while Expel is still investigating. Leave it off if you only want confirmed incidents |
| Incident is reopened | Work that was closed and is live again |
| **Incident is closed** | **Resolves the incident in Spike** |
| **Investigation is closed** | **Resolves the incident in Spike** |
| Remediation action is assigned to my org | A containment step waiting on your team |
| Incident is assigned to my org, Investigation is assigned to my org, Incident is downgraded | Optional. They add context to the open incident without paging |

{% hint style="danger" %}
The two closed notifications are the ones people forget. Turn on **Incident is created** without **Incident is closed** and every Expel incident stays open in Spike until somebody resolves it by hand — exactly the behaviour teams are used to from Expel's PagerDuty integration, and exactly what this one is here to fix.
{% endhint %}

{% hint style="info" %}
Turn on the closed notifications even where the matching created notification is off. A closure Spike has no open incident for is dropped, which is harmless. The reverse — an opening notification with no closure — is what leaves incidents open forever.

If different work should reach different teams, create a second Spike integration on the other service, add a second webhook destination in Workbench, and split the notifications between them. Unlike the PagerDuty destination, webhooks are not limited to one.
{% endhint %}

## Step 4 — Confirm it end to end

**Test connection** on the destination proves the URL is reachable, not that your notifications are wired up. The round trip worth confirming before you trust this overnight is a real one: the next investigation Expel opens should appear in Spike within a few seconds and start escalating through your policy, and closing it in Workbench should resolve it in Spike on its own. Your Expel engagement manager can raise a test investigation if you would rather not wait.

## Things worth knowing

* **Expel retries, and Spike answers before it escalates.** Expel treats `200` as delivered. Any other `4xx` or `5xx` is retried on a polynomial backoff at 1, 8, 27, 64 and 125 minutes. Spike answers `200` as soon as it has accepted the payload and escalates afterwards, so a long escalation policy — several rounds of phone calls to several people — never holds the response open and never causes a retry. The retries only matter if Spike or the network is genuinely unreachable.
* **Spike never answers `406`.** A `406` is how a destination tells Expel to stop retrying, and Spike has no reason to send one: an event it does not act on is accepted and dropped rather than rejected. If Workbench shows `406` against the destination, something between you and Spike is answering, not Spike.
* **Resolving in Spike does not close anything in Expel.** The two are not linked in that direction. Close the investigation in Workbench and let the closure resolve the incident, rather than the other way around, so the two sides stay in step.
* **The payload can be large.** Expel sends UTF-8 JSON up to 10 MB, since `current` and `previous` carry whole objects. All of it lands on the incident page for alert rules and the Title Remapper to read.

### The webhook signature

With **HMAC Header** auth, Expel signs the body and sends the digest in an `Expel-Signature-256: sha256=<hex>` header. With **Basic Auth** or **Bearer Token** it sends an `Authorization` header instead. Spike verifies none of the three today — the token in the webhook URL is the shared secret, which is the model every other Spike integration uses. Expel asks the field to be filled in, so put a throwaway value there and treat the URL as the credential.

## Payload reference

You do not need to configure any of this. It is here so you know what lands on the incident page, and so you can write [alert rules](../alerts/alert-rules.md) and remappers against it.

Every event arrives in the same envelope: the notification that fired, the event name, the event's guid, and a `data` object holding the model the event happened to.

```json
{
    "rule": "Incident is created",
    "event_name": "incident_created",
    "data": {
        "investigation_id": "8f3c2a1d-4b5e-4c6d-9e7f-1a2b3c4d5e6f",
        "change_action": "created",
        "current": {
            "title": "Suspicious PowerShell execution on WEB-PROD-03",
            "short_link": "https://workbench.expel.io/i/8f3c2a1d",
            "is_incident": true,
            "analyst_severity": "HIGH",
            "attack_vector": "MALWARE",
            "threat_type": "TARGETED",
            "open_summary": "Encoded PowerShell launched by winword.exe on WEB-PROD-03.",
            "created_at": "2026-09-21T06:42:17.123Z"
        },
        "previous": {},
        "organization": { "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "name": "Acme" },
        "lead_expel_alert": { "id": "9c1d4b2f-7a3e-4c8d-9b1a-2e3f4a5b6c7d" }
    },
    "guid": "ab12c34d-e567-8fg9-1012-h345i67jk8lm"
}
```

The closure repeats the same `investigation_id`, which is how Spike knows which incident to resolve:

```json
{
    "rule": "Incident is closed",
    "event_name": "incident_closed",
    "data": {
        "investigation_id": "8f3c2a1d-4b5e-4c6d-9e7f-1a2b3c4d5e6f",
        "change_action": "updated",
        "current": {
            "title": "Suspicious PowerShell execution on WEB-PROD-03",
            "short_link": "https://workbench.expel.io/i/8f3c2a1d",
            "decision": "TRUE_POSITIVE",
            "close_comment": "Contained. Host reimaged and credentials rotated.",
            "status_updated_at": "2026-09-21T09:12:44.901Z"
        },
        "previous": { "decision": null }
    },
    "guid": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
}
```

{% hint style="info" %}
`rule`, `event_name`, `data` and `guid` are on every delivery. What is inside `data` depends on the model: an investigation event carries `investigation_id`, an alert event `expel_alert_id`, a remediation action event `remediation_action_id`, and so on, each with `change_action`, `current`, `previous` and the relationships that model has. The samples above are trimmed — a real delivery carries the whole object, and Spike keeps all of it on the incident where it is available as `data.body.<field>`.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Run **Test connection** on the webhook destination first. If that fails, the URL is wrong or unreachable: it should be the full `https://hooks.spike.sh/<your-token>/push-events` with nothing appended, and the integration should not be archived in Spike.

If the test succeeds but real events never arrive, the notifications are the problem rather than the destination. Check on the **Notifications** tab that each rule's **Notify via** actually names the `Spike` destination, since a notification created before the destination existed points somewhere else.

</details>

<details>

<summary>Incidents open but never resolve</summary>

The closed notifications are almost always the reason. On the **Notifications** tab, confirm that **Incident is closed** and **Investigation is closed** both notify via the Spike destination. They are separate rules from the created ones, and adding only half the pair is easy to do.

If both are on and incidents still stay open, check that the closure carried the same `investigation_id` as the event that opened the incident. A closure for an investigation Spike never heard of has nothing to resolve.

</details>

<details>

<summary>An assignment or a downgrade resolved the incident</summary>

It should not, and does not. Assignment, downgrade and action events append to the open incident and leave it open on purpose, because the work is still live. If an incident resolved around the time one arrived, look on the incident for the `incident_closed` or `investigation_closed` event that actually resolved it, or for a [resolve timer](../incidents/resolve-timer.md) on the integration.

</details>

<details>

<summary>A title reads "Expel incident_created" instead of the investigation title</summary>

That is the fallback for an event whose `data` carried no title. Some of Expel's models genuinely do not have one. The investigation id and the rest of the payload are still on the incident, and a [Title Remapper](../alerts/title-remapper.md) can build the title from whichever field that event type does carry.

</details>

<details>

<summary>Expel alerts are not opening incidents</summary>

By design. `expel_alert_created` and the other alert events are ignored, because raw alerts are what Expel's analysts triage for you — Expel opens an investigation once an alert turns out to mean something, and that is what pages your team. If you want to page on unreviewed alerts, that is a change to Spike rather than a setting, so get in touch.

</details>

<details>

<summary>One investigation opened several incidents in Spike</summary>

Grouping is on `data.investigation_id`, so two incidents mean two investigations. Expel opens one per detection, and several detections on the same host are still separate pieces of work to it.

A reopen after the first incident was resolved does open a fresh incident, which is the intent: the previous page is closed and the new work needs its own.

</details>

<details>

<summary>Severity is never set</summary>

Expected. Spike does not read Expel's `analyst_severity` onto the incident's severity. Set it with [alert rules](../alerts/alert-rules.md), which can match on that field, on the event name, or on anything else in the payload.

</details>

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Expel, Inc.
