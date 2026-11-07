---
description: >-
  Send Reveille Monitor Status Emails and status Metric notifications to Spike so a failing Reveille monitor pages your on-call rotation, and resolves its incident when the monitor reports success.
---

# Integrate Spike with Reveille

[Reveille](https://www.reveillesoftware.com) monitors content services (ECM) platforms. Its [Monitor Status Email](https://www.reveillesoftware.com/sw/doc/hlp/Content/admin_console/Monitor%20Status%20Email%20Utility/Monitor_Status_Email_Template.html) utility mails a status email with an error subject and message when a monitor's checks fail, and a no-error subject and message when they pass.

Reveille has no webhook, so this integration uses Spike's [email integration](integrate-spike-with-email.md). Point the Monitor Status Email at your Spike email address and a failing monitor pages your on-call rotation. The incident resolves itself when the same monitor sends its success email.

## How Spike reads the email

Spike reads the email's **subject** and **body**. How you word the subject decides whether incidents resolve.

The last outcome word in the subject, case ignored, decides the status:

| Subject's last outcome word | Spike treats it as |
| --- | --- |
| `FAILED`, `FAILURE`, `ERROR`, `WARNING` | A failure. It opens an incident, or joins the one already open for that monitor. |
| `SUCCESSFUL`, `SUCCESS`, `SUCCEEDED`, `PASSED` | A recovery. It resolves the open incident for that monitor, and is dropped when nothing is open. |
| None of these | A failure. |

Spike identifies the monitor by an `alertKey` built from the subject: lowercased, whitespace collapsed, with the outcome words and stand-alone separators (`-`, `–`, `—`, `:`) removed. `OnBase-Prod CHECK – FAILED` and `OnBase-Prod CHECK – SUCCESSFUL` both give `onbase-prod check`, so the success email resolves the incident the failure opened. Each monitor therefore needs its own subject, and its failure and success subjects must differ only in the outcome word and the separator.

{% hint style="warning" %}
The `FAILED` and `SUCCESSFUL` words are not something Reveille adds. You set them yourself in the Monitor Status Email's error and no-error subjects (Step 2). Any other wording opens incidents but will not resolve them.
{% endhint %}

If the subject gives no usable `alertKey`, Spike matches by title instead. That happens when the subject is empty, holds only outcome words, or still holds an unexpanded variable such as `$name`, `${name}`, `{{name}}`, `%name%` or `<%=name%>`. A variable that was not replaced is never treated as a monitor name. Every email without a usable key is titled `Reveille monitor check failed`, so they all join the same open incident, whichever monitor sent them, and none of them resolves automatically: the matching success email is titled `Reveille monitor check successful`, which never matches. Resolve these in Spike, and give every monitor a real name in its subjects.

## Incident title

The title is the first line of the email body that is not blank, a greeting, or the status table's heading row. That line is the message you set for the error case, so write a sentence that says what is wrong and names the system:

```
OnBase production checks failed on OnBase-Prod: the Unity Scheduler is down and DIP imports are backing up.
```

URLs are removed, whitespace is collapsed, and the title is cut at a word boundary to 200 characters. The status table's rows are never read for the title. If the body has no such line (for example, it holds only the status table), the subject is the title (`OnBase-Prod CHECK – FAILED`), cut to 200 characters. If both are empty, the title is `Reveille alert with no details`.

A recovery email is titled the same way, from its first line, for example `OnBase production checks on OnBase-Prod are back to normal. No action needed at this time.`

When the subject gives no usable `alertKey`, the title is fixed so a repeat matches: `Reveille monitor check failed` for a failure and `Reveille monitor check successful` for a success. These two differ, so a recovery without a usable subject does not close a failure without one. Keep a real monitor name in both subjects.

The status table that follows the first line (Group, Monitor, Resource, Test, Status, Log Message, Monitor Last Cycle Time) is kept on the incident page and is not part of the title. If the email has only an HTML part, Spike converts it to text and reads the same line.

Matching uses the `alertKey`, not the title, so the title and table can change between cycles without opening a second incident.

{% hint style="info" %}
Write `MessageError` as a sentence that names the system and the fault: it is what responders read.
{% endhint %}

## Prerequisites

* A Reveille installation where you can edit the Monitor Status Email template and run `ReveilleMonitorStatus.exe`
* A Spike email integration and its address

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Reveille**, attach it to a service and an escalation policy, and copy the email address. It looks like `<your-token>@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Configure the Monitor Status Email in Reveille

Reveille sends this email with `ReveilleMonitorStatus.exe`, configured by its [Monitor Status Email template](https://www.reveillesoftware.com/sw/doc/hlp/Content/admin_console/Monitor%20Status%20Email%20Utility/Monitor_Status_Email_Template.html). In the template:

1. **Add the Spike address** from Step 1 as a recipient of the email.

2. **Set the subjects.** Both are required for auto-resolve:
   * `SubjectError` — `<Monitor name> CHECK – FAILED`
   * `SubjectNoError` — `<Monitor name> CHECK – SUCCESSFUL`

   Use the same monitor name in both, for example `OnBase-Prod CHECK – FAILED` and `OnBase-Prod CHECK – SUCCESSFUL`. These are the template's own sample subjects with your monitor's name.

3. **Set the messages:**
   * `MessageError` — one sentence that names the system and what failed, for example `OnBase production checks failed on OnBase-Prod: the Unity Scheduler is down.` It becomes the incident title.
   * `MessageNoError` — for example `OnBase production checks on OnBase-Prod are back to normal. No action needed at this time.`

4. **Set `OnlySendOnError` to false.** With it true, Reveille never sends the no-error email and incidents stay open until you resolve them in Spike.

5. **Run `ReveilleMonitorStatus.exe`** once so the first email is sent, then keep running it as you run your other Monitor Status Emails. Use one template, with its own subjects, for each monitor name you want as a separate incident.

## Status Metric notifications

Reveille documents one notification message field for field, the [status Metric](https://www.reveillesoftware.com/sw/doc/hlp/Content/admin_console/Scorecard%20Metrics/Understanding%20Status%20Metrics.html) message:

```
<Metric><Status Metric Name>=<test status>;Monitor=<Monitor Name>;Resource=<Resource Name>;Test=<Test Number></Metric>
```

where `<test status>` is one of `Severity1 = 9`, `Severity2 = 8`, `Severity3 = 7`, `Severity4 = 6`, `Bad = 5`, `Warning = 4` or `Good = 3`. When an email to your Spike address carries this message, in its subject or body, as the word or as the number, Spike:

* titles the incident `<name> is <status> on <monitor> / <resource>, test <n>`, for example `MonitorTest is Bad on OnBase-Prod / OnBase-AppServer-01, test 0`;
* keys it on the metric name, monitor, resource and test, so each test is its own incident and a repeat joins it;
* resolves it when the same metric, monitor, resource and test reports `Good`, and drops a `Good` with nothing open;
* sets the incident's severity from `Severity1`, `Severity2`, `Severity3` and `Warning` (SEV1, SEV2, SEV3 and SEV2). `Severity4` and `Bad` open an incident with no severity.

Reveille sends notifications to the people and support groups a test notifies ([Notify Support Group tab](https://www.reveillesoftware.com/sw/doc/hlp/Content/admin_console/Tests/Notify%20Support%20Group%20tab.html)); an employee profile has an **Email Address** and **Notify On** choices for Warning, Bad and Severity 1–4, plus **Notify When Available** ([Reveille's PagerDuty guide](https://reveillesoftware.com/sw/doc/PagerDuty/Reveille_PagerDuty_Integration_Documentation.pdf), page 4). Reveille does not document the email it sends to an employee's address, so test one: an email that carries neither the status Metric message nor a Monitor Status Email subject is handled as described under Things worth knowing.

## Step 3 — Confirm it end to end

You can send Spike a test email yourself using this example. The fields below are what Spike receives from the email.

A failure:

```json
{
  "to": "7c41e9a2d05b4f3e8a61@email-hooks.spike.sh",
  "from": "Reveille Monitoring <reveille-alerts@northwind-insurance.com>",
  "subject": "OnBase-Prod CHECK – FAILED",
  "text": "OnBase production checks failed on OnBase-Prod: the Unity Scheduler is down and DIP imports are backing up.\n\nGroup | Monitor | Resource | Test | Status | Log Message | Monitor Last Cycle Time\nAlpharetta | OnBase-Prod | OnBase-AppServer-01 | 0 | Bad | Hyland Unity Scheduler service is not running | 10/13/2026 3:02:14 AM\nAlpharetta | OnBase-Prod | OnBase-DIP-Import | 2 | Warning | 412 documents waiting in the import folder for 35 minutes | 10/13/2026 3:02:14 AM",
  "html": "<p>OnBase production checks failed on OnBase-Prod: the Unity Scheduler is down and DIP imports are backing up.</p><table border=\"1\"><tr><th>Group</th><th>Monitor</th><th>Resource</th><th>Test</th><th>Status</th><th>Log Message</th><th>Monitor Last Cycle Time</th></tr><tr style=\"background-color:#f8d7da\"><td>Alpharetta</td><td>OnBase-Prod</td><td>OnBase-AppServer-01</td><td>0</td><td>Bad</td><td>Hyland Unity Scheduler service is not running</td><td>10/13/2026 3:02:14 AM</td></tr><tr style=\"background-color:#fff3cd\"><td>Alpharetta</td><td>OnBase-Prod</td><td>OnBase-DIP-Import</td><td>2</td><td>Warning</td><td>412 documents waiting in the import folder for 35 minutes</td><td>10/13/2026 3:02:14 AM</td></tr></table>",
  "envelope": "{\"to\":[\"7c41e9a2d05b4f3e8a61@email-hooks.spike.sh\"],\"from\":\"reveille-alerts@northwind-insurance.com\"}"
}
```

It opens an incident on the service you attached, titled `OnBase production checks failed on OnBase-Prod: the Unity Scheduler is down and DIP imports are backing up.`

A recovery:

```json
{
  "to": "7c41e9a2d05b4f3e8a61@email-hooks.spike.sh",
  "from": "Reveille Monitoring <reveille-alerts@northwind-insurance.com>",
  "subject": "OnBase-Prod CHECK – SUCCESSFUL",
  "text": "OnBase production checks on OnBase-Prod are back to normal. No action needed at this time.\n\nGroup | Monitor | Resource | Test | Status | Log Message | Monitor Last Cycle Time\nAlpharetta | OnBase-Prod | OnBase-AppServer-01 | 0 | Good | Hyland Unity Scheduler service is running | 10/13/2026 3:32:09 AM\nAlpharetta | OnBase-Prod | OnBase-DIP-Import | 2 | Good | 0 documents waiting in the import folder | 10/13/2026 3:32:09 AM",
  "html": "<p>OnBase production checks on OnBase-Prod are back to normal. No action needed at this time.</p><table border=\"1\"><tr><th>Group</th><th>Monitor</th><th>Resource</th><th>Test</th><th>Status</th><th>Log Message</th><th>Monitor Last Cycle Time</th></tr><tr style=\"background-color:#d4edda\"><td>Alpharetta</td><td>OnBase-Prod</td><td>OnBase-AppServer-01</td><td>0</td><td>Good</td><td>Hyland Unity Scheduler service is running</td><td>10/13/2026 3:32:09 AM</td></tr><tr style=\"background-color:#d4edda\"><td>Alpharetta</td><td>OnBase-Prod</td><td>OnBase-DIP-Import</td><td>2</td><td>Good</td><td>0 documents waiting in the import folder</td><td>10/13/2026 3:32:09 AM</td></tr></table>",
  "envelope": "{\"to\":[\"7c41e9a2d05b4f3e8a61@email-hooks.spike.sh\"],\"from\":\"reveille-alerts@northwind-insurance.com\"}"
}
```

It resolves the incident above, because both subjects reduce to the `alertKey` `onbase-prod check`.

Check three things:

1. A failure email opens an incident with your `MessageError` sentence as its title.
2. A repeat failure email from the same monitor, with different table rows, lands on that incident without paging again.
3. The success email resolves it.

## Things worth knowing

* **A failure email that repeats** joins the open incident. How often Reveille repeats it depends on how you schedule the Monitor Status Email.
* **Any other Reveille email**, whose format Reveille does not document, is read like a Monitor Status Email: keyed on its subject without outcome words, and a failure unless the subject's last outcome word is a success word. If such a recovery email (for example from **Notify When Available**) has no success word, it opens an incident; leave that option off for the Spike address unless its emails carry the status Metric message.
* **Several monitors** can share one Spike integration, because the subject separates them. Use a different integration per team if different teams own them.
* **A failure after a recovery** reopens the monitor's resolved incident, under the same incident number, and pages again.
* Email integrations have a 30 MB payload limit.

## Troubleshooting

<details>

<summary>Incidents open but never resolve</summary>

Check the subjects on the two emails. The success subject must carry a success word (`SUCCESSFUL`, `SUCCESS`, `SUCCEEDED` or `PASSED`), the failure subject a failure word, and everything else must be identical. The separator may differ, but the monitor name may not. Reveille sends the success email only when `OnlySendOnError` is false; with it true, incidents never auto-resolve.

</details>

<details>

<summary>The dash looks wrong in the subject</summary>

Some mail relays rewrite the en dash. Spike ignores stand-alone `-`, `–`, `—` and `:` when it builds the key, so the match still works as long as the outcome word is intact.

</details>

<details>

<summary>The title is vague</summary>

The title is your `MessageError` sentence. Change it to say which system failed and how.

</details>

<details>

<summary>An incident titled "Reveille alert with no details" opened</summary>

The email had neither a subject nor a body line. Check the subjects and messages in Step 2.

</details>

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Spike address is a recipient in the template you run and that the server running `ReveilleMonitorStatus.exe` can send mail to the outside. Test by sending a message to the address from any mail client.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Reveille Software.
