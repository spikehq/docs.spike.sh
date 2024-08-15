---
description: >-
   Integrate Spike with GitHub workflows to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for workflows.
---

# Integrate Spike with GitHub Workflows
<figure><img src="../.gitbook/assets/Github workflows integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[GitHub Workflows](https://docs.github.com/en/actions/writing-workflows) allows you to create custom workflows that automate your software development processes. Whether it's building, testing, or deploying your code, GitHub Workflows streamlines your CI/CD pipeline and ensures your projects stay on track.

##

By integrating GitHub Workflows with Spike, you can receive real-time alerts for various workflow-related incidents, including:

* **Workflow Failures:** Alerts when a workflow run fails, helping you quickly identify and address issues in your CI/CD pipeline.
* **Job Failures:** Notifications for individual job failures within a workflow, allowing for targeted troubleshooting.
* **Run Time Exceeds:** Alerts when a workflow or job takes longer than expected, indicating potential performance bottlenecks.

This integration ensures that you’re promptly informed of any issues in your workflows, enabling fast response and resolution.

{% hint style="success" %}
Auto-resolution is supported for this integration. Spike will also automatically group repeated incidents and suppress alerts while incident is open.
{% endhint %}


## Set up instructions

**Step 1:** Create a GitHub Workflows integration and copy the unique webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**
{% tabs %}
{% tab title="Setup on GitHub" %}
* **1. Access Webhook Settings:**
  * Go to the Settings section of your repository and open the Webhooks settings.
**Add a New Webhook:**
  * Click on Add webhook to create a new webhook.
  * Paste the copied webhook in the URL field.
  * Set the content type to **application/json**.
  * Choose the individual events you want to monitor, such as workflow runs or job completions.
{% endtab %}
{% endtabs %}