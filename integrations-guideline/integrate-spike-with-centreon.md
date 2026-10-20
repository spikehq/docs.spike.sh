---
description: >-
  Send Centreon host and service notifications to Spike so a problem pages your on-call rotation and the incident resolves itself when Centreon reports the recovery.
---

# Integrate Spike with Centreon

[Centreon](https://www.centreon.com) is an IT infrastructure monitoring platform built on Centreon Engine. It runs checks on your hosts and services and tells people through notification commands.

A notification command can run any shell command, so you can make it post to a Spike integration URL. A problem on a host or a service then pages your on-call rotation, repeat notifications for the same alert land on the incident already open, and the recovery notification resolves it.

### Service and Integration

Make sure to make a Centreon integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## What to send

Centreon expands `$MACRO$` placeholders in the command line before running it. You need two commands: one for service notifications and one for host notifications. Each sends the fields below with a `POST`, as a form body (`--data-urlencode`). Spike reads it as the JSON object shown. A form body is used on purpose: Centreon puts plugin output and host aliases into the command unescaped, and a backslash (a Windows path such as `C:\`) or a quote in a JSON string would make the body invalid and lose the notification.

The service notification body:

```json
{
  "notification_type": "PROBLEM",
  "host_name": "srv-db-01",
  "host_alias": "Primary PostgreSQL server",
  "host_address": "10.20.0.15",
  "host_state": "UP",
  "service_description": "Disk-/var",
  "service_state": "CRITICAL",
  "service_state_type": "HARD",
  "service_output": "CRITICAL: Storage /var Usage Total: 50.00 GB Used: 48.10 GB (96.20%) Free: 1.90 GB (3.80%)",
  "severity": "CRITICAL",
  "problem_id": "48213",
  "notification_number": "1",
  "notification_author": "",
  "notification_comment": "",
  "timestamp": "1760342400"
}
```

In your command each field is sent as its matching macro, for example `--data-urlencode "host_name=$HOSTNAME$"`.

| Field | Macro | Used for |
| --- | --- | --- |
| `notification_type` | `$NOTIFICATIONTYPE$` | **Required.** `PROBLEM` opens an incident. `RECOVERY` resolves it. See [below](#what-spike-does-with-each-notification). |
| `host_name` | `$HOSTNAME$` | **Required.** The host's short name. It identifies the alert and is always in the title. |
| `host_alias` | `$HOSTALIAS$` | The host's long name. Used in the title only when `host_name` is missing. |
| `host_address` | `$HOSTADDRESS$` | Used in the title only when `host_name` and `host_alias` are missing. |
| `host_state` | `$HOSTSTATE$` | `UP`, `DOWN` or `UNREACHABLE`. Information on a service notification. |
| `service_description` | `$SERVICEDESC$` | **Required for service notifications.** The service's name. It identifies the alert together with `host_name`. |
| `service_state` | `$SERVICESTATE$` | **Required for service notifications.** `OK`, `WARNING`, `CRITICAL` or `UNKNOWN`. `OK` means recovered when `notification_type` is not a known word. |
| `service_state_type` | `$SERVICESTATETYPE$` | `HARD` or `SOFT`. For alert rules only. |
| `service_output` | `$SERVICEOUTPUT$` | The first line of the plugin's output. It is the incident title. |
| `severity` | `$SERVICESTATE$` | The state word again. Spike maps `CRITICAL` to sev1, `WARNING` to sev2 and `UNKNOWN` or `OK` to sev3. |
| `problem_id` | `$SERVICEPROBLEMID$` | Shown on the incident page. Centreon sets it to `0` when the service is OK. |
| `notification_number` | `$SERVICENOTIFICATIONNUMBER$` | Counts re-notifications. Shown on the incident page. |
| `notification_author` | `$NOTIFICATIONAUTHOR$` | Who acknowledged or scheduled downtime. Empty on a problem or a recovery. |
| `notification_comment` | `$NOTIFICATIONCOMMENT$` | The acknowledgement or downtime comment. |
| `timestamp` | `$TIMET$` | Unix seconds when the notification ran. Shown on the incident page. |

On a recovery Centreon sends the same fields, with the state back to `OK` and the problem id at `0`:

```json
{
  "notification_type": "RECOVERY",
  "host_name": "srv-db-01",
  "host_alias": "Primary PostgreSQL server",
  "host_address": "10.20.0.15",
  "host_state": "UP",
  "service_description": "Disk-/var",
  "service_state": "OK",
  "service_state_type": "HARD",
  "service_output": "OK: Storage /var Usage Total: 50.00 GB Used: 31.40 GB (62.80%) Free: 18.60 GB (37.20%)",
  "severity": "OK",
  "problem_id": "0",
  "notification_number": "0",
  "notification_author": "",
  "notification_comment": "",
  "timestamp": "1760346000"
}
```

The host notification body leaves out `service_description`, `service_state`, `service_state_type` and `service_output`, and adds `host_output` and `host_state_type`. `severity` carries `$HOSTSTATE$`, `problem_id` carries `$HOSTPROBLEMID$` and `notification_number` carries `$HOSTNOTIFICATIONNUMBER$`:

```json
{
  "notification_type": "PROBLEM",
  "host_name": "srv-web-01",
  "host_alias": "Public web server",
  "host_address": "10.20.0.21",
  "host_state": "DOWN",
  "host_state_type": "HARD",
  "host_output": "CRITICAL: Packets lost: 100%",
  "severity": "DOWN",
  "problem_id": "1195",
  "notification_number": "1",
  "notification_author": "",
  "notification_comment": "",
  "timestamp": "1760342400"
}
```

Do not add a field called `message`: Spike would use it as the title and ignore the rest.

## Setup

#### Step 1: Create the notification commands

In Centreon go to **Configuration** -> **Commands** -> **Notifications** and click **Add**. Create two commands. For each, fill in:

* **Command Name**: `Notify Spike service` for the first, `Notify Spike host` for the second.
* **Command Type**: `Notification`
* **Command Line**: the matching command below, with your webhook URL.
* Tick **Enable shell**, so the quoting in the command line is interpreted.

Service command line:

```
/usr/bin/curl -s -m 10 -X POST --data-urlencode "notification_type=$NOTIFICATIONTYPE$" --data-urlencode "host_name=$HOSTNAME$" --data-urlencode "host_alias=$HOSTALIAS$" --data-urlencode "host_address=$HOSTADDRESS$" --data-urlencode "host_state=$HOSTSTATE$" --data-urlencode "service_description=$SERVICEDESC$" --data-urlencode "service_state=$SERVICESTATE$" --data-urlencode "service_state_type=$SERVICESTATETYPE$" --data-urlencode "service_output=$SERVICEOUTPUT$" --data-urlencode "severity=$SERVICESTATE$" --data-urlencode "problem_id=$SERVICEPROBLEMID$" --data-urlencode "notification_number=$SERVICENOTIFICATIONNUMBER$" --data-urlencode "notification_author=$NOTIFICATIONAUTHOR$" --data-urlencode "notification_comment=$NOTIFICATIONCOMMENT$" --data-urlencode "timestamp=$TIMET$" "YOUR_SPIKE_WEBHOOK_URL"
```

Host command line:

```
/usr/bin/curl -s -m 10 -X POST --data-urlencode "notification_type=$NOTIFICATIONTYPE$" --data-urlencode "host_name=$HOSTNAME$" --data-urlencode "host_alias=$HOSTALIAS$" --data-urlencode "host_address=$HOSTADDRESS$" --data-urlencode "host_state=$HOSTSTATE$" --data-urlencode "host_state_type=$HOSTSTATETYPE$" --data-urlencode "host_output=$HOSTOUTPUT$" --data-urlencode "severity=$HOSTSTATE$" --data-urlencode "problem_id=$HOSTPROBLEMID$" --data-urlencode "notification_number=$HOSTNOTIFICATIONNUMBER$" --data-urlencode "notification_author=$NOTIFICATIONAUTHOR$" --data-urlencode "notification_comment=$NOTIFICATIONCOMMENT$" --data-urlencode "timestamp=$TIMET$" "YOUR_SPIKE_WEBHOOK_URL"
```

Click **Save**. Use the absolute path to `curl` that `which curl` shows on your Centreon poller.

#### Step 2: Use the commands in your contact

Go to **Configuration** -> **Users** -> **Contacts / Users** and open the contact that should send to Spike, or add one. Under **Notifications**:

* Enable host notifications and select `Notify Spike host` in **Host Notification Commands**.
* Enable service notifications and select `Notify Spike service` in **Service Notification Commands**.
* Set the notification options so that **Down**, **Unreachable** and **Recovery** (hosts) and **Warning**, **Critical**, **Unknown** and **Recovery** (services) are ticked. Without Recovery the incident never resolves.

Make sure the contact is attached to the hosts and services you want to page for, directly or through a contact group, and that notifications are enabled on those hosts and services.

#### Step 3: Export the configuration

Go to **Configuration** -> **Pollers** -> **Export configuration**, select your poller, and export with **Move Export Files** and **Restart** (or **Reload**) selected.

#### Step 4: Test

On **Monitoring** -> **Status Details** -> **Services**, open a service and use **Submit result** to set it to `Critical`. The incident should appear in Spike. Submit `OK` to see it resolve.

## What Spike does with each notification

| `notification_type` | Result |
| --- | --- |
| `PROBLEM` | Opens an incident. |
| `RECOVERY` | Resolves the open incident for the same check. Dropped when nothing is open. |
| `ACKNOWLEDGEMENT`, `FLAPPINGSTART`, `FLAPPINGSTOP`, `FLAPPINGDISABLED`, `DOWNTIMESTART`, `DOWNTIMEEND`, `DOWNTIMECANCELLED`, `CUSTOM` | Joins the open incident. Dropped when nothing is open. |

The type is compared ignoring case and surrounding spaces. When it is missing, unexpanded or not one of these words, the state decides: a service `OK` or a host `UP` is a recovery, and any other state (or none) opens an incident.

## Incident identity

Spike identifies the alert by `host_name`, and for a service check also by `service_description`. A service check is a notification with a `service_description` or `service_state`. Repeat notifications, including a move from `WARNING` to `CRITICAL`, join the open incident, and a recovery resolves it. A host check only matches host incidents, never a service incident on the same host.

Names are compared exactly as sent, including case. A value left as an unexpanded variable (`$HOSTNAME$`, `${host_name}`, `{{host_name}}`, `%HOSTNAME%` and similar) or an empty one does not count as a name. If a notification has no usable name, Spike falls back to matching on the title.

## Incident title

With a usable identity the title is the check's output followed by the host:

```
CRITICAL: Storage /var Usage Total: 50.00 GB Used: 48.10 GB (96.20%) Free: 1.90 GB (3.80%) on srv-db-01
```

For a host check the output is `host_output`, for example `CRITICAL: Packets lost: 100% on srv-web-01`. Whitespace in the output is collapsed, and ` on <host_name>` is left out when the output already names the host as a whole word.

When the output is empty or unexpanded, the title is `Disk-/var on srv-db-01 is CRITICAL` for a service and `Host srv-web-01 is DOWN` for a host. A recovery reads `Disk-/var on srv-db-01 is OK` or `Host srv-web-01 is UP`, never with the output.

Without a usable identity the title holds only stable fields, so a repeat still matches: `Disk-/var on Primary PostgreSQL server` (the service description, then `host_name`, else `host_alias`, else `host_address`). A part that is not usable is skipped, and `Centreon alert with no details` is used when none is. It never contains output, state or numbers.

Titles are cut to 200 characters. The ` on <host>` part is kept whole and the output is cut at a word boundary with `...`.

{% hint style="warning" %}
The commands are built so that a backslash or an apostrophe in a value (`C:\` in plugin output, `Bob's laptop` as a host alias) does not break the body. Each value sits inside double quotes for the shell, so a double quote, a backtick or a `$` inside a value (for example in `$HOSTALIAS$` or the acknowledgement comment, which Centreon does not clean) can still break the command. Keep those characters out of host aliases and comments. If an alert does not arrive, check the poller's notification log for the command that ran.
{% endhint %}
