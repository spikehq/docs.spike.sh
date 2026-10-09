---
description: >-
  Send Port scorecard rule results to Spike so a rule that stops passing for a catalog entity pages your on-call rotation, and the incident resolves when the rule passes again.
---

# Integrate Spike with Port

[Port](https://www.port.io) is an internal developer portal. Its software catalog holds your services, repositories and other entities, and its scorecards grade each entity against rules such as "has an on-call owner" or "has a runbook", grouped into levels like Bronze, Silver and Gold.

Port can call a webhook whenever a rule result changes. Point an automation at a Spike integration URL and a rule that stops passing for an entity pages your on-call rotation. When the rule passes again, the incident resolves itself.

{% hint style="info" %}
Spike groups repeated alerts for the same rule on the same entity into one incident and suppresses new alerts while it is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to decide severity and actions.
{% endhint %}

## What Spike does with each event

Every delivery carries a `result`, and that field alone decides what Spike does with it.

| `result` | What Spike does |
| --- | --- |
| `Not passed` | Opens an incident, or adds to the one already open for this rule result. |
| `Passed` | Resolves the open incident for this rule result. |
| Anything else, or empty | Treated as `Not passed`. |

The comparison ignores case and surrounding spaces. A `Passed` event with no open incident does not create one.

## Set up instructions

**Step 1:** Create a Port integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Port" %}

**Prerequisites:**
* A Port account where you can create automations
* Scorecards set up, so that your organization has the **Rule result** blueprint (`_rule_result`). Scorecards as blueprints are rolling out gradually, so some Port organizations may not have it yet.

**Create the automation:**

1. In Port, open the **Builder** page and select **Automations**.
2. Click **+ Automation**.
3. Give it a title, for example `Send scorecard rule results to Spike`.
4. Under **Trigger**, choose **Entity updated**, and select the **Rule result** blueprint.
5. Under **Condition**, leave it empty so that both `Not passed` and `Passed` results are sent. Spike needs both to resolve incidents.
6. Under **Backend**, choose **Webhook**.
7. Set **URL** to the Spike webhook URL copied in Step 1.
8. Set **Method** to `POST`.
9. Set **Body** to the JSON below. Port renders each `{{ ... }}` template when the automation runs.

```json
{
  "result": "{{ .event.diff.after.properties.result }}",
  "rule_result_id": "{{ .event.context.entityIdentifier }}",
  "rule": "{{ .event.diff.after.relations.rule }}",
  "entity": "{{ .event.diff.after.properties.entity }}",
  "blueprint": "{{ .event.diff.after.properties.blueprint }}",
  "scorecard": "{{ .event.diff.after.properties.scorecard }}",
  "level": "{{ .event.diff.after.properties.level }}",
  "entity_link": "{{ .event.diff.after.properties.entity_link }}"
}
```

10. Save the automation.

**Fields:**

| Field | Required | What it holds |
| --- | --- | --- |
| `result` | Yes | Result of the rule after the change: `Not passed` or `Passed`. |
| `rule_result_id` | Yes | Identifier of the rule-result entity. There is one per rule and evaluated entity, and it stays the same when the result flips, which is how Spike matches a recovery to its incident. |
| `rule` | Recommended | The rule that changed. Used in the incident title. |
| `entity` | Recommended | The evaluated catalog entity. Used in the incident title. |
| `blueprint` | Optional | Blueprint of the evaluated entity. Used in the title only when `entity` is empty. |
| `scorecard` | Optional | Scorecard the rule belongs to. Shown in the title. |
| `level` | Optional | Scorecard level of the rule, for example `Gold`. Shown in the title. |
| `entity_link` | Optional | Port's link to the entity, kept on the incident for the responder. |

{% hint style="warning" %}
Send exactly these fields. Do not add a top-level `message` key: it would replace the incident title Spike builds. Do not rename fields, as Spike reads them by these names.
{% endhint %}

{% hint style="info" %}
The `rule`, `entity`, `blueprint`, `scorecard`, `level` and `entity_link` templates assume your rule-result blueprint has properties with those identifiers. If your property identifiers differ, adjust the paths inside the `{{ }}` but keep the JSON keys unchanged.
{% endhint %}

**Test the Integration:**
* Make a rule fail for an entity, or open the automation and run it against a rule result.
* Verify an incident appears in Spike titled like `has_on_call_owner not passed (Production Readiness, Gold) on payments-api`.
* Fix the issue so the rule passes, and verify the incident resolves.

{% endtab %}
{% endtabs %}

## Event payload structure

When a rule stops passing, Port sends:

```json
{
  "result": "Not passed",
  "rule_result_id": "has_on_call_owner_payments-api",
  "rule": "has_on_call_owner",
  "entity": "payments-api",
  "blueprint": "service",
  "scorecard": "Production Readiness",
  "level": "Gold",
  "entity_link": "/serviceEntity?identifier=payments-api"
}
```

When it passes again, the same body arrives with `"result": "Passed"`:

```json
{
  "result": "Passed",
  "rule_result_id": "has_on_call_owner_payments-api",
  "rule": "has_on_call_owner",
  "entity": "payments-api",
  "blueprint": "service",
  "scorecard": "Production Readiness",
  "level": "Gold",
  "entity_link": "/serviceEntity?identifier=payments-api"
}
```

## Incident title

Port sends no sentence describing the problem, so Spike builds the title from the fields:

* Firing: `{rule} not passed ({scorecard}, {level}) on {entity}`, for example `has_on_call_owner not passed (Production Readiness, Gold) on payments-api`.
* Recovery: `{rule} passed again on {entity}`.

Empty parts are left out. If `entity` is empty, `blueprint` is used instead. The `rule_result_id` is not part of the title.

## Limitations

* Rule results that are first created as `Not passed` are an "entity created" event in Port. The automation above fires on **Entity updated** only, so add a second automation with the trigger **Entity created** and the same body if you want those too.
* Spike does not verify Port's request signature.

{% hint style="success" %}
This integration supports auto-resolution. When Port reports `Passed` for a rule result, the matching incident is resolved in Spike.
{% endhint %}
