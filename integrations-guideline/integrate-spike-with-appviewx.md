---
description: >-
  Send AppViewX certificate expiry alert emails to Spike so an expiring certificate pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with AppViewX

[AppViewX](https://www.appviewx.com) manages the certificates your organisation relies on. It emails an expiry alert when a certificate is about to expire, so someone can renew it before a site or service breaks.

AppViewX alerts are emails, so this integration uses Spike's email address. Add that address as a recipient of the AppViewX expiry alert and each alert pages your on-call rotation instead of waiting in a mailbox.

## What Spike does with each email

| What AppViewX sends | What Spike does |
| --- | --- |
| Expiry alert for a certificate | Opens an incident and pages |
| The same alert again for the same certificate | Adds to the incident already open, no new page |
| 0-10 day alert with a subject containing "Critical" | Opens its own incident, titled with a `Critical:` prefix |

AppViewX sends no recovery email, so Spike cannot resolve these incidents on its own. Resolve the incident in Spike once the certificate is renewed.

{% hint style="info" %}
The incident title is short and names the certificate, for example **Certificate for shop.acme.com expires soon**. The common name is read from the `Common Name` line of the email body, or from the subject when the body does not have one. The full email, including the serial number and the expiry date, is kept in the incident details.
{% endhint %}

## Set up the integration

### Step 1: Create the integration in Spike

From the header, click [Add integration](https://app.spike.sh/integrations/new), select **AppViewX**, give it a name and create the integration.

### Step 2: Copy the email address

Copy the unique email address from the integration page. It looks like `9f3c2a71be04d58e6a17@email-hooks.spike.sh`.

### Step 3: Configure SMTP in AppViewX

AppViewX sends mail through the SMTP server you configure, so that comes first. In the AppViewX console, open the SMTP / email server settings and enter your mail server details. The **From** address you set here is the sender Spike shows in the incident details. Skip this step if AppViewX already sends email for you.

### Step 4: Add the Spike address to the expiry alert

In AppViewX, open the certificate expiry notification (the **Expiry Alert**) and add the Spike email address to its **To** recipients. Keep any existing recipients. Use AppViewX's recommended template for the body, because Spike reads the `Common Name` line from it:

```
Certificate with Common Name <common name>
Serial number <serial number>
issued by <issuer>
is about to expire on <mm/dd/yyyy>
```

The only required field is the recipient address. Spike also uses the subject and body when AppViewX provides them, and builds the title from them.

### Step 5: Test it

Send a test expiry alert, or wait for the next scheduled one, and check that an incident appears in Spike.

## What AppViewX sends

Spike receives the email as these fields:

```json
{
  "to": "9f3c2a71be04d58e6a17@email-hooks.spike.sh",
  "from": "AppViewX Alerts <appviewx-alerts@acme.com>",
  "subject": "Expiry Alert :: shop.acme.com certificate is expiring on 11/07/2026",
  "text": "Certificate with Common Name shop.acme.com\nSerial number 0A1B2C3D4E5F60718293A4B5C6D7E8F9\nissued by DigiCert Global G2 TLS RSA SHA256 2020 CA1\nis about to expire on 11/07/2026\n",
  "html": "<p>Certificate with Common Name shop.acme.com<br>Serial number 0A1B2C3D4E5F60718293A4B5C6D7E8F9<br>issued by DigiCert Global G2 TLS RSA SHA256 2020 CA1<br>is about to expire on 11/07/2026</p>",
  "envelope": "{\"to\":[\"9f3c2a71be04d58e6a17@email-hooks.spike.sh\"],\"from\":\"appviewx-alerts@acme.com\"}"
}
```

| Field | Required | Used for |
| --- | --- | --- |
| `to` | Yes | The part before `@` selects your integration |
| `envelope` | No | Its `to` list is also matched, so forwarded mail still reaches the integration |
| `subject` | No | Title fallback when the body has no common name, and always kept in the details |
| `text` | No | Plain-text body, read first for the common name |
| `html` | No | Used when `text` is empty, and kept in the details |
| `from` | No | Kept in the details |

If the email has no usable subject or body, the incident is titled **AppViewX alert with no details**.

## Good to know

{% hint style="warning" %}
* Two certificates with the same common name share one title. A new alert for one is added to the incident already open for the other, so resolve the incident once the certificate is renewed.
* Bulk-mode alerts send the certificate list as an attachment. Their title is the subject, for example **Expiry Alert :: Certificates expiring in next 30 days**.
* If you edit the AppViewX template and remove the `Common Name` line, the title falls back to the subject.
{% endhint %}
