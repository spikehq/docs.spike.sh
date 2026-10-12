---
description: >-
  Send AppViewX certificate expiry alert emails to Spike so an expiring certificate pages your on-call rotation by phone, SMS, Slack or Teams.
---

# Integrate Spike with AppViewX

[AppViewX](https://www.appviewx.com) manages the certificates your organisation relies on. It emails an expiry alert when a certificate is about to expire, so someone can renew it before a site or service breaks.

AppViewX alerts are emails, so the Spike AppViewX integration has an email address instead of a webhook URL. Add that address as a recipient of the AppViewX expiry alert and each alert pages your on-call rotation instead of waiting in a mailbox.

## What Spike does with each email

| What AppViewX sends | What Spike does |
| --- | --- |
| Expiry alert for a certificate | Opens an incident and pages |
| The same alert again for the same certificate (the next scheduled run) | Adds to the incident already open, no new page |
| A 0-10 day "Critical" alert whose body matches the routine one | Adds to the incident already open, no new page |

AppViewX sends no recovery email, so Spike cannot resolve these incidents on its own. Resolve the incident in Spike once the certificate is renewed.

{% hint style="info" %}
The incident title is the email body as AppViewX wrote it, with links removed and whitespace tidied, up to 200 characters. With the recommended template that reads **Certificate with Common Name shop.acme.com Serial number 0A1B2C3D4E5F60718293A4B5C6D7E8F9 issued by DigiCert Global G2 TLS RSA SHA256 2020 CA1 is about to expire on 11/07/2026**. When the body is empty the subject is the title. The full email is kept in the incident details.
{% endhint %}

## Set up the integration

### Step 1: Create the integration in Spike

From the header, click [Add integration](https://app.spike.sh/integrations/new), select **AppViewX**, give it a name and create the integration.

### Step 2: Copy the email address

Copy the unique email address from the integration page. It looks like `9f3c2a71be04d58e6a17@email-hooks.spike.sh`.

### Step 3: Make sure AppViewX can send email

AppViewX sends alerts through your organisation's mail server. If AppViewX already emails your team, nothing changes here; otherwise ask your AppViewX administrator to set up outbound email. The sender they configure is what Spike shows as `from` in the incident details.

### Step 4: Create an expiry alert that emails Spike

Your AppViewX role needs **Expiry Alerts** enabled under **Authorized Functions > CLM**, and its resource needs the **Cert_Expiry_Mail_Individual** and **Cert_Expiry_Mail_Bulk** workflow requests (**Access Control > Workflow Requests**).

1. Go to **Menu > CLM > ALERTS & LOGS > Expiry Alerts** and click **+ Create**.
2. Enter an **Alert Name**, then under **Alert Configuration** click **+ Add**.
3. Choose the **Certificate Type** and the **Certificate Expiry Period** the alert covers.
4. Set **Notification Method** to **Email** and turn on **Individual Alerts**, so each certificate gets its own email and its own incident. Turning on **Ignore renewed/regenerate certificate** stops alerts for a certificate once it is renewed.
5. Under **Email Configuration**, put the Spike address in **To** (keep any existing recipients), and use AppViewX's recommended subject and body:

```
Subject: Expiry Alert :: |Common Name| certificate| expiring on |Valid Until|

Certificate with Common Name |Common Name|
Serial number |Serial Number|
issued by |Issuer Common Name|
is about to expire on |Valid Until|
```

6. Click **Add**, choose **Schedule** (daily is typical) as the **Alert Execution Type**, and click **Save**.

The body becomes the incident title, and the scheduled run sends the same body about the same certificate each time, so the repeats join one incident.

### Step 5: Test it

Run the alert with **Run Now**, or wait for the next scheduled run, and check that an incident appears in Spike.

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
| `subject` | No | The title when the body is empty, and always kept in the details |
| `text` | No | The plain-text body, which is the title |
| `html` | No | Converted to text and used as the title when `text` is empty, and kept in the details |
| `from` | No | Kept in the details |

If the email has no usable subject or body, the incident is titled **AppViewX alert with no details**.

## Good to know

{% hint style="warning" %}
* Spike matches repeats on the title, so keep the body free of values that change between runs, such as a run timestamp. A changed body opens a new incident.
* Individual alerts include renewal and unsubscribe links. The links are removed from the title, but their text (for example "Renew certificate") stays in it.
* Bulk-mode alerts send the certificate list as an attachment. When their body is empty the title is the subject, for example **Expiry Alert :: Certificates expiring in next 30 days**.
{% endhint %}
