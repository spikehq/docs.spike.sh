---
description: >-
   Integrate Spike with Akamai mPulse (formerly SOASTA) to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more when your real user monitoring alerts fire.
---

# Integrate Spike with Akamai mPulse

## Overview
[Akamai mPulse](https://www.akamai.com/products/mpulse-real-user-monitoring) (formerly SOASTA) is a real user monitoring (RUM) platform. It measures how real visitors experience your websites and apps, and lets you define alerts on timers and metrics such as page load time and bounce rate.

With Spike's integration, you can receive an incident whenever an mPulse alert fires, including:

* **Slow pages**: Page load time or other timers crossing the threshold you set.
* **Engagement drops**: Metrics such as bounce rate moving outside the expected range.
* **Traffic changes**: Unusual beacon counts in the evaluated window.

{% hint style="info" %}
Spike groups repeated alerts with the same **Alert Name** into one incident while it is open. You can configure [alert rules](https://docs.spike.sh/alerts/alert-rules) to define severity levels, change escalation policies, and trigger outbound scripts.
{% endhint %}

{% hint style="warning" %}
mPulse does not document a notification when an alert clears, so Spike cannot resolve these incidents automatically. Resolve them from the Spike dashboard, Slack, or the mobile app.
{% endhint %}

---

## Set up instructions

**Step 1:** Create an Akamai mPulse integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Akamai mPulse" %}
1. **Log in to mPulse** with a user who can edit alerts for your app.

2. **Open the alert:**
   Go to **Alerts**, then create a new alert or open the alert definition you want to send to Spike.

3. **Add a webhook action:**
   In the alert's notification settings, add a **Webhook** and paste the **webhook URL** from Spike into the URL field.
   Set the method to `POST` and the content type to `application/json`.

4. **Set the body:**
   Paste the following JSON as the body. Replace each value with the matching mPulse attribute, using the attribute picker to drag it in:

   ```json
   {
     "alert_name": "Checkout page load time",
     "severity": "SEVERE",
     "app_name": "www.example-shop.com",
     "description": "Median page load time on checkout pages is above 4 seconds",
     "page_load_time": "4210",
     "bounce_rate": "38.2",
     "beacon_count": "12873"
   }
   ```

   | Field | Required | What to put there |
   | --- | --- | --- |
   | `alert_name` | Yes | The **Alert Name** attribute. It identifies the alert, so repeats join the same incident. |
   | `severity` | No | The **Alert Severity** attribute (info, low, medium or severe). Shown in the title when there is no description. |
   | `app_name` | No | The mPulse app or domain the alert belongs to. |
   | `description` | No | A sentence saying what is wrong. When present, it becomes the incident title. Type it by hand and keep it fixed text, without readings dragged in. |
   | `page_load_time` | No | The page load timer value at alert time. Context only. |
   | `bounce_rate` | No | The bounce rate value at alert time. Context only. |
   | `beacon_count` | No | The number of beacons in the evaluated window. Context only. |

5. **Save and test:**
   Save the alert, then trigger it or use mPulse's test option, and check that the incident appears in Spike.
{% endtab %}
{% endtabs %}

## FAQs
<details>
<summary>Will incidents auto-resolve in Spike when the alert clears in mPulse?</summary>
No. mPulse does not send a webhook when an alert clears, so resolve the incident in Spike.
</details>
<details>
<summary>Why should <code>alert_name</code> always be included?</summary>
Spike uses it to recognise repeats of the same alert. Without it, Spike can only match repeats by title, and the title falls back to a short summary built from severity and app name.
</details>
<details>
<summary>What if two alerts have the same name?</summary>
They share one Spike incident. Give each alert definition a unique name.
</details>
<details>
<summary>What if no incidents show up in Spike?</summary>
Check that the webhook URL is correct, the method is `POST`, the content type is `application/json`, and the body is valid JSON.
</details>
