---
description: >-
  Send Metoro alerts to Spike through a webhook alert destination so a firing alert pages your on-call rotation by phone, SMS, Slack or Teams, and resolves its incident when Metoro says the alert recovered.
---

# Integrate Spike with Metoro

[Metoro](https://metoro.io) is eBPF-based observability for Kubernetes: metrics, logs and traces collected from the kernel with no code changes, and alerts on any of them. Metoro's **Webhook** destination posts an alert to any HTTP endpoint. Point it at a Spike integration URL and a firing alert pages your on-call rotation, every later notification about that same firing lands on the incident already open instead of paging again, and the incident resolves itself when Metoro sends the recovery.

Nothing is installed anywhere. One webhook, added once on Metoro's integrations page, can be the destination for every alert in the organisation.

{% hint style="warning" %}
**Metoro's webhook body is written by you, not by Metoro.** The webhook form has a **Body Template** field, and Metoro posts whatever JSON you put in it, substituting its own `$`-prefixed variables. There is no fixed field for Spike to read unless you give it one, so the [body template](#the-body-template) on this page is not optional — paste it exactly as written, field for field. Renaming `state` or dropping `alert_fire_uuid` is what turns one alert into a dozen incidents that never close.
{% endhint %}

## What Spike does with each notification

Every notification carries a `state` — Metoro's `$alert_state`, which the vendor documents as "either 'firing' or 'resolved'". That field alone decides what Spike does:

| `state` | What happens in Spike |
| --- | --- |
| `firing` | Opens an incident for that firing and pages your escalation policy, or adds an event to the one already open |
| `resolved` | Auto-resolves the open incident. Dropped when nothing is open — it never opens an incident of its own |

Nothing else is read as a recovery. In particular `resolved_at` is kept on the incident and never interpreted: on a firing notification it can arrive as `""`, as `"0"` or as the literal `"$resolved_at"` depending on how Metoro substitutes it, and a recovery guessed out of a timestamp would stop the paging for a problem nobody has fixed.

### Incident identity

Spike identifies the incident by `alert_fire_uuid`, Metoro's `$alert_fire_uuid` — "the UUID of the specific alert fire instance". It names one firing of one alert and is carried unchanged onto that firing's recovery, so repeats collapse onto the open incident and the recovery lands on the incident its own firing opened.

| What the payload carries | What Spike matches on |
| --- | --- |
| `alert_fire_uuid` | That uuid. This is the normal case |
| `alert_uuid` only | The alert definition's uuid |
| Neither | The incident title, which is why a title with no uuid behind it never carries a number. See [Incident titles](#incident-titles) |

`alert_uuid` is a fallback and never a preference, because every group of a grouped alert shares one `alert_uuid`. Preferring it would let one group's recovery resolve a sibling group's incident — a second service's page going quiet while it is still broken.

{% hint style="success" %}
Auto-resolution needs nothing switched on in Spike. Tick **Notify when alarm recovers** on the alert in Metoro, give the recovery the same webhook, and Spike closes the incident when the `resolved` notification arrives.
{% endhint %}

## Incident titles

`description` is Metoro's `$alert_description` — the sentence your own alert rule gives for what is wrong — so when it reads as a title, it **is** the title:

```
checkout-api is returning 5xx on more than 2% of requests for the last 5 minutes
```

A responder woken at 3am learns more from that than from any line Spike could assemble out of the parts, so nothing is added to it and nothing is cut out of it.

The description box takes free prose, though, and a paragraph is not a title. A `description` longer than 120 characters — about the two lines a phone notification shows — is left on the incident page, and the title is **built** instead out of the parts Metoro's own alert screen shows in columns:

```
checkout-api 5xx rate high — http.server.request.count 4.7 on checkout-api (production)
```

That is `{alert_name} — {metric_name} {value} on {where}`, and whichever of those parts your payload supports. The same line is used when the description box is simply empty.

`{where}` is `service`, then `environment`, then the first pair of the group-by `attributes`. Both names go in when both read (`checkout-api (production)`), because an alert on `checkout-api` in staging is not the one in production. It goes last in the line so that shortening can never take it, and the measurement clause is the first thing dropped if the line runs past 200 characters.

{% hint style="info" %}
**Why the number is conditional.** Spike puts the breaching value in a title only when the payload carries `alert_fire_uuid` or `alert_uuid`, because that uuid is what Spike matches the next notification on. With no uuid Spike has to match by title, and a title carrying a value that moves while the alert is still firing would open a fresh incident on every notification. So an alert sent without either uuid gets `{alert_name} on {where}` — the same bytes every time:

```
ingest-worker queue backing up on ingest-worker (production)
```

This is one more reason to keep `alert_fire_uuid` in the body template.
{% endhint %}

Values are rounded for reading rather than printed raw: whole numbers from ten up, two significant digits below it, and thousands separators (`4.7`, `0.17`, `13,483`). A value that is not a plain number — `4.7ms`, an empty string, a variable Metoro did not substitute — is treated as absent, and the title keeps the metric's name without a number rather than printing something that is not one.

### Recoveries

A recovery reads the same way in the past, with nothing in it that moves:

```
Recovered: checkout-api is returning 5xx on more than 2% of requests for the last 5 minutes
```

The value on a recovery is the value that came back under the threshold, which is not news, so it is not in the line. Spike still sends the opening title along with the recovery under the hood, so the resolve lands whether it matched on the uuid or on the title.

### Fallbacks

| What arrived | Title |
| --- | --- |
| A description that reads as a title | That sentence, used whole |
| A long description, or none | `{alert_name} — {metric_name} {value} on {where}` |
| No name and no description, but a metric | `{metric_name} {value} on {where}` |
| A Guardian notification | Its `title`, else its `message` cut to one line |
| Nothing readable | `Metoro alert with no details` |

{% hint style="info" %}
Titles never carry the deep link, `fired_at`, `resolved_at` or either uuid. A url cannot be read out on a phone call and a timestamp is different on every notification; all four are on the incident page, where the whole body Metoro sent is stored. Use the [Title Remapper](../alerts/title-remapper.md) if your team reads alerts in a different shape — there is an example [further down this page](#rewriting-the-title).
{% endhint %}

## Severity

Metoro documents no severity and no threshold variable for alerts, so there is nothing in the body for Spike to read and a Metoro incident arrives without a severity.

Set it with an [alert routing rule](../alerts/alert-rules.md) instead. Add an **Incident details** condition on `alert_name` or `service` and give each one the severity and escalation policy you want — for example `service` equals `checkout-api` → **Mark severity as** SEV1. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* A Metoro organization, and an account that can reach the **Integrations** page
* At least one alert to attach the webhook to
* A Metoro integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Metoro**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Add the webhook in Metoro

{% tabs %}
{% tab title="Setup on Metoro" %}
1. **Open the integrations page:**
   In Metoro, go to **Integrations** (`https://us-east.metoro.io/integrations`) and click the **Add Webhook** button.

2. **Name it** — **Name** is required. Use something you will recognise in the alert wizard's destination list, for example `Spike - payments on-call`.

3. **Point it at Spike** — **URL** is required. Paste the webhook URL you copied in Step 1.

4. **Leave HTTP Method as `POST`.** That is Metoro's default and the only method Spike accepts.

5. **Leave Headers empty.** The token in the URL is what authenticates the request to Spike, so there is nothing else to send. Metoro's own Rootly guide adds an `Authorization` header because Rootly needs one; Spike does not.

6. **Paste the body template.** **Body Template** is optional as far as Metoro is concerned and required for Spike — copy the JSON from [the next section](#the-body-template) into it exactly as written.

7. **Submit** to save the webhook. It is now selectable as a destination on any alert.
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
The Spike webhook URL is a credential — anyone holding it can open incidents on your service. Treat it like a password, and if it leaks, archive the integration and create a new one.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## The body template

Paste this into Metoro's **Body Template** field. The `$`-prefixed values are Metoro's own alert variables and Metoro substitutes them at delivery time; the key names on the left are what Spike reads, so keep all thirteen exactly as written:

```json
{
  "alert_name": "$alert_name",
  "description": "$alert_description",
  "state": "$alert_state",
  "alert_uuid": "$alert_uuid",
  "alert_fire_uuid": "$alert_fire_uuid",
  "metric_name": "$metric_name",
  "value": "$breaching_datapoint_value",
  "attributes": "$attributes",
  "service": "$service",
  "environment": "$environment",
  "deep_link": "$deep_link",
  "fired_at": "$fired_at",
  "resolved_at": "$resolved_at"
}
```

Three of those lines carry the behaviour and should never be edited out:

* **`state`** is the only thing that tells a firing from a recovery. Without it every recovery opens a new incident and nothing ever auto-resolves.
* **`alert_fire_uuid`** is how Spike recognises the same firing twice. Without it repeats and recoveries have to be matched by title.
* **`description`** or **`alert_name`** — at least one — is what the incident is called. With neither, the incident is titled from the metric, and with nothing at all it reads `Metoro alert with no details`.

The rest is what the responder reads on the incident page. Keep the quotes around every value, including the uuids and `$breaching_datapoint_value`: Metoro substitutes plain text, so an unquoted value can produce JSON that does not parse.

{% hint style="info" %}
`$service` and `$environment` are marked **Deprecated** in Metoro's webhook reference in favour of `$attributes`, and are documented as set only for Kubernetes and Log alerts or alerts with a `group by`. They are kept in the template because they still read best when they are set; when they are not, Spike takes the place out of `attributes` instead, and a value that arrives as the literal `$service` is ignored rather than printed.
{% endhint %}

### The body Metoro sends

With that template on the webhook, a firing alert reaches Spike like this:

```json
{
  "alert_name": "checkout-api 5xx rate high",
  "description": "checkout-api is returning 5xx on more than 2% of requests for the last 5 minutes",
  "state": "firing",
  "alert_uuid": "8f2c1d34-2d9a-4b4a-bb0e-6a0d7c1f5e55",
  "alert_fire_uuid": "c0a81e2b-7d41-4e9c-9f3a-1b6d5c8e4a27",
  "metric_name": "http.server.request.count",
  "value": "4.7",
  "attributes": "service: checkout-api, environment: production, k8s.namespace: checkout",
  "service": "checkout-api",
  "environment": "production",
  "deep_link": "https://us-east.metoro.io/alerts/8f2c1d34-2d9a-4b4a-bb0e-6a0d7c1f5e55?fire=c0a81e2b-7d41-4e9c-9f3a-1b6d5c8e4a27",
  "fired_at": "1760263200",
  "resolved_at": ""
}
```

That opens an incident titled `checkout-api is returning 5xx on more than 2% of requests for the last 5 minutes`.

When the alert recovers, the same `alert_fire_uuid` comes back with `state` flipped:

```json
{
  "alert_name": "checkout-api 5xx rate high",
  "description": "checkout-api is returning 5xx on more than 2% of requests for the last 5 minutes",
  "state": "resolved",
  "alert_uuid": "8f2c1d34-2d9a-4b4a-bb0e-6a0d7c1f5e55",
  "alert_fire_uuid": "c0a81e2b-7d41-4e9c-9f3a-1b6d5c8e4a27",
  "metric_name": "http.server.request.count",
  "value": "0.3",
  "attributes": "service: checkout-api, environment: production, k8s.namespace: checkout",
  "service": "checkout-api",
  "environment": "production",
  "deep_link": "https://us-east.metoro.io/alerts/8f2c1d34-2d9a-4b4a-bb0e-6a0d7c1f5e55?fire=c0a81e2b-7d41-4e9c-9f3a-1b6d5c8e4a27",
  "fired_at": "1760263200",
  "resolved_at": "1760265000"
}
```

Spike reads `resolved`, finds the open incident by `alert_fire_uuid`, and closes it.

## Step 3 — Select the webhook as the alert's destination

Webhooks are added once and then chosen per alert.

1. **Open the alert** in Metoro — pick an existing one or create one in the alert wizard.
2. In the **Select Destination** section, click **Add Destination**.
3. Choose **Webhook** from the destination type dropdown, and pick the webhook you created in Step 2.
4. Tick **Notify when alarm recovers**. This is the step that makes auto-resolution work: without it Metoro only sends the firing notification and the incident stays open until somebody resolves it by hand.
5. The recovery option expands into a second destination selector, for the resolved notification. Metoro's own words: "You can use the same webhook for both or configure different endpoints." Pick the **same Spike webhook** — Spike tells the two apart from `state`, and a recovery sent to a different Spike integration would not find the incident.
6. **Save** the alert.

Repeat for every alert that should page on-call.

{% hint style="info" %}
Scope this to the alerts a human should be woken for. Every alert pointed at the webhook opens an incident and runs your escalation policy; use [alert routing rules](../alerts/alert-rules.md) to downgrade or suppress the noisier ones in Spike, or leave their destination off in Metoro.
{% endhint %}

## Step 4 — Confirm with a real alert

Metoro has no test-webhook button, so the integration is confirmed with an alert that fires for real. The quickest way is a temporary alert with a threshold you know is already breached — a CPU or request-count alert with the threshold set near zero — pointed at the Spike webhook.

An incident on the right service, with the right escalation policy attached and the alert's own description as its title, means Metoro can reach Spike and the wiring is done. Set the threshold back, or delete the alert, and the recovery notification closes the incident for you.

## Payload reference

Every field in the template, the Metoro variable behind it, and what Spike does with it:

| Field | Metoro variable | What Spike does with it |
| --- | --- | --- |
| `state` | `$alert_state` | Firing or recovery. **Required** for auto-resolution |
| `alert_fire_uuid` | `$alert_fire_uuid` | Incident identity. **Required** for reliable grouping |
| `alert_uuid` | `$alert_uuid` | Fallback identity, for a payload with no fire uuid |
| `description` | `$alert_description` | The incident title when it reads as one |
| `alert_name` | `$alert_name` | The title when `description` is long or empty |
| `metric_name` | `$metric_name` | Part of the built title |
| `value` | `$breaching_datapoint_value` | The number in a built title, when a uuid is present |
| `attributes` | `$attributes` | The place in a built title, when `service` and `environment` are empty |
| `service` | `$service` (Deprecated) | First choice for the place in a built title |
| `environment` | `$environment` (Deprecated) | Second choice for the place |
| `deep_link` | `$deep_link` | Kept on the incident so it links back to Metoro. Never in the title |
| `fired_at` | `$fired_at` | Kept on the incident. Never in the title |
| `resolved_at` | `$resolved_at` | Kept on the incident. Never read as a state |

Metoro documents more variables than the template uses — `$breaching_datapoint_time` among them. Add them under names of your own if your responders want them on the incident page; Spike stores the whole body either way and ignores the keys it does not know.

{% hint style="info" %}
If you copied the payload from Metoro's own alert destinations page rather than from this guide, your body names the discriminator `alert_state` instead of `state`. Spike reads `alert_state` too, but only when `state` is absent, so that payload still gets firings and recoveries the right way round. Switching to the template above gets you the titles and the grouping as well.
{% endhint %}

### Rewriting the title

Point a [Title Remapper](../alerts/title-remapper.md) at the Metoro integration to build your own title out of that body. A remapper replaces the whole title, so everything described under [Incident titles](#incident-titles) goes with it. This one titles by rule name and service, which is the shape teams who read alerts by rule usually want:

```handlebars
{{data.body.alert_name}} on {{data.body.service}}
```

Open the remapper against a real incident first — the preview shows the body your own template produces, which is the quickest way to find the field you want.

{% hint style="warning" %}
If your alerts reach Spike without `alert_fire_uuid` or `alert_uuid`, do not remap onto `value`, `fired_at` or `resolved_at`. Spike has to match those incidents by title, and a title that moves between notifications opens a new incident each time.
{% endhint %}

## Things worth knowing

* **One incident per firing, not per alert.** A grouped alert fires once per group, each with its own `alert_fire_uuid`, so two namespaces breaching the same rule are two incidents in Spike — which is what you want when they page different people.
* **Repeats do not page twice.** Any notification carrying an `alert_fire_uuid` Spike has already seen is added as an event to the incident already open.
* **A recovery with nothing open is dropped.** If you resolved the incident in Spike before the alert recovered in Metoro, the `resolved` notification is ignored rather than reopening anything.
* **Resolving in Spike does not change anything in Metoro.** The alert is still firing there; the next notification about that same firing joins the incident Spike reopens for it.
* **Guardian (AI-SRE) notifications are not mapped yet.** Metoro's webhooks also carry AI SRE events — anomaly detection, autonomous investigations, deployment verification. One pointed at a Metoro integration URL opens an incident titled from its `title`, falling back to its `message`, so it is readable rather than blank, but its `type` and `data` fields are not interpreted and nothing auto-resolves it. Give Guardian its own webhook and its own Spike integration if you want to page on it, so its incidents do not sit in the same service as your alerts.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check the alert, not the webhook: a webhook on the integrations page does nothing until an alert names it under **Select Destination**. Open the alert and confirm the Spike webhook is listed there and the alert has actually fired since you added it.

If it is listed, check the **URL** on the webhook character for character against the one on the Spike integration, and make sure **HTTP Method** is `POST`.

</details>

<details>

<summary>Incidents open but never resolve</summary>

Three things to check, in this order:

1. **Notify when alarm recovers** is ticked on the alert, and the recovery destination is the same Spike webhook. Without the tick Metoro never sends a recovery at all.
2. The body template still has `"state": "$alert_state"` in it, spelled exactly that way. Spike resolves on the value `resolved` under `state` (or under `alert_state`) and on nothing else — not on `resolved_at` being filled in.
3. The body template still has `"alert_fire_uuid": "$alert_fire_uuid"` in it. Without a uuid the recovery has to match the open incident by title, which only works if the incident was opened by the same integration.

</details>

<details>

<summary>One alert opened several incidents while it was firing</summary>

The body is reaching Spike without `alert_fire_uuid` and without `alert_uuid`, so each notification was matched by title — and a title carrying a value that moves is a different title each time. Put both uuid lines back in the [body template](#the-body-template).

Note that Spike already drops the value from a title when neither uuid is present, so this happens with a hand-written body rather than with the template on this page.

</details>

<details>

<summary>The title says the wrong thing, or reads as a paragraph</summary>

The title comes from your own alert rule's **description** when that description reads as a title, and from the rule's name, metric and value when it does not. If an incident is titled from the rule name and you expected the description, the description is longer than 120 characters — shorten it in Metoro, or [remap the title](#rewriting-the-title).

If the title reads `Metoro alert with no details`, nothing in the body substituted to anything readable: check the variable names in the template for typos, since Metoro leaves an unknown `$variable` in the body as written and Spike ignores a value that still starts with `$`.

</details>

<details>

<summary>The title has no service or environment in it</summary>

`$service` and `$environment` are Deprecated in Metoro and are set only for Kubernetes and Log alerts, or for an alert with a `group by`. For anything else they arrive empty or unsubstituted, and Spike takes the place from `attributes` instead — which is also only set for an alert with a `group by`.

Add a `group by` on the attribute you want named, for example `service.name` or `k8s.namespace`, and the place reappears in the title.

</details>
