---
description: Message parsing fails when Spike cannot convert an integration's JSON payload into a readable format.
---

# Why does message parsing fail?

When an integration triggers an incident, Spike parses the JSON payload into a readable format. Some integrations send payloads in formats the parser doesn't recognise, and that's when it fails.

<figure><img src="../.gitbook/assets/image (40).png" alt="Example of incident message parsing fail"><figcaption><p>An incident with a failed message parse in the incidents table.</p></figcaption></figure>

## Does it affect alerts?

Yes. Alerts still go out, but the incident message won't be included.

## Does it affect the incident?

No. The incident is still created and all details are available. Click the incident ID to view the full details.

## Report a parsing failure

When you see a parsing failure, report it with a single click. Each report helps improve the parser for future incidents.

<figure><img src="../.gitbook/assets/spike-incident-parsing-fail-report.gif" alt="Report a parsing failure with a single click"><figcaption><p>Report a parsing failure directly from the incidents table.</p></figcaption></figure>

{% hint style="warning" %}
Once the parser is fixed, existing incidents won't be updated. The fix applies to new incidents only.
{% endhint %}
