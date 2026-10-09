---
description: >-
  Send Reveille Monitor Status Emails to Spike so a failing Reveille monitor pages your on-call rotation, and resolves its incident when the monitor reports success.
---

# Integrate Spike with Reveille

[Reveille](https://www.reveillesoftware.com) monitors applications such as OnBase and Epic from a Local Monitor Server. Its Monitor Status Email utility mails a message when a monitor's checks fail and another when they pass.

Reveille has no webhook, so this integration uses Spike's [email integration](integrate-spike-with-email.md). Point the Monitor Status Email at your Spike email address and a failing monitor pages your on-call rotation. The incident resolves itself when the same monitor sends its success email.

## How Spike reads the email

Spike reads the email's **subject** and **body**. How you word the subject decides whether incidents resolve.

| Subject ends with | Spike treats it as |
| --- | --- |
| `FAILED` | A failure. It opens an incident, or joins the one already open for that monitor. |
| `SUCCESSFUL` | A recovery. It resolves the open incident for that monitor. |
| Neither word | A failure that never resolves on its own. |

A dash may sit before the word: `-`, `–` and `—` are all accepted, and case is ignored.

Spike identifies the monitor by the subject with that trailing dash and word removed, with whitespace collapsed and lowercase. `OnBase Production CHECK – FAILED` and `OnBase Production CHECK – SUCCESSFUL` both give `onbase production check`, so the success email resolves the incident the failure opened. Each monitor therefore needs its own subject, and its failure and success subjects must differ only in that last word.

{% hint style="warning" %}
The `FAILED` and `SUCCESSFUL` words are not something Reveille adds. You set them yourself in the Monitor Status Email's error and no-error subjects (Step 2). Any other wording opens incidents but will not resolve them.
{% endhint %}

## Incident title

The title is the first non-empty line of the email body. That is the message you set for the error case, so write a sentence that says what is wrong and names the system:

```
OnBase Production check failed: the following items need to be addressed.
```

If the body is empty, the subject is the title. If both are empty, the title is `Reveille alert with no details`. A recovery email is titled with its subject, for example `OnBase Production CHECK – SUCCESSFUL`. The status table that follows the first line is kept on the incident page and is not part of the title.

Matching uses the monitor name taken from the subject, not the title, so the title can change between cycles without opening a second incident. Titles are capped at 200 characters.

{% hint style="info" %}
Reveille's own default message, `The following items need to be addressed.`, names neither the system nor the fault. Replace it with a sentence that does.
{% endhint %}

## Prerequisites

* A Reveille Local Monitor Server where you can edit the **Alerts** tab and the Monitor Status Email settings
* Permission to set the mail server and the From address Reveille sends with
* A Spike email integration and its address

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Reveille**, attach it to a service and an escalation policy, and copy the email address. It looks like `<your-token>@email-hooks.spike.sh`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Configure the Monitor Status Email in Reveille

1. **Open the Local Monitor Server** and go to the **Alerts** tab. Set the mail server and the sender address Reveille sends from. That address shows as `from` on the incident page. Spike does not use it for routing.

2. **Open the Monitor Status Email settings** for the monitor and add the Spike address from Step 1 as a recipient.

3. **Set the subjects.** Both are required for auto-resolve:
   * **SubjectError** — `<Monitor name> CHECK – FAILED`
   * **SubjectNoError** — `<Monitor name> CHECK – SUCCESSFUL`

   Use the same monitor name in both, for example `OnBase Production CHECK – FAILED` and `OnBase Production CHECK – SUCCESSFUL`.

4. **Set the messages.**
   * **MessageError** — one sentence that names the system and what failed, for example `OnBase Production check failed: the following items need to be addressed.` It must be the first line of the body, because it becomes the incident title.
   * **MessageNoError** — for example `No action needed at this time.`

5. **Repeat for each monitor,** with a different monitor name in each subject.

6. **Save,** then run the Monitor Status Email once so the first failure and success emails are sent.

## Step 3 — Confirm it end to end

You can send Spike a test email yourself using this example. The fields below are what Spike receives from the email.

A failure:

```json
{
  "to": "ced6f1c82327db079e3f@email-hooks.spike.sh",
  "from": "Reveille Monitor <reveille@stmarys-health.org>",
  "subject": "OnBase Production CHECK – FAILED",
  "text": "OnBase Production check failed: the following items need to be addressed.\n\nGroup: OnBase\nMonitor: OnBase Production\nResource: ONBAPP02\nTest: Unity Scheduler Service\nStatus: Error\nLog Message: Service 'Hyland Unity Scheduler' is Stopped\nMonitor Last Cycle Time: 10/9/2026 3:12:04 AM",
  "html": "<p>OnBase Production check failed: the following items need to be addressed.</p><table><tr><th>Group</th><th>Monitor</th><th>Resource</th><th>Test</th><th>Status</th><th>Log Message</th><th>Monitor Last Cycle Time</th></tr><tr><td>OnBase</td><td>OnBase Production</td><td>ONBAPP02</td><td>Unity Scheduler Service</td><td>Error</td><td>Service 'Hyland Unity Scheduler' is Stopped</td><td>10/9/2026 3:12:04 AM</td></tr></table>",
  "envelope": "{\"to\":[\"ced6f1c82327db079e3f@email-hooks.spike.sh\"],\"from\":\"reveille@stmarys-health.org\"}"
}
```

It opens an incident on the service you attached, titled with the first line of the body.

A recovery:

```json
{
  "to": "ced6f1c82327db079e3f@email-hooks.spike.sh",
  "from": "Reveille Monitor <reveille@stmarys-health.org>",
  "subject": "OnBase Production CHECK – SUCCESSFUL",
  "text": "No action needed at this time.",
  "html": "<p>No action needed at this time.</p>",
  "envelope": "{\"to\":[\"ced6f1c82327db079e3f@email-hooks.spike.sh\"],\"from\":\"reveille@stmarys-health.org\"}"
}
```

It resolves the incident above, because both subjects reduce to `onbase production check`.

Check three things:

1. A failure email opens an incident with your `MessageError` sentence as its title.
2. The next failure email from the same monitor lands on that incident without paging again.
3. The success email resolves it.

## Things worth knowing

* **A failure email that repeats** joins the open incident. How often Reveille repeats it depends on how you schedule the Monitor Status Email.
* **A per-error email** from Reveille's Error Maintenance notifications has no `FAILED` or `SUCCESSFUL` word. Spike treats it as a failure keyed on its whole subject, and it never resolves on its own. Resolve those in Spike.
* **Several monitors** can share one Spike integration, because the subject separates them. Use a different integration per team if different teams own them.
* **A resolved incident is not reopened** by a late failure for the same monitor. The next failure email opens a new incident.
* Email integrations have a 30 MB payload limit.

## Troubleshooting

<details>

<summary>Incidents open but never resolve</summary>

Check the subjects on the two emails. The success subject must end with `SUCCESSFUL`, the failure subject with `FAILED`, and everything before that word must be identical. The dash before the word may differ, but the monitor name may not. Also confirm Reveille actually sends the success email.

</details>

<details>

<summary>The dash looks wrong in the subject</summary>

Some mail relays rewrite the en dash. Spike accepts `-`, `–` and `—`, so the match still works as long as the word at the end is intact.

</details>

<details>

<summary>The title is vague</summary>

The title is your `MessageError` sentence. If it reads `The following items need to be addressed.`, change it to say which system failed.

</details>

<details>

<summary>An incident titled "Reveille alert with no details" opened</summary>

The email had neither a subject nor a body. Check the Monitor Status Email settings in Step 2.

</details>

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Spike address is a recipient of the Monitor Status Email and that the Local Monitor Server can send mail to the outside. Test by sending a message to the address from any mail client.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of Reveille Software.
