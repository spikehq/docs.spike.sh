---
description: >-
  Send elmah.io errors, uptime checks and heartbeats to Spike so a new fatal error or a site going down pages your on-call team by phone, SMS, Slack or Teams, and the uptime recovery closes the incident.
---

# Integrate Spike with elmah.io

[elmah.io](https://elmah.io) is error logging, uptime monitoring and heartbeats for .NET. Everything it records lands in the same log, and its rule engine can fire an **HTTP Request** action on the messages you care about. Point that action at a Spike integration URL and a new fatal error, a failed uptime check or a missed heartbeat opens an incident that escalates through your on-call policy, while the uptime recovery message closes it again.

Nothing is installed anywhere. You add rules on the log settings page in elmah.io, each one posting a small JSON body to Spike, and the two stay in sync from there.

Unlike most integrations, **you write the body**. elmah.io asks for the JSON it should post and gives you `$variables` to fill it with, so the fields Spike gets are the fields you put in the rule.

## What Spike does with each rule

| Rule fires on | What happens in Spike |
| --- | --- |
| A new fatal error (`isNew:true AND severity:Fatal`) | Opens a SEV1 incident for that error and pages the escalation policy |
| A repeat of an error already open | Added to the open incident as a repeat. It never pages again |
| An uptime check failing (`severity` of `Error`) | Opens an incident for that check and pages the escalation policy |
| The same uptime check recovering (`severity` of `Information`) | Auto-resolves the open incident for that check. Dropped when nothing is open |
| A heartbeat going unhealthy or degraded | Opens an incident for that heartbeat and pages the escalation policy |

elmah.io only logs uptime and heartbeat messages on a **state change**, so a site that stays down for an hour produces one message, not twelve, and the second unhealthy heartbeat in a row produces nothing at all. The recovery is a state change too, which is what makes the uptime incident close itself.

## How incidents are grouped and titled

Spike groups on what the message is about, so every repeat of one problem lands on the incident already open rather than paging again.

| Rule | Grouped on | Title |
| --- | --- | --- |
| Errors | `title` + `type` + `application` | `Object reference not set to an instance of an object (System.NullReferenceException) on checkout-api` |
| Uptime and heartbeats | `url`, or `title` when the message carries no url | `https://api.example.com is down` |

Errors are grouped on the three fields because elmah.io rules carry no error-group id. The same exception thrown in two applications is two incidents, which is what you want when two teams own them, and `isNew:true` already limits the rule to the first occurrence of each error.

Fields missing from the body are left out of the title, so a body without `application` still produces a readable incident. The rest of what you send, including the detail and the url back to elmah.io, is shown on the incident page.

{% hint style="warning" %}
Do not name a key `message` in the body. Spike treats a top-level `message` as a ready-made incident message and skips parsing, so the grouping, the severity and the auto-resolve described here would all stop working. Use `title` as in the samples below.
{% endhint %}

## Severity

Spike reads the `severity` you send and maps elmah.io's six levels onto its three:

| `$severity` in elmah.io | Severity in Spike |
| --- | --- |
| `Fatal` | SEV1 |
| `Error` | SEV2 |
| `Warning` | SEV3 |
| `Information`, `Debug`, `Verbose` | Not an incident. `Information` resolves an open uptime incident, see below |

Read more about [priority and severity](../incidents/priority-and-severity.md). [Alert rules](../alerts/alert-rules.md) override the severity per incident, and can route an incident to another escalation policy or suppress it entirely.

## Prerequisites

* An elmah.io account with permission to edit rules on a log
* An elmah.io integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → elmah.io**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the rule for errors

In elmah.io, open the log you want to be paged for, then go to **Log settings → Rules → Add a new rule**.

1. **Title:** something you will recognise later, `Page Spike on new fatal errors`.
2. **If:** the query that decides which messages the rule fires on. Start with:

   ```
   isNew:true AND severity:Fatal
   ```

   `isNew:true` limits the rule to the first time each error is seen, and `severity:Fatal` to the errors worth waking somebody for. The query is the same Lucene syntax as the search bar, so you can try it there first and see exactly which messages the rule would have caught.
3. **Then:** choose **HTTP Request** as the action.
4. **URL:** paste the Spike webhook URL from Step 1. Leave the authentication options empty, the token in the URL is what identifies your integration.
5. **Body:** the JSON Spike reads. The variables come from the list the rule editor shows under the body field:

   ```json
   {
     "source": "elmah.io",
     "id": "$id",
     "title": "$title",
     "severity": "$severity",
     "type": "$type",
     "application": "$application",
     "hostname": "$hostname",
     "url": "$url"
   }
   ```
6. Save the rule.

elmah.io substitutes each `$variable` with the value from the message and posts the result to Spike. The incident shows up within a few seconds of the next matching error.

{% hint style="info" %}
The rule editor lists the variables your account supports next to the body field, and that list is the authority. Anything you add beyond the fields above is shown on the incident but is not used for grouping, so `"detail": "$detail"` is a useful addition when you want the stack trace in Spike and a costly one when your stack traces are long.
{% endhint %}

### Which errors to page on

`severity:Fatal` is the conservative start. Widen it once you trust the rule:

| Query | Fires on |
| --- | --- |
| `isNew:true AND severity:Fatal` | The first occurrence of each fatal error. A good default |
| `isNew:true AND (severity:Fatal OR severity:Error)` | The first occurrence of every error. Noisy on a busy application |
| `isNew:true AND severity:Fatal AND application:checkout-api` | Fatal errors from one application, when a second Spike integration pages a different team |
| `severity:Fatal` | Every fatal error, including repeats. Repeats land on the open incident, so this mostly costs you requests |

{% hint style="warning" %}
Leaving `isNew:true` out of a rule on a busy log is the fastest way to make on-call hate an integration. Spike groups the repeats onto the one incident, but elmah.io still posts once per message.
{% endhint %}

## Step 3 — Add the rule for uptime checks

Uptime messages land in the same log as your errors, so they are a second rule rather than a second integration.

1. **Title:** `Page Spike on uptime`.
2. **If:** pick the built-in **Uptime message** filter in the rule editor so the rule matches uptime messages only, whichever check they came from and whichever way the check moved. Do not add a severity to the query: the rule has to see both the failure and the recovery.
3. **Then:** **HTTP Request**, with the same Spike URL from Step 1.
4. **Body:** the same body as Step 2. `severity` and `url` are the two fields that matter here:

   ```json
   {
     "source": "elmah.io",
     "id": "$id",
     "title": "$title",
     "severity": "$severity",
     "type": "$type",
     "application": "$application",
     "hostname": "$hostname",
     "url": "$url"
   }
   ```
5. Save the rule.

One rule covers both directions. elmah.io logs the failure at `Error` and the recovery at `Information`, and Spike tells them apart by that field alone: the `Error` message opens the incident for that url, the `Information` message resolves it. A recovery that arrives with no incident open, because somebody resolved it by hand first, is dropped rather than opening anything.

{% hint style="info" %}
Spike matches the recovery to the failure on the url, so both messages must carry `"url": "$url"`. A body that leaves `url` out still opens incidents, grouped on the message title instead, but a recovery only closes the incident when the two messages agree on what identifies the check.
{% endhint %}

## Step 4 — Add the rule for heartbeats

Heartbeats are for the jobs nothing pings: schedulers, workers, nightly batches. elmah.io logs a message when a heartbeat stops arriving or reports itself unhealthy, and that message goes through the same rules.

Add a third rule with the heartbeat filter from the rule editor, the same HTTP Request action and the same body. What arrives in Spike follows the severity of the state change:

| Heartbeat state change | Severity | In Spike |
| --- | --- | --- |
| First unhealthy or missed heartbeat | `Error` | Opens a SEV2 incident and pages |
| Degraded | `Warning` | Opens a SEV3 incident and pages |
| Still unhealthy | No message is logged | Nothing |
| Healthy again | `Information` | Recorded, but it does not resolve the incident |

Heartbeat recoveries do not close incidents today, so give the integration the resolve timer in Step 5 and resolve heartbeat incidents in Spike when the job is back.

## Step 5 — Set a resolve timer

Errors have no recovery message at all, and neither do heartbeats, so nothing in the payload can close those incidents. Give the integration a [resolve timer](../incidents/resolve-timer.md) so they do not sit open forever:

1. Edit the elmah.io integration in Spike.
2. Scroll to **Advanced Configuration** and turn on **Resolve by Timer**.
3. Set a duration longer than the time you would take to look at a fatal error, a few hours rather than a few minutes, so a problem somebody is still working on is not resolved out from under them.

The timer is a backstop for a one-off error at 2am, not a substitute for closing incidents. Uptime incidents are unaffected while they are open: the recovery message from Step 3 closes them first, whichever way the timer is set.

## Body reference

The variables below are the ones the samples use. The rule editor shows the full list your account supports, including `$severityHex` and the detail of the message, and that list is what to copy from when you extend the body.

| Field in the body | Variable | What Spike does with it |
| --- | --- | --- |
| `source` | — | A fixed `"elmah.io"`, so a body replayed by hand is recognisable in the incident |
| `id` | `$id` | The elmah.io message id. Shown on the incident, never used for grouping, because a new id arrives with every message |
| `title` | `$title` | The incident title, and part of what errors are grouped on |
| `severity` | `$severity` | Sets incident severity, and tells an uptime failure from an uptime recovery |
| `type` | `$type` | The exception type. Part of what errors are grouped on |
| `application` | `$application` | The application name. Part of what errors are grouped on |
| `hostname` | `$hostname` | Shown on the incident, so you can tell which server it came from |
| `url` | `$url` | Groups uptime and heartbeat incidents, and matches a recovery to the failure it closes |

A fatal error arrives at Spike looking like this:

```json
{
  "source": "elmah.io",
  "id": "8e0b5a3e5b4d4b0f9e0c2f5a1b7c9d31",
  "title": "Object reference not set to an instance of an object",
  "severity": "Fatal",
  "type": "System.NullReferenceException",
  "application": "checkout-api",
  "hostname": "web-01",
  "url": "https://checkout.example.com/orders/8821"
}
```

An uptime failure and its recovery differ only in `severity`:

```json
{
  "source": "elmah.io",
  "id": "f21c8d77a9a6423b8a1a0a5d2c33ee90",
  "title": "https://api.example.com is down",
  "severity": "Error",
  "type": "Uptime",
  "application": "api.example.com",
  "hostname": "",
  "url": "https://api.example.com"
}
```

```json
{
  "source": "elmah.io",
  "id": "1b7fd3f0c0f34a3aa0a2a7be55e0f911",
  "title": "https://api.example.com is up",
  "severity": "Information",
  "type": "Uptime",
  "application": "api.example.com",
  "hostname": "",
  "url": "https://api.example.com"
}
```

You can replay either one with `curl` while you are setting the integration up:

```bash
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"source":"elmah.io","title":"Object reference not set to an instance of an object","severity":"Fatal","type":"System.NullReferenceException","application":"checkout-api"}' \
  "https://hooks.spike.sh/<your-token>/push-events"
```

### Title Remapper sample

A [Title Remapper](../alerts/title-remapper.md) on the elmah.io integration replaces the default title with one you write against the body, which is how you fold in an environment or a team name:

```handlebars
Production {{data.application}}: {{data.title}}
```

Output: `Production checkout-api: Object reference not set to an instance of an object`

Write the remapper against `title`, `type` and `application` only. `id` is new on every message, and a title built on it opens a fresh incident for every occurrence instead of grouping them.

## Things worth knowing

* **You own the body.** Everything here depends on the JSON in the rule. Copy it from this page rather than writing it from memory, and keep the same body in every rule pointing at the same Spike integration, so errors, uptime and heartbeats group the way they are described above.
* **The rule editor's variable list is the authority.** Variable names differ between elmah.io accounts and change over time. If a field arrives at Spike as the literal `$application`, the variable does not exist on your account and the list under the body field has the right name.
* **One log can feed several integrations.** Rules are per log, and each rule has its own URL, so a log can page one team for `checkout-api` fatals and another for uptime by pointing two rules at two Spike integrations.
* **Only fatal errors should page by default.** elmah.io logs warnings and information messages from your application too. A rule without a severity in its query sends all of them, and a `Warning` opens a SEV3 incident that still rings a phone.
* **The Mail action is not this integration.** elmah.io can mail an alert, and Spike's [email integration](integrate-spike-with-email.md) turns mail into incidents, but an email carries no severity and nothing to resolve on. Use the HTTP Request action for anything that should page.
* **The URL is the credential.** elmah.io sends no signature, so treat the webhook URL as a secret. If it leaks, archive the integration in Spike, create a new one and update the URL in every rule pointing at it.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the query first. Paste it into the search bar on the log in elmah.io and confirm it matches messages that have arrived recently. `isNew:true` is the usual surprise: an error that has been in the log for weeks is not new, so the rule never fires for it, and the rule only starts producing incidents when a genuinely new error shows up.

Then confirm the action's URL is the full `https://hooks.spike.sh/<your-token>/push-events`, with no trailing characters, and that the rule is enabled. Rules apply to messages logged after the rule was saved, never retroactively.

</details>

<details>

<summary>Incidents arrive with `$title` or `$application` as their text</summary>

That variable does not exist on your account, so elmah.io posted it unchanged. Open the rule and copy the name from the variable list under the body field.

</details>

<details>

<summary>The incident is empty, or has no severity</summary>

Almost always a body problem. Check that the JSON is valid, that the keys are spelled as on this page, and in particular that nothing in the body is called `message`: Spike takes a top-level `message` as the finished incident text and skips everything else.

</details>

<details>

<summary>Uptime incidents never resolve</summary>

The recovery message has to reach the same Spike integration as the failure, through a rule whose query matches it. A query with `severity:Error` in it matches the failure only, so nothing ever arrives to close the incident. Use the uptime filter on its own, as in Step 3.

If the recovery does arrive, check that both messages carry `"url": "$url"`. Spike matches a recovery to the incident by that field, and a failure that was grouped on its title cannot be closed by a recovery whose title reads `is up` instead of `is down`.

</details>

<details>

<summary>Every error opens a new incident</summary>

Either the previous incident was already resolved, by hand or by the resolve timer, or the messages disagree on their grouping fields. Spike groups errors on `title`, `type` and `application` together, so an application name that carries a version or a hostname makes every deployment a new incident. Send a stable application name and put the version somewhere else in the body.

Repeats of an error land on the open incident and are [grouped](../incidents/grouping-incidents.md) rather than paging again.

</details>

<details>

<summary>On-call is being paged too often</summary>

Narrow the query rather than the integration. `isNew:true` on its own already removes the repeats; adding `application:` or a severity removes the rest. Where the rule is right but the pages are not, an [alert rule](../alerts/alert-rules.md) in Spike can suppress, reroute or downgrade the incidents that matched it.

</details>
