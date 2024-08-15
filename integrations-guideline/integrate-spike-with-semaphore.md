---
description: >-
  Integrate Spike with Semaphore CI to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for pipeline results and build statuses, ensuring continuous integration monitoring.
---

# Integrate Spike with Semaphore CI
<figure><img src="../.gitbook/assets/Semaphore integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Semaphore CI](https://semaphoreci.com) is a powerful continuous integration and delivery (CI/CD) platform designed to help teams automate their development workflows. Semaphore CI allows you to run tests, deploy applications, and build projects with ease, providing fast feedback and reliable results. With its robust pipeline management and customizable notifications, Semaphore CI helps ensure that your code remains stable and your deployments are successful.

## Incident Alerts from Semaphore CI

By integrating Semaphore CI with Spike, you can receive real-time alerts for various pipeline-related events, including:

* Pipeline Failures: Alerts when a pipeline fails, helping you quickly address issues in your CI/CD process.
* Build Status Changes: Notifications when builds pass, fail, or are canceled, ensuring you are aware of your project's status at all times.
* Stopped or Canceled Pipelines: Alerts for pipelines that are stopped or canceled, enabling you to investigate and resolve potential issues.

This integration keeps you informed about the state of your pipelines, allowing you to respond promptly and maintain the quality of your codebase.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions

**Step 1:** Make sure to add a Semaphore integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**
Semaphore provides the option to trigger alerts by filtering pipeline results. You can specify notifications to be sent only on specific pipeline outcomes.


Available values for the results filter include:

* `passed`
* `failed`
* `stopped`
* `canceled`

You can use this example YAML configuration:

{% tabs %}
{% tab title="Nofify on fail (YAML)" %}
* **notify-on-fail.yml**
```
apiVersion: v1alpha
kind: Notification
metadata:
  name: notify-on-fail
spec:
  rules:
    - name: "Example"
      filter:
        projects:
          - example-project
        results:
          - failed
      notify:
        webhook:
          endpoint: https://hooks.spike.sh/********/push-events
```
* Create the notification flow above using the following command

```
sem create -f notify-on-fail.yml
```

This YAML configuration sends alerts to Spike.sh when a pipeline fails.
{% endtab %}
{% endtabs %}

{% hint style="info" %}
Change the endpoints to the webhook URL provided by Spike in the above YAML
{% endhint %}