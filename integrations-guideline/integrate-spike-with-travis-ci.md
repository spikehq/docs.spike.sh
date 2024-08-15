---
description: >-
  Integrate Spike with Travis CI to receive real-time alerts via Phone calls, SMS, Slack, MS Teams, and more for build statuses and pipeline results, ensuring continuous integration monitoring.
---

# Integrate Spike with Travis CI
<figure><img src="../.gitbook/assets/travis integration.png" alt=""><figcaption></figcaption></figure>

## Overview
[Travis CI](https://www.travis-ci.com) is a continuous integration service used to build and test software projects hosted on GitHub and Bitbucket. Travis CI automates the process of building, testing, and deploying code, making it easier for teams to deliver high-quality software quickly. With Travis CI, you can ensure that your codebase remains stable and that issues are caught early in the development cycle.

## Incident Alerts from Travis CI

By integrating Travis CI with Spike, you can receive real-time alerts for various pipeline and build-related events, including:

* Build Failures: Alerts when a build fails, allowing you to quickly address issues in your CI/CD process.
* Build Successes: Notifications when builds succeed, giving you confidence that your changes are stable and ready for deployment.
* Build Start and End Events: Alerts when a build starts or ends, keeping you informed of the CI/CD process status.

This integration helps you stay on top of your builds and ensures that you are notified of important events as they happen.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is not supported.
{% endhint %}

## Set up instructions 

**Step 1:** Make sure to add the Travis CI integration and copying the webhook. 

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

Setting up [Webhooks with Travis CI](https://docs.travis-ci.com/user/notifications/#configuring-webhook-notifications) is super easy.

{% tabs %}
{% tab title="Configure YAML" %}
* Configure the `.travis.yml`

Add the following configuration to `.travis.yml` file

```
notifications:
  webhooks:
    urls:
      - http://hooks.spike.sh/******/push-events
      - http://hooks.spike.sh/******/push-events
    on_success: change # default: always
    on_failure: always # default: always
    on_start:   change # default: never
    on_cancel:  always # default: always
    on_error:   always # default: always
```
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Don't forget to change the `urls` to the webhook URL provided by Spike.
{% endhint %}