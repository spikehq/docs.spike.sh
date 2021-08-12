---
description: >-
  Get alerts if your API breaks, web app with crucial transactions with E2E
  testing alerts from Checkly
---

# Integrate Spike with Checkly

## Service and integration

With our Checkly integration make sure your API always responds quickly and with the correct payload. Monitor your web app's crucial transactions and get alerts. 

{% page-ref page="create-integration-and-service-on-dashboard.md" %}

## Use our webhook on Checkly

Visit [Alert settings on Checkly](https://app.checklyhq.com/alert-settings) and create a new channel. 

### Step 1: 

Select webhooks

![Select webhooks after you create a new channel](../.gitbook/assets/checkly-with-stripe-1.png)

### Step 2:

Paste the webhook and the payload for our integration.

![Paste the webhook and the body](../.gitbook/assets/checkly-with-stripe-2.png)

**Copy and paste the below body to Checkly's dashboard after you have pasted the webhook**

```text
{
  {{! Embeds for the SSL expiry notifications}}
  {{#eq ALERT_TYPE "ALERT_SSL" }}
    "title": "{{ALERT_TITLE}}",
    "ssl_days_remaining": "{{SSL_DAYS_REMAINING}}",
    "ssl_domain": "{{SSL_CHECK_DOMAIN}}"
  {{else}}
  {{! Embeds for the standard failure, recovery and degraded notifications}}
    "event": "{{ALERT_TITLE}}",
    "type": "{{ALERT_TYPE}}",
    "link": "{{RESULT_LINK}}",
    "id": "{{CHECK_ID}}",
    "check_type": "{{CHECK_TYPE}}",
    "name": "{{CHECK_NAME}}",
    "location": "{{RUN_LOCATION}}",
    "tags": [{{#each TAGS}} "{{this}}" {{#unless @last}},{{/unless}} {{/each}}]
  {{/eq}}
}
```

{% hint style="warning" %}
Please refrain from editing the above body. Doing so will not give you the best results in terms of alerts and auto-resolve
{% endhint %}

{% hint style="success" %}
This integration auto-resolves all types of incidents except SSL warnings from Checkly
{% endhint %}

