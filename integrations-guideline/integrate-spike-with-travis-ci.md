# Integrate Spike with Travis CI

### Service and integration

Make sure to add the Travis CI integration and copying the webhook. 

{% page-ref page="create-integration-and-service-on-dashboard.md" %}

## Using the webhook with Travis CI

Setting up [Webhooks with Travis CI](https://docs.travis-ci.com/user/notifications/#configuring-webhook-notifications) is just a one-step process.  
  
**Configure the `.travis.yml`**

Add the following configuration to  .travis.yml  file

```text
notifications:
  webhooks:
    urls:
      - http://hooks.mydomain.com/travisci
      - http://hooks.mydomain.com/events
    on_success: change # default: always
    on_failure: always # default: always
    on_start:   change # default: never
    on_cancel:  always # default: always
    on_error:   always # default: always
```

{% hint style="warning" %}
Don't forget to change the `urls` to the webhook URL provided by Spike.
{% endhint %}

## FAQ

1. **How many services and integrations can I create on Spike?**
   * Unlimited
2. **How many escalation policies can I have on Spike?**
   * Unlimited

At Spike, we are working hard to integrate with all the tools your business uses. We are on a mission to help **you** identify incidents/crashes/spikes before your customers do.

If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)

