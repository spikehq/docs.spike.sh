---
description: "Connect BugBase to Spike for real-time alerts when a security report or vulnerability is submitted, and automatic resolution when it is resolved, closed, or marked duplicate, invalid, or informational."
---
# BugBase

## Overview

[BugBase](https://bugbase.ai) is a bug bounty and vulnerability disclosure platform. Security researchers submit reports against your program, and your team triages, fixes, and closes them.

With Spike's integration, you can receive real-time alerts when:

* **A new report is submitted**: A researcher files a report against your program.
* **A new vulnerability is reported**: A vulnerability is added to your program.
* **A report is closed**: The report is resolved, closed, or marked as duplicate, invalid, or informational. Spike resolves the matching incident.

The incident title is the report's executive summary, so your on-call team sees what is wrong straight away.

{% hint style="info" %}
Spike groups repeated alerts for the same report into one incident and suppresses further alerts while the incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to route by `severity` and `priority`, for example Critical and High to SEV1, Medium to SEV2, and Low to SEV3.
{% endhint %}

{% hint style="success" %}
When a report moves to a closed stage (Resolved, Duplicate, Invalid/Spam, or Informational), Spike automatically resolves the same incident.
{% endhint %}

## Set up instructions

**Step 1:** Create a BugBase integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on BugBase" %}

**Prerequisites:**
* Admin access to your BugBase program

**Create the Webhook:**

1. **Open Integrations:**
   * Log in to BugBase and open your program
   * Go to **Program settings → Integrations**
   * In the **Webhooks** card, click **Add**

2. **Configure the Webhook:**
   * **URL** (required): Paste the Spike webhook URL copied from Step 1
   * **Method** (required): `POST`
   * **Content-Type** (required): `application/json`

3. **Paste the body** (required). Paste this JSON exactly as shown. BugBase replaces each `{{variable}}` with the report's value when it sends the webhook:

   ```json
   {
     "report_id": "{{reportID}}",
     "trigger": "{{trigger}}",
     "status": "{{status}}",
     "is_closed": "{{isClosed}}",
     "severity": "{{severity}}",
     "priority": "{{priority}}",
     "category": "{{category}}",
     "scope": "{{scope}}",
     "summary": "{{summary}}",
     "impact": "{{impact}}",
     "description": "{{description}}"
   }
   ```

   Spike needs `report_id` and `status` to group alerts and resolve incidents. The other fields fill in the incident title and details.

4. **Select Triggers:**
   Enable these triggers:
   * New Report is Submitted
   * New Vulnerability is Reported
   * Report is marked as Resolved
   * Report is Closed
   * Report is marked as Duplicate / Invalid / Informational
   * Vulnerability is marked as Resolved

   {% hint style="warning" %}
   Do not enable the chat-message, priority-change, or reward triggers. They are not report open or close events, so they would create noise in Spike.
   {% endhint %}

5. **Save and Test:**
   * Save the webhook
   * Submit a test report, then mark it Resolved
   * Verify the incident appears in Spike and resolves when the report is closed

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Do not add the `{{report}}` variable or other multi-line text to the body. If BugBase does not escape quotes and line breaks in the text it substitutes, the body can arrive as invalid JSON. When you test, use a report summary that contains a quote character to check.
{% endhint %}

## FAQs

<details>
<summary>Do I need to modify the JSON body?</summary>
No. Paste it exactly as shown. Every field is used to build the incident title, match the report across alerts, or route by severity.
</details>

<details>
<summary>What is the incident title?</summary>
The report's summary. If it is empty, Spike uses the description, then the impact, then the category and the host of the scope (for example, "SQL Injection report on api.acmebank.com"). When a report is closed, the title is prefixed with its status, for example "Resolved: ...".
</details>

<details>
<summary>Which report statuses resolve the incident?</summary>
Resolved, Duplicate, Invalid/Spam, and Informational. New and Triaged reports keep the incident open. Spike also resolves when `is_closed` is true.
</details>

<details>
<summary>Why are no incidents showing up in Spike?</summary>
Check that the webhook URL is correct, the method is `POST`, Content-Type is `application/json`, and the triggers above are enabled.
</details>
