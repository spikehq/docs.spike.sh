---
description: "Send Blackfire.io alert emails to Spike so alarms open incidents and recovery emails resolve them."
---

# Integrate Spike with Blackfire.io

Blackfire.io can notify you by email when an alert rule changes state. Spike gives each integration its own email address, so Blackfire's alert emails create incidents in Spike and the recovery email resolves them.

{% hint style="info" %}
Blackfire's email format is not published. This guide assumes a subject like `[Blackfire] Alarm: {alert rule} on {environment}` and a recovery subject like `[Blackfire] Recovered: …`. Test with a real alert before relying on auto-resolve.
{% endhint %}

## Step 1: Create the integration in Spike

1. From the header, click [Add integration](https://app.spike.sh/integrations/new) and select **Blackfire.io**.
2. Give it a name and select the service it should alert.
3. Click **Create integration**.
4. Copy the email address shown on the integration page. It looks like `ced6f1c82327db079e3f@email-hooks.spike.sh`.

## Step 2: Send the alert rule's notifications to Spike

1. Sign in to [Blackfire](https://blackfire.io) and open the **Alerting** dashboard of the environment you want to monitor.
2. Click **Add Alert** to create an alert rule, or edit an existing one, and set its metric, threshold and context.
3. In the notification step, open the channel selection menu and create a new notification channel of type **Email** directly from it, with the Spike address from Step 1 as the recipient.
4. Select that channel for the alert rule and save it. Repeat for every alert rule that should page through Spike.

If you would rather keep Blackfire's emails going to your own mailbox, add your address as the Email channel instead and set up a rule in your mail provider that forwards Blackfire's alert emails to the Spike address. Forwarding keeps the subject and body, which is all Spike reads.

{% hint style="warning" %}
Blackfire may require a specific plan for some notification channels. If the Email channel is missing in your account, check your Blackfire plan.
{% endhint %}

## Step 3: Test it

Wait for an alert rule to fire, or forward an earlier Blackfire alert email to your Spike address. An incident should appear within a minute.

### Example email

Spike receives each email as the fields below. You do not build these yourself; they are shown so you can check what arrives.

Firing:

```json
{
  "to": "ced6f1c82327db079e3f@email-hooks.spike.sh",
  "from": "Blackfire <noreply@blackfire.io>",
  "subject": "[Blackfire] Alarm: Checkout p96 response time on Production",
  "text": "96th percentile response time of Checkout on Production is 1,240 ms, above the 800 ms alarm threshold for 5 minutes.\n\nAlert rule: Checkout p96 response time\nEnvironment: Production\nContext: Web\nMetric: Response time (96th percentile)\nAlarm threshold: 800 ms\nWarning threshold: 500 ms\n\nView alert: https://app.blackfire.io/envs/de33be74-8cb3-48ce-9f08-2e83ccf16500/alerts\n",
  "html": "<html><body><p>96th percentile response time of Checkout on Production is 1,240 ms, above the 800 ms alarm threshold for 5 minutes.</p><p>Alert rule: Checkout p96 response time<br>Environment: Production<br>Context: Web<br>Metric: Response time (96th percentile)<br>Alarm threshold: 800 ms<br>Warning threshold: 500 ms</p><p><a href=\"https://app.blackfire.io/envs/de33be74-8cb3-48ce-9f08-2e83ccf16500/alerts\">View alert</a></p></body></html>",
  "envelope": "{\"to\":[\"ced6f1c82327db079e3f@email-hooks.spike.sh\"],\"from\":\"bounces@blackfire.io\"}"
}
```

Recovery:

```json
{
  "to": "ced6f1c82327db079e3f@email-hooks.spike.sh",
  "from": "Blackfire <noreply@blackfire.io>",
  "subject": "[Blackfire] Recovered: Checkout p96 response time on Production",
  "text": "96th percentile response time of Checkout on Production is back to normal at 310 ms, below the 800 ms alarm threshold.\n\nAlert rule: Checkout p96 response time\nEnvironment: Production\nContext: Web\nMetric: Response time (96th percentile)\nAlarm threshold: 800 ms\nWarning threshold: 500 ms\n\nView alert: https://app.blackfire.io/envs/de33be74-8cb3-48ce-9f08-2e83ccf16500/alerts\n",
  "html": "<html><body><p>96th percentile response time of Checkout on Production is back to normal at 310 ms, below the 800 ms alarm threshold.</p><p>Alert rule: Checkout p96 response time<br>Environment: Production<br>Context: Web<br>Metric: Response time (96th percentile)<br>Alarm threshold: 800 ms<br>Warning threshold: 500 ms</p><p><a href=\"https://app.blackfire.io/envs/de33be74-8cb3-48ce-9f08-2e83ccf16500/alerts\">View alert</a></p></body></html>",
  "envelope": "{\"to\":[\"ced6f1c82327db079e3f@email-hooks.spike.sh\"],\"from\":\"bounces@blackfire.io\"}"
}
```

## How Spike reads the email

| Field | Required | Used for |
| --- | --- | --- |
| `to` / `envelope` | Yes | Identifies your integration from the `{token}@email-hooks.spike.sh` address. |
| `subject` | Recommended | Match key for repeats and recovery, and the title fallback. |
| `text` or `html` | Recommended | The first sentence about the fault becomes the incident title. `html` is used when `text` is empty. |
| `from` | No | Shown in the email preview. |

* **Title:** for an alarm or warning, the first content line of the email body, for example *96th percentile response time of Checkout on Production is 1,240 ms, above the 800 ms alarm threshold for 5 minutes.* Greetings, links and `Label: value` lines are skipped, and the title is cut at a word boundary to 200 characters. If there is no such line, the subject is used. A recovery email is titled by its subject, for example *[Blackfire] Recovered: Checkout p96 response time on Production*.
* **Emails with no usable subject:** an email whose subject is empty, or holds nothing but the tag and a state word, has no key. Its title is the fixed *Blackfire alert with no subject* (a recovery: *Blackfire alert recovered*), and all such emails join one open incident.
* **Grouping:** Spike derives a key from the subject by removing the `[Blackfire]` tag and state words (alarm, warning, recovered, back to normal and so on). Emails for the same alert rule and environment join the same open incident, including a warning that escalates to an alarm.
* **Auto-resolve:** a recovery email (subject or first sentence containing *recovered*, *recovery*, *back to normal* or *resolved*) resolves the open incident with the same key. A recovery email with no usable subject has no key, so it does not auto-resolve: it is added to the open incident with no subject, which you resolve by hand.
