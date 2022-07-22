---
description: >-
  Title Remapper empowers you to programmatically change incident title in
  real-time for better context.
---

# Title Remapper

Title Remapper empowers you to programmatically change incident title in real-time for better context. More context in alerts means it's easier and faster for responders to understand the incident better.



### Example

Let's take Sentry as an example. The incident title is clear but it will do us as incident responders better if we add the project name. Just makes it tad bit clear.

**Without Title remapper**

```
var temp is not defined
```

**With Title remappe**r

```
var temp is not defined for Notification service
```

See the difference? it immediately adds more context. So much nicer to get this additional info especially on phone call and sms alerts.

This was achieved by creating a Title remapper with the code below and simply templating your message from the payload your integration sends.&#x20;

_You can read our_ [_detailed blog_](https://spike.sh/blog/title-remapper/) _on how we came about building this feature alongside the decision for HandlebarsJS._

### Getting started

You can write parsing logic using HandlebarsJS syntax and formulate incident titles accordingly. Read more [here](https://handlebarsjs.com/guide/#what-is-handlebars) (it's extremely simple to get started)\


#### Step 1

From the Alerts menu, go to title remapper and create a new remapper.

![](<../.gitbook/assets/image (142).png>)

#### Step 2

Provide a suitable name and description for your title remapper.

![](<../.gitbook/assets/image (150).png>)



#### Step 3

Select an integration for which you want to parse the title.

![](<../.gitbook/assets/image (143).png>)

Once you select an integration, a JSON body will be displayed in the preview section.

This payload is the metadata which we receive from the selected integration. Using this payload, you can now write a custom parser in the code editor provided on the left.

Once you have written the parser, press `Try Now` to check if the parser works and if the parsed incident title is meeting your requirements. Hit save to continue.

{% hint style="danger" %}
Avoid #each and #unless or basically all for.. loops
{% endhint %}

#### Step 4

Select all the integrations to be connected with the title remapper.

![](<../.gitbook/assets/image (144).png>)

### Examples

All examples below are showcased with the below payload.

```
data: {
  "body": {
    "event_definition_id": "this-is-a-test-notification",
    "event_definition_type": "test-dummy-v1",
    "event_definition_title": "Event Definition Test Title",
    "event_definition_description": "Event Definition Test Description",
    "job_definition_id": "163",
    "job_trigger_id": "8999",
    "event": {
      "id": "NotificationTestId",
      "event_definition_type": "notification-test-v1",
      "event_definition_id": "EventDefinitionTestId",
      "origin_context": "urn:graylog:message:es:testIndex_42:b5etest--id-4-90ed-0dbeefbaz",
      "timestamp": "2021-05-05T09:42:42.823Z",
      "timestamp_processing": "2021-05-05T09:42:42.823Z",
      "timerange_start": null,
      "timerange_end": null,
      "streams": [
        "802109582109518290"
      ],
      "source_streams": [],
      "message": "Notification test message triggered from user <richard>",
      "source": "12837126856181276589235717181276589235716",
      "key_tuple": [
        "testkey"
      ],
      "key": "testkey",
      "priority": 2,
      "alert": true,
      "fields": {
        "field1": "value1",
        "field2": "value2"
      }
    },
    "backlog": []
  },
  "message": "Notification test message triggered from user <richard>"
}
```



#### For basic control

1. **Just the message**

```
{{data.message}}
```

_output_ - Notification test message triggered from user \<richard>



2\. **Get event**

```
{{data.body.event_definition_title}}
```

_output -_ Event Definition Test Title

\
3\. **Get mode details about the event**

```
[{{data.body.event_definition_type}}] has incident => {{data.body.event_definition_title}}output - 
```

_output -_ \[test-dummy-v1] has incident => Event Definition Test Title



#### For advanced control

You can use in-built helpers provided by Handlebars JS. Alongside, we also support a number of helpful helpers on our [own fork of Swag.](https://github.com/spikehq/swag)

```
{{#if data.body.event_definition_desc}}
  Title: {{data.body.event_definition_title}}
{{else if data.body.event.message}}
  Message: [{{data.body.event.key}}] - {{data.body.event.message}}
{{else}}
  {{data.message}}
{{/if}}
```

_output -_ Message: \[testkey] - Notification test message triggered from user \<richard>

#### &#x20;Swag helpers example

```
{{uppercase data.message}} with priority {{add data.body.event.priority 1}}
```

_Output_\
NOTIFICATION TEST MESSAGE TRIGGERED FROM USER \<RICHARD> with priority 3



Visit our [GitHub repo](https://github.com/spikehq/swag) for more examples of Swag.\
