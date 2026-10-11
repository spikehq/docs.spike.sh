---
description: >-
  Send Centreon host and service notifications to Spike so a problem pages your on-call rotation and the incident resolves itself when Centreon reports the recovery.
---

# Integrate Spike with Centreon

[Centreon](https://www.centreon.com) is an IT infrastructure monitoring platform built on Centreon Engine. It runs checks on your hosts and services and tells people through notification commands.

A notification command can run any shell command, so you can make it post to a Spike integration URL. A problem on a host or a service then pages your on-call rotation, repeat notifications for the same problem land on the incident already open, and the recovery notification resolves it.

### Service and Integration

Make sure to make a Centreon integration and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## What to send

Centreon expands `$MACRO$` placeholders in the command line before running it. Send this body, field for field, as JSON with a `POST`:

```json
{
  "NOTIFICATIONTYPE": "PROBLEM",
  "HOSTNAME": "db-prod-03",
  "HOSTADDRESS": "10.20.4.13",
  "HOSTSTATE": "UP",
  "HOSTOUTPUT": "OK - 10.20.4.13 rta 0.412ms lost 0%",
  "HOSTPROBLEMID": "0",
  "LASTHOSTPROBLEMID": "1187",
  "SERVICEDESC": "Cpu",
  "SERVICESTATE": "CRITICAL",
  "SERVICEOUTPUT": "CRITICAL: CPU(s) average usage is 97.31 %",
  "SERVICEPROBLEMID": "48213",
  "LASTSERVICEPROBLEMID": "47950",
  "LONGDATETIME": "Sun Oct 11 03:12:44 CEST 2026"
}
```

In your command each value is the matching macro, for example `"NOTIFICATIONTYPE": "$NOTIFICATIONTYPE$"` and `"SERVICEPROBLEMID": "$SERVICEPROBLEMID$"`.

| Field | Macro | Used for |
| --- | --- | --- |
| `NOTIFICATIONTYPE` | `$NOTIFICATIONTYPE$` | **Required.** `PROBLEM` opens an incident. `RECOVERY` resolves it. |
| `HOSTNAME` | `$HOSTNAME$` | **Required.** The host, always in the title. |
| `HOSTADDRESS` | `$HOSTADDRESS$` | Incident details only. |
| `HOSTSTATE` | `$HOSTSTATE$` | `UP`, `DOWN` or `UNREACHABLE`. Used for host notifications. |
| `HOSTOUTPUT` | `$HOSTOUTPUT$` | The host check's output. |
| `HOSTPROBLEMID` | `$HOSTPROBLEMID$` | **Required for host notifications.** Identifies the host problem. |
| `LASTHOSTPROBLEMID` | `$LASTHOSTPROBLEMID$` | **Required for host recovery.** Carries the id of the problem that just cleared. |
| `SERVICEDESC` | `$SERVICEDESC$` | **Required for service notifications.** Empty means a host notification. |
| `SERVICESTATE` | `$SERVICESTATE$` | `OK`, `WARNING`, `CRITICAL` or `UNKNOWN`. |
| `SERVICEOUTPUT` | `$SERVICEOUTPUT$` | The service check's output. |
| `SERVICEPROBLEMID` | `$SERVICEPROBLEMID$` | **Required for service notifications.** Identifies the service problem. |
| `LASTSERVICEPROBLEMID` | `$LASTSERVICEPROBLEMID$` | **Required for service recovery.** Carries the id of the problem that just cleared. |
| `LONGDATETIME` | `$LONGDATETIME$` | Incident details only. |

On a recovery Centreon sends the same fields, with the state back to `OK` or `UP`, the current problem id at `0` and the cleared id in the `LAST...PROBLEMID` field:

```json
{
  "NOTIFICATIONTYPE": "RECOVERY",
  "HOSTNAME": "db-prod-03",
  "HOSTADDRESS": "10.20.4.13",
  "HOSTSTATE": "UP",
  "HOSTOUTPUT": "OK - 10.20.4.13 rta 0.398ms lost 0%",
  "HOSTPROBLEMID": "0",
  "LASTHOSTPROBLEMID": "1187",
  "SERVICEDESC": "Cpu",
  "SERVICESTATE": "OK",
  "SERVICEOUTPUT": "OK: CPU(s) average usage is 12.04 %",
  "SERVICEPROBLEMID": "0",
  "LASTSERVICEPROBLEMID": "48213",
  "LONGDATETIME": "Sun Oct 11 03:27:44 CEST 2026"
}
```

## Setup

Use the same command line for the host notification and the service notification. Centreon leaves the macros that do not apply empty, which is how Spike tells a host notification (`SERVICEDESC` empty) from a service one.

#### Step 1: Create the notification command

In Centreon go to **Configuration** -> **Commands** -> **Notifications** and click **Add**. Fill in:

* **Command Name**: `Notify Spike`
* **Command Type**: `Notification`
* **Command Line**: the command below, with your webhook URL.
* Tick **Enable shell**, so the quoting in the command line is interpreted.

```
/usr/bin/curl -s -m 10 -X POST -H "Content-Type: application/json" -d '{"NOTIFICATIONTYPE": "$NOTIFICATIONTYPE$", "HOSTNAME": "$HOSTNAME$", "HOSTADDRESS": "$HOSTADDRESS$", "HOSTSTATE": "$HOSTSTATE$", "HOSTOUTPUT": "$HOSTOUTPUT$", "HOSTPROBLEMID": "$HOSTPROBLEMID$", "LASTHOSTPROBLEMID": "$LASTHOSTPROBLEMID$", "SERVICEDESC": "$SERVICEDESC$", "SERVICESTATE": "$SERVICESTATE$", "SERVICEOUTPUT": "$SERVICEOUTPUT$", "SERVICEPROBLEMID": "$SERVICEPROBLEMID$", "LASTSERVICEPROBLEMID": "$LASTSERVICEPROBLEMID$", "LONGDATETIME": "$LONGDATETIME$"}' "YOUR_SPIKE_WEBHOOK_URL"
```

Click **Save**. Use the absolute path to `curl` that `which curl` shows on your Centreon poller.

#### Step 2: Use the command in your contact

Go to **Configuration** -> **Users** -> **Contacts / Users** and open the contact that should send to Spike, or add one. Under **Notifications**:

* Enable host notifications and select `Notify Spike` in **Host Notification Commands**.
* Enable service notifications and select `Notify Spike` in **Service Notification Commands**.
* Set the notification options so that **Down**, **Unreachable** and **Recovery** (hosts) and **Warning**, **Critical**, **Unknown** and **Recovery** (services) are ticked. Without Recovery the incident never resolves.

Make sure the contact is attached to the hosts and services you want to page for, directly or through a contact group, and that notifications are enabled on those hosts and services.

#### Step 3: Export the configuration

Go to **Configuration** -> **Pollers** -> **Export configuration**, select your poller, and export with **Move Export Files** and **Restart** (or **Reload**) selected.

#### Step 4: Test

On **Monitoring** -> **Status Details** -> **Services**, open a service and use **Submit result** to set it to `Critical`, or use a **Custom notification** from the host or service actions. The incident should appear in Spike. Submit `OK` to see it resolve.

## What Spike does with each notification

| `NOTIFICATIONTYPE` | Result |
| --- | --- |
| `PROBLEM` | Opens an incident. |
| `RECOVERY` | Resolves the incident whose problem id matches. Never opens one. |
| `ACKNOWLEDGEMENT`, `FLAPPINGSTART`, `FLAPPINGSTOP`, `FLAPPINGDISABLED`, `DOWNTIMESTART`, `DOWNTIMEEND`, `DOWNTIMECANCELLED` | Joins an open incident when an id matches. `FLAPPINGSTART` can open one. The others never do. |

## Incident identity

Spike identifies the incident by the problem id. For a service notification this is `SERVICEPROBLEMID`, which stays the same when the service goes from `WARNING` to `CRITICAL`. For a host notification (`SERVICEDESC` empty) it is `HOSTPROBLEMID`. A recovery carries the cleared id in `LASTSERVICEPROBLEMID` or `LASTHOSTPROBLEMID`, which Spike matches to the open incident. An id of `0` means "no problem" and is not used.

If a notification carries no usable id, Spike falls back to matching on the title.

## Incident title

The title uses the check's own output where it reads as a sentence, followed by the service and host:

```
CRITICAL: CPU(s) average usage is 97.31 % — Cpu on db-prod-03
```

When the output is empty or is not readable text (for instance `rta nan, lost 100%`), the title is built from the state instead: `Cpu is CRITICAL on db-prod-03` for a service, `Host web-prod-01 is DOWN` for a host. A recovery reads `Cpu recovered on db-prod-03` or `Host web-prod-01 recovered`. Addresses, ids and timestamps are kept out of the title and shown in the incident details.

{% hint style="warning" %}
Quotes or other special characters in plugin output can break the JSON body, and Centreon's documentation does not say whether they are removed. If an alert does not arrive, check the poller's notification log for the command that ran.
{% endhint %}
