---
description: >-
  Send elmah.io errors, uptime checks and heartbeats to Spike so a new exception or a failing endpoint pages your on-call rotation by phone, SMS, Slack or Teams, and closes its incident when elmah.io logs that it is working again.
---

# Integrate Spike with elmah.io

[elmah.io](https://elmah.io) is error logging, uptime monitoring and heartbeats for .NET. Your application ships its exceptions there through one of elmah.io's logger packages, and the same account watches your endpoints and your scheduled jobs. All three end up in one place — elmah.io's log — and a **rule** on that log is what forwards them anywhere else.

Point a rule's **Send a HTTP request** action at a Spike integration URL and those messages become incidents: a new exception or a down endpoint pages your escalation policy, repeats land on the incident already open, and the `Information` message elmah.io logs when a check recovers resolves the incident by itself.

{% hint style="info" %}
**elmah.io has no "Spike" destination to pick, and no webhook payload of its own.** What it has is a rule engine whose actions include a plain HTTP POST, and the JSON body of that POST is one **you type** into the rule editor from elmah.io's message variables. So this guide gives you the body to paste. Spike reads it by field name, which is why the field names below are not negotiable — but everything in it is yours, and anything you add to it shows up on the incident page.
{% endhint %}

## What Spike does with each message

Two fields in the body do all the work. `event_type` is a value **you** hardcode, one per rule, and it says which shape of message arrived:

| `event_type` | The rule that sends it | What Spike does with the body |
| --- | --- | --- |
| `Uptime` | elmah.io's built-in **Uptime message** filter | Identifies the incident by `url`, the monitored endpoint. The failure, every repeat of it and the recovery all carry the same one |
| `Heartbeat` | A rule matching your heartbeat messages | Treated exactly like `Uptime` — `url` is the identity, so `is unhealthy` and `is degraded` are one incident |
| `Error` | A rule matching your application's errors | Matched by **title** instead. On an error message `url` is the request URL, which is different on every occurrence of one exception, so Spike ignores it |

`severity` is elmah.io's own level, and it is what says whether a message is the problem starting or the problem ending:

| `severity` | What Spike does |
| --- | --- |
| `Fatal` | Opens an incident and pages your escalation policy |
| `Error` | Opens an incident and pages your escalation policy |
| `Warning` | Opens an incident. A heartbeat's `degraded` is an open problem, not a recovery |
| `Information` | **Auto-resolves** the open incident, and never opens one. Dropped when nothing is open |
| `Verbose` | Dropped. Opens nothing and resolves nothing |
| `Debug` | Dropped. Opens nothing and resolves nothing |

One uptime rule therefore covers **both directions**. elmah.io's `Uptime message` filter matches the failure and the recovery alike, and `severity` is the only field that differs between them — `Error` on the way down, `Information` on the way back up. There is nothing to switch on for auto-resolution and no second rule to write.

{% hint style="success" %}
Anything Spike does not recognise in `severity` — a word that is not one of the six, an empty value, or a missing key — **opens an incident**. Missing a page because an unexpected level arrived is the worse of the two failures.
{% endhint %}

### Incident identity

Identity is the endpoint for a check, and the exception itself for an error:

* **Uptime and heartbeat messages** are keyed on `url`. That value is the endpoint or job elmah.io is watching, identical on the failure, on every repeat and on the recovery, so a flapping check pages once and resolves itself. It also holds while elmah.io rewords the sentence — a heartbeat that goes `degraded` and then `unhealthy` is two sentences about one problem and lands on one incident.
* **Error messages** are matched on the incident title, which is why the title Spike builds for an error is byte-for-byte identical on every occurrence (see below). The second time an exception is thrown it joins the incident already open instead of paging again.

{% hint style="warning" %}
A rule body that sends no `url` — a key you dropped, or a variable your account does not support — still opens incidents, with the right title and the right severity. What it cannot do is auto-resolve reliably: with no endpoint to key on, Spike falls back to matching the recovery against the open incident's title, which works for elmah.io's `… is up` / `… is down` wording and for the heartbeat wording Spike knows, and resolves nothing when the sentence is worded some other way. Keep `url` in the body for uptime and heartbeat rules.
{% endhint %}

## Incident titles

The title is **elmah.io's own sentence about the fault**, which is what `title` holds: the exception's message for an error, and the check's sentence for an uptime or a heartbeat message.

Nothing is appended on an `Uptime` or a `Heartbeat` message, because elmah.io's sentence already names the endpoint:

```
https://api.example.com is down
Heartbeat 'nightly-import' is unhealthy
```

On an `Error` message the sentence is an exception message, and "Object reference not set to an instance of an object" could have come from any application you run. So the exception type and then the application are appended, the application **last** so that a long message can never cut off the answer to "where":

```
Object reference not set to an instance of an object (System.NullReferenceException) on checkout-api
```

Either part is left off when elmah.io's sentence already names it, so an exception message that starts with its own type does not say it twice.

### One sentence, and one that is not cut

The subject of the title is the **first sentence** of what the payload says, never more. .NET writes several sentences into one exception message often enough — `Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool. This may have occurred because …` — and the first sentence is the fault while the rest is the explanation. The explanation is on the incident page; a title carrying two of them reads as a pasted log excerpt on a phone call.

A sentence ends at a full stop **followed by a space**, so the dots inside `System.FormatException`, a version number, or a `Spike.Reporting.dll` never end a title early.

One sentence can still be too long for a lock screen, and then Spike prefers a sentence that fits over one it has to cut. It takes the first of these that fits:

| Order | Where the subject comes from |
| --- | --- |
| 1 | The first sentence of `title` — elmah.io's own words |
| 2 | The first sentence of **the first line of** `detail`, which is where the exception's one-line message lands. A leading `System.Whatever.Exception: ` is dropped, since the type is appended afterwards anyway |
| 3 | `{type} on {application}`, then `{type}`, then `{application}` — reached only when the body holds no sentence at all |
| 4 | The literal `elmah.io alert with no details`, so a blank body still reads as something |

Nothing past the first line of `detail` is ever read, which is what keeps the stack frames and their line numbers out of the title. If neither sentence fits, elmah.io's own is cut back to a word boundary, with the exception type dropped first and ` on {application}` kept whole.

{% hint style="info" %}
Titles carry no timestamps, no counters, no ids, no request URL and nothing past the first sentence. Every one of those moves between two occurrences of one exception, and an error incident is matched **by title** — a title that moves opens a second incident instead of joining the first. They are all on the incident page.

A recovery keeps elmah.io's own sentence, `https://api.example.com is up`, because that is what reads right in an event list. It does not have to match the failure's title: the incident is keyed on `url`.
{% endhint %}

Use a [Title Remapper](../alerts/title-remapper.md) if your team reads these differently — for example, application first:

```handlebars
{{data.body.application}} — {{data.body.title}}
```

## Severity

Spike reads the `severity` field in the body and sets the incident's severity badge from it:

| elmah.io `severity` | Severity in Spike |
| --- | --- |
| `Fatal` | SEV1 |
| `Error` | SEV2 |
| `Warning` | SEV2 |
| `Information` | Left unset — it resolves an incident rather than opening one |
| `Verbose`, `Debug` | Nothing to set — both are dropped before an incident exists |

{% hint style="info" %}
Severity is set when the incident is created and does not move afterwards, so a check that starts `Warning` and later goes `Error` keeps the badge it opened with. [Alert rules](../alerts/alert-rules.md) can override the severity, route the incident to another service or escalation policy, or suppress it entirely. Read more about [priority and severity](../incidents/priority-and-severity.md).
{% endhint %}

## Prerequisites

* An elmah.io account, and a user who can edit **Rules** on the log you want to forward
* An elmah.io integration in Spike and its webhook URL
* Nothing installed, and nothing changed in your application — rules run on elmah.io's side

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → elmah.io**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

The token in that URL is the credential, the same model every other Spike integration uses. elmah.io's HTTP request action needs no header, no signature and no authentication of its own. Treat the URL like a password, and if it leaks, archive the integration and create a new one.

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 2 — Add the rule in elmah.io

{% tabs %}
{% tab title="Setup on elmah.io" %}
1. **Open the log's rules:**
   In elmah.io, open the log you want to forward and go to **Rules**. Rules are per log, so repeat this on every log whose messages should page your on-call.

2. **Create a new rule:**
   Click **New rule** and give it a name your team will recognise, for example `Send uptime checks to Spike`.

3. **Choose which messages the rule matches:**
   For uptime checks, turn on elmah.io's built-in **Uptime message** filter — that one filter matches both the failure and the recovery, which is exactly what you want. For heartbeats, match your heartbeat messages. For application errors, write the query that matches the errors worth waking someone for, for example `severity:Error OR severity:Fatal`.

4. **Add the action:**
   Under the rule's actions, pick **Send a HTTP request**.

5. **Point it at Spike:**
   Paste the webhook URL from Step 1 into the **URL** field.

6. **Paste the body:**
   Put the JSON from the next section into the body field, choosing the one that matches what this rule forwards. Set `event_type` to the single value this rule is for.

7. **Copy the variable names from the list the rule editor shows:**
   The rule editor lists the message variables it supports beside the body field, and **that list is the authority** — not this page. If a value reaches Spike as the literal `$application`, that variable does not exist on your account; replace it with the one that does, or drop the key.

8. **Save the rule, and repeat it per shape:**
   One rule per `event_type`. `event_type` is hardcoded in the body, and nothing else in it tells Spike which shape arrived.
{% endtab %}
{% endtabs %}

## The rule bodies

### Uptime and heartbeat rules

Paste this into the body field of the rule with the **Uptime message** filter. Set `event_type` to `Heartbeat` instead on the heartbeat rule, and change nothing else:

```json
{
  "event_type": "Uptime",
  "title": "$title",
  "detail": "$detail",
  "severity": "$severity",
  "url": "$url"
}
```

### Error rules

The error rule's body adds the two fields that turn an exception message into something actionable:

```json
{
  "event_type": "Error",
  "title": "$title",
  "detail": "$detail",
  "severity": "$severity",
  "type": "$type",
  "application": "$application",
  "url": "$url"
}
```

Every field is required in the sense that Spike reads it by name, and leaving one out costs you something specific:

| Field | What Spike does with it | Leave it out and |
| --- | --- | --- |
| `event_type` | Says which shape this is: `Uptime`, `Heartbeat` or `Error`. Matched in any casing | Spike guesses from whether `type` is present. An uptime message would be read as an error if your body also carried `type` |
| `title` | elmah.io's sentence about the fault. **The incident title** | The title falls back to the first line of `detail`, then to the type and application |
| `detail` | The stack trace, or the check's output. Shown on the incident page, and the title's fallback | Nothing is lost on the title when `title` arrives |
| `severity` | Opens, resolves or drops the message, and sets the severity badge | Every message opens an incident and nothing ever auto-resolves |
| `type` | The .NET exception type, appended as `({type})`. Error rules only | The title is the bare exception message |
| `application` | Which application logged it, appended as `on {application}`. Error rules only | The title does not say where the exception came from |
| `url` | The identity of an uptime check or a heartbeat. Ignored on an error message | Uptime and heartbeat incidents are matched by title instead, and auto-resolve only for wording Spike recognises |

{% hint style="warning" %}
**Do not rename `title` to `message`.** Spike takes a top-level `message` as the incident title verbatim and skips the rest: no whitespace collapsing, no ` (type) on application` on an error, and **no auto-resolution** on a recovery. The body above has no `message` key on purpose.
{% endhint %}

Anything you add to the body beyond these fields is kept on the incident and is available to [alert rules](../alerts/alert-rules.md) and the [Title Remapper](../alerts/title-remapper.md) as `data.body.<field>`. elmah.io's `Message` carries plenty worth having there — `hostname`, `source`, `statusCode`, `method`, `user`, `correlationId`, `category`, `version` — so add the ones your responders read.

## Step 3 — Confirm it with a real message

elmah.io has no "send a test message" button on a rule: a rule fires on a message that reaches the log, so verification means producing one.

* **For an error rule**, log a message your query matches. The quickest way is to throw a test exception in a non-production application attached to the same log.
* **For an uptime rule**, point an elmah.io uptime check at an endpoint you control and make it fail — a URL you can return a 503 from, or simply stop the service — and then let it recover.

Watch for all three moments:

1. An incident opens in Spike with elmah.io's sentence as the title, on the service you attached, escalating through your policy.
2. The same exception thrown again, or the same check failing again, adds an event to that same incident without paging a second time.
3. The endpoint recovering logs an `Information` message and resolves the incident in Spike.

If the first step works and the third does not, `url` and `severity` are the two fields to check on the incident page.

## Payload reference

An uptime failure, which opens the incident:

```json
{
  "event_type": "Uptime",
  "title": "https://api.example.com is down",
  "detail": "Status code 503 returned from https://api.example.com. 2 of 5 locations failed.",
  "severity": "Error",
  "url": "https://api.example.com"
}
```

```
https://api.example.com is down
```

The recovery, from the same rule. Same `event_type`, same `url`, a sentence the other way round and `severity` changed to `Information` — which is the whole of what tells Spike to resolve:

```json
{
  "event_type": "Uptime",
  "title": "https://api.example.com is up",
  "detail": "",
  "severity": "Information",
  "url": "https://api.example.com"
}
```

```
https://api.example.com is up
```

An application error:

```json
{
  "event_type": "Error",
  "title": "Object reference not set to an instance of an object",
  "detail": "System.NullReferenceException: Object reference not set to an instance of an object.\n   at Checkout.Api.Carts.CartService.Total(Cart cart) in /src/Carts/CartService.cs:line 84\n   at Checkout.Api.Controllers.CartController.Confirm(Guid id) in /src/Controllers/CartController.cs:line 41",
  "severity": "Error",
  "type": "System.NullReferenceException",
  "application": "checkout-api",
  "url": "https://shop.example.com/checkout/confirm?id=5f2c"
}
```

```
Object reference not set to an instance of an object (System.NullReferenceException) on checkout-api
```

The same exception on the next request carries a different `url` and different line numbers in `detail`, and still renders that same title, so it joins the incident already open.

A heartbeat going unhealthy:

```json
{
  "event_type": "Heartbeat",
  "title": "Heartbeat 'nightly-import' is unhealthy",
  "detail": "No heartbeat received in the last 15 minutes. Expected one every 5 minutes.",
  "severity": "Error",
  "url": "https://jobs.example.com/nightly-import"
}
```

```
Heartbeat 'nightly-import' is unhealthy
```

## Things worth knowing

* **One rule per shape, not per check.** A single uptime rule covers every endpoint elmah.io watches on that log, and every direction. You do not add a rule when you add a check.
* **Rules are per log.** If your applications write to several elmah.io logs, each one needs its own rule. That is also the clean way to split by team: one Spike integration and one rule per log.
* **Scope the error rule's query.** A rule that matches every message on a busy log pages far more than your on-call wants. `severity:Error OR severity:Fatal` is a sensible starting point, and [alert rules](../alerts/alert-rules.md) in Spike can suppress the rest.
* **Resolving in Spike does not touch elmah.io.** The message stays in the log and the uptime check keeps its own state. Let the `Information` message resolve the incident to keep the two sides in step.
* **Verbose and Debug cost you nothing.** A rule that forwards them has its messages dropped at Spike rather than turned into incidents, so a rule query that is slightly too wide is not an incident storm.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the URL on the rule's action is the full `https://hooks.spike.sh/<your-token>/push-events`, with nothing appended, and that the integration has not been archived in Spike. Then check the rule itself could have fired: a rule only runs on a message its query matches, so search the log for a message that matches it. A rule saved against the wrong log never sees your messages at all. For an uptime rule, confirm the **Uptime message** filter is the one turned on — an uptime check failing produces an uptime message and nothing else.

</details>

<details>

<summary>Titles arrive with a `$` in them, or every message gets the same title</summary>

The variables in the body are not ones your account supports, so they are being posted as the literal text you typed. Spike reads a value like `$application` as missing rather than printing it into a title — otherwise every message on the integration would share one title and collapse onto one incident — so the symptom is a title with context missing, or the placeholder `elmah.io alert with no details`.

Open the rule, read the variable list beside the body field, and replace the tokens with the names from that list.

</details>

<details>

<summary>Every repeat of one exception opens its own incident</summary>

Error incidents are matched on the title, so something in the title is moving between occurrences. Open two of the incidents and compare their titles. If they differ, compare the bodies: `title`, `type` and `application` are what the error title is built from, and all three are fixed by the exception itself. A body that put the request URL, a timestamp or a counter into `title` is the usual cause.

If the titles are identical and the incidents still pile up, check that the first one was still open — a [resolve timer](../incidents/resolve-timer.md) or a manual resolve closes an incident, and the next occurrence then has nothing to join.

</details>

<details>

<summary>Incidents never auto-resolve</summary>

Three things have to be true, and the incident page shows all three.

First, the recovery has to arrive at all: it is a separate message in elmah.io, matched by the same rule, so a rule that only matches `severity:Error` never sends it. The **Uptime message** filter matches both directions; a severity query does not.

Second, `severity` on the recovery has to be `Information`. `Warning` is a degraded check, which Spike keeps open on purpose.

Third, for uptime and heartbeat messages, `url` has to be the same on the recovery as on the failure. If `url` is missing from the body, Spike falls back to matching the recovery's wording against the open incident's title, which only works for wording it recognises — `is up`, `is up again`, `is back up`, `is healthy`, `is healthy again`, `is online`, `is reachable`, `is available`, `is responding`. Adding `url` to the body is the fix.

</details>

<details>

<summary>A degraded heartbeat does not page, or pages when we did not want it to</summary>

`Warning` opens an incident at SEV2, because a heartbeat arriving late is a problem that has started rather than one that has ended. If your team does not want to be woken for `degraded`, write an [alert rule](../alerts/alert-rules.md) matching `severity` equal to `Warning` and either suppress the incident or route it to a service with a quieter escalation policy.

</details>

<details>

<summary>An error and an uptime check on the same endpoint became one incident</summary>

They should not have, and the field to look at is `event_type`. An error message whose body says `Uptime` is keyed on `url` like a check, and on an error that `url` is the request URL — so two unrelated exceptions on the same path collapse onto one incident. Each rule's body must carry the `event_type` for the shape that rule forwards.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of elmah.io.
