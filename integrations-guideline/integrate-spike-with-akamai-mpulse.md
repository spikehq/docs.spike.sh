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
   Paste the following JSON as the body. Replace each value with the matching mPulse attribute:

   ```json
   {
     "alert_name": "Checkout page load time above 4s",
     "severity": "HIGH",
     "app_name": "shop-production",
     "beacon_count": "1842",
     "bounce_rate": "37",
     "network_error_rate": "2",
     "page_load_time": "4630 ms",
     "dns_resolution_time": "81 ms",
     "dom_load_time": "2210 ms",
     "dom_ready_time": "1980 ms",
     "back_end_time": "1356 ms",
     "ssl_time": "71 ms",
     "front_end_time": "3274 ms",
     "tcp_time": "20 ms"
   }
   ```

   | Field | Required | What to put there |
   | --- | --- | --- |
   | `alert_name` | Yes | The **Alert Name** attribute. It identifies the alert, so repeats join the same incident, and it is the start of the incident title. |
   | `app_name` | No | The mPulse app the alert watches. Added to the title as `on <app_name>`. |
   | `severity` | No | The alert's severity (Info, Low, Medium or High). High maps to sev1, Medium to sev2, Low and Info to sev3. Not shown in the title. |
   | `beacon_count`, `bounce_rate`, `network_error_rate` | No | Readings at alert time, sent as strings. Context only. |
   | `page_load_time`, `dns_resolution_time`, `dom_load_time`, `dom_ready_time`, `back_end_time`, `ssl_time`, `front_end_time`, `tcp_time` | No | Timer readings at alert time, sent as strings with their unit. Context only. |

   Spike builds the incident title as `<alert_name> on <app_name>`, for example `Checkout page load time above 4s on shop-production`. The `on <app_name>` part is left out when the alert name already contains the app name as a whole word, and the title is cut to 200 characters. Readings and severity never appear in the title, so a repeat with new readings joins the open incident. If `alert_name` is missing, the title is `Akamai mPulse alert on <app_name>`; with neither, it is `Akamai mPulse alert with no details`.

   {% hint style="warning" %}
   If an attribute is left unexpanded (it arrives as text such as `$alert_name`, `{{alert_name}}` or `%alert_name%`), Spike treats it as missing. Two different alerts then cannot be told apart by name, so check that each value is replaced by the real mPulse attribute.
   {% endhint %}

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
Spike uses it to recognise repeats of the same alert. Without it, Spike can only match repeats by title, which then reads `Akamai mPulse alert on <app_name>`, so different alerts on the same app would share one incident.
</details>
<details>
<summary>What if two alerts have the same name?</summary>
They share one Spike incident while it is open. mPulse requires alert names to be unique, so give each alert definition its own name.
</details>
<details>
<summary>What if no incidents show up in Spike?</summary>
Check that the webhook URL is correct, the method is `POST`, the content type is `application/json`, and the body is valid JSON.
</details>
