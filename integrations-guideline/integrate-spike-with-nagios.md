---
description: >-
  Connect Nagios Core, Nagios XI, Naemon or Shinken to Spike and get paged on phone, SMS, Slack and Teams when a host goes down or a service turns critical.
---

# Integrate Spike with Nagios

[Nagios](https://www.nagios.org/) watches your hosts and services and runs a notification command when something breaks. Spike ships a small bash script for that command, so a hard `CRITICAL` or `DOWN` opens an incident that escalates through your on-call policy, the recovery closes it, and an acknowledgement made in Nagios stops the escalation in Spike.

The same script and the same Spike integration work on **Nagios Core**, **Nagios XI**, **Naemon**, **Shinken** and **Icinga 1**. If you run Icinga 2, use the [Icinga 2 guide](integrate-spike-with-icinga-2.md) instead.

## What Spike does with each notification

| Notification type | What happens in Spike |
| --- | --- |
| `PROBLEM` | Opens an incident for that host and service, or adds an event to the one already open |
| `RECOVERY` | Auto-resolves the open incident. Dropped when nothing is open |
| `ACKNOWLEDGEMENT` | Acknowledges the open incident and records who acknowledged it and their comment. Dropped when nothing is open |
| `CUSTOM`, `FLAPPINGSTART`, `FLAPPINGSTOP`, `DOWNTIMESTART`, `DOWNTIMEEND` | Added as an event to the open incident. Dropped when nothing is open. They never page anyone |

There is one incident per host and service pair, and one incident per host for host checks. Re-notifications every 30 minutes, a `WARNING` that turns into a `CRITICAL`, and a flapping check all land on that one incident, so a noisy check never pages the team twice.

Incident titles read well on a phone call and stay the same for every repeat:

* Service problem: `Disk / on db-01 is CRITICAL`
* Host problem: `Host db-01 is DOWN`

Plugin output, attempt counts, host groups and the Nagios problem id are on the incident page rather than in the title.

Severity comes from the state Nagios reports:

| State | Severity |
| --- | --- |
| `CRITICAL`, `DOWN` | SEV1 |
| `WARNING`, `UNREACHABLE` | SEV2 |
| `UNKNOWN`, `OK`, `UP` | SEV3 |

{% hint style="info" %}
Severity is set when the incident is created and does not move on repeats. [Alert rules](../alerts/alert-rules.md) can override it, route the incident elsewhere, or suppress it entirely.
{% endhint %}

## Prerequisites

* Root or `sudo` access on the Nagios server
* `bash` and `curl` on that server. The script needs nothing else, no `jq` and no Python
* A Nagios integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Nagios**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Install the notification script

Save the script below as `spike-notify.sh` in your plugins directory, which is the directory `$USER1$` points at in `resource.cfg`. On a source install of Nagios Core that is `/usr/local/nagios/libexec`; on Debian and Ubuntu packages it is `/usr/lib/nagios/plugins`.

```bash
sudo nano /usr/local/nagios/libexec/spike-notify.sh
sudo chmod 755 /usr/local/nagios/libexec/spike-notify.sh
sudo chown nagios:nagios /usr/local/nagios/libexec/spike-notify.sh
```

<details>

<summary>spike-notify.sh</summary>

```bash
#!/usr/bin/env bash
#
# spike-notify.sh - send Nagios notifications to Spike.sh
#
# Works unchanged on Nagios Core, Nagios XI, Naemon, Shinken and Icinga 1.
# Requires only bash and curl.
#
# Usage:
#   spike-notify.sh host    <16 macros> <webhook-url>
#   spike-notify.sh service <20 macros> <webhook-url>
#   spike-notify.sh --test  <webhook-url>
#
# The macro order is fixed and must match the command definitions in spike.cfg.
# Set SPIKE_DEBUG=1 to print the payload, SPIKE_SOURCE to naemon, shinken or
# icinga1 to record which tool sent the notification.

spike_source=${SPIKE_SOURCE:-nagios}
curl_timeout=${SPIKE_CURL_TIMEOUT:-10}
retry_delay=${SPIKE_RETRY_DELAY:-3}

notification_type=""
kind=""
host_name=""
host_display_name=""
host_address=""
host_state=""
host_state_type=""
host_output=""
host_groups=""
service_name=""
service_display_name=""
service_state=""
service_state_type=""
service_output=""
service_long_output=""
service_groups=""
problem_id=""
last_problem_id=""
notification_number=""
attempt=""
max_attempts=""
author=""
comment=""
timestamp=""
monitor_url=${SPIKE_MONITOR_URL:-}
webhook_url=""
payload=""

usage() {
    cat >&2 <<'USAGE'
Usage:
  spike-notify.sh host    TYPE HOSTNAME HOSTDISPLAYNAME HOSTADDRESS HOSTSTATE \
                          HOSTSTATETYPE HOSTOUTPUT HOSTGROUPNAMES HOSTPROBLEMID \
                          LASTHOSTPROBLEMID NOTIFICATIONNUMBER ATTEMPT MAXATTEMPTS \
                          AUTHOR COMMENT TIMET WEBHOOK_URL

  spike-notify.sh service TYPE HOSTNAME HOSTDISPLAYNAME HOSTADDRESS HOSTSTATE \
                          SERVICEDESC SERVICEDISPLAYNAME SERVICESTATE SERVICESTATETYPE \
                          SERVICEOUTPUT LONGSERVICEOUTPUT SERVICEGROUPNAMES \
                          SERVICEPROBLEMID LASTSERVICEPROBLEMID NOTIFICATIONNUMBER \
                          ATTEMPT MAXATTEMPTS AUTHOR COMMENT TIMET WEBHOOK_URL

  spike-notify.sh --test  WEBHOOK_URL
USAGE
}

json_escape() {
    local value=$1
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//$'\n'/\\n}
    value=${value//$'\r'/\\r}
    value=${value//$'\t'/\\t}
    if [[ $value == *[$'\001'-$'\037']* ]]; then
        value=$(printf '%s' "$value" | tr -d '\001-\037')
    fi
    printf '%s' "$value"
}

add_field() {
    local separator=","
    [ -z "$payload" ] && separator=""
    payload="${payload}${separator}\"$1\":\"$(json_escape "$2")\""
}

build_payload() {
    payload=""
    add_field type "$notification_type"
    add_field kind "$kind"
    add_field source "$spike_source"
    add_field host_name "$host_name"
    add_field host_display_name "$host_display_name"
    add_field host_address "$host_address"
    add_field host_state "$host_state"
    add_field host_state_type "$host_state_type"
    add_field host_output "$host_output"
    add_field host_groups "$host_groups"
    if [ "$kind" = "service" ]; then
        add_field service_name "$service_name"
        add_field service_display_name "$service_display_name"
        add_field service_state "$service_state"
        add_field service_state_type "$service_state_type"
        add_field service_output "$service_output"
        add_field service_long_output "$service_long_output"
        add_field service_groups "$service_groups"
        add_field severity "$service_state"
    else
        add_field severity "$host_state"
    fi
    add_field problem_id "$problem_id"
    add_field last_problem_id "$last_problem_id"
    add_field notification_number "$notification_number"
    add_field attempt "$attempt"
    add_field max_attempts "$max_attempts"
    add_field author "$author"
    add_field comment "$comment"
    add_field timestamp "${timestamp:-$(date +%s)}"
    add_field monitor_url "$monitor_url"
}

send_payload() {
    local body="{${payload}}"
    local try

    if [ -n "${SPIKE_DEBUG:-}" ]; then
        printf '%s\n' "$body" >&2
    fi

    for try in 1 2; do
        if curl --silent --show-error --fail --max-time "$curl_timeout" \
            --header 'Content-Type: application/json' \
            --request POST --data "$body" "$webhook_url" >/dev/null; then
            return 0
        fi
        [ "$try" -eq 1 ] && sleep "$retry_delay"
    done

    echo "spike-notify.sh: could not deliver the notification to Spike" >&2
    return 1
}

run_test() {
    webhook_url=$1
    kind="service"
    host_name=$(hostname 2>/dev/null || echo "spike-test-host")
    host_display_name=$host_name
    host_state="UP"
    host_state_type="HARD"
    service_name="Spike test"
    service_display_name="Spike test"
    service_state_type="HARD"
    notification_number="1"
    attempt="3"
    max_attempts="3"

    notification_type="PROBLEM"
    service_state="CRITICAL"
    service_output="Spike test notification - this incident resolves itself"
    timestamp=$(date +%s)
    build_payload
    send_payload || return 1
    echo "spike-notify.sh: test PROBLEM sent, an incident should be open in Spike"

    sleep 2

    notification_type="RECOVERY"
    service_state="OK"
    service_output="Spike test recovery"
    timestamp=$(date +%s)
    build_payload
    send_payload || return 1
    echo "spike-notify.sh: test RECOVERY sent, the incident should now be resolved"
}

case "${1:-}" in
    host)
        kind="host"
        notification_type=$2
        host_name=$3
        host_display_name=$4
        host_address=$5
        host_state=$6
        host_state_type=$7
        host_output=$8
        host_groups=$9
        problem_id=${10}
        last_problem_id=${11}
        notification_number=${12}
        attempt=${13}
        max_attempts=${14}
        author=${15}
        comment=${16}
        timestamp=${17}
        webhook_url=${18}
        ;;
    service)
        kind="service"
        notification_type=$2
        host_name=$3
        host_display_name=$4
        host_address=$5
        host_state=$6
        service_name=$7
        service_display_name=$8
        service_state=$9
        service_state_type=${10}
        service_output=${11}
        service_long_output=${12}
        service_groups=${13}
        problem_id=${14}
        last_problem_id=${15}
        notification_number=${16}
        attempt=${17}
        max_attempts=${18}
        author=${19}
        comment=${20}
        timestamp=${21}
        webhook_url=${22}
        ;;
    --test|-t)
        if [ -z "${2:-}" ]; then
            usage
            exit 2
        fi
        run_test "$2"
        exit $?
        ;;
    --help|-h)
        usage
        exit 0
        ;;
    *)
        usage
        exit 2
        ;;
esac

if [ -z "$webhook_url" ] || [ -z "$host_name" ]; then
    echo "spike-notify.sh: webhook URL and host name are required" >&2
    exit 2
fi

build_payload
send_payload
```

</details>

{% hint style="warning" %}
The order of the arguments in the command definitions below has to match the order the script expects. Nagios keeps environment macros switched off by default (`enable_environment_macros=0`, and Naemon removed them altogether), which is why every macro is passed as an argument.
{% endhint %}

## Step 3 — Add the commands, contact and contact group

Create `/usr/local/nagios/etc/objects/spike.cfg` with the definitions below and put your webhook URL in the `_SPIKE_WEBHOOK_URL` line of the contact.

```cfg
define command {
    command_name    notify-host-by-spike
    command_line    $USER1$/spike-notify.sh host "$NOTIFICATIONTYPE$" "$HOSTNAME$" "$HOSTDISPLAYNAME$" "$HOSTADDRESS$" "$HOSTSTATE$" "$HOSTSTATETYPE$" "$HOSTOUTPUT$" "$HOSTGROUPNAMES$" "$HOSTPROBLEMID$" "$LASTHOSTPROBLEMID$" "$HOSTNOTIFICATIONNUMBER$" "$HOSTATTEMPT$" "$MAXHOSTATTEMPTS$" "$NOTIFICATIONAUTHORNAME$" "$NOTIFICATIONCOMMENT$" "$TIMET$" "$_CONTACTSPIKE_WEBHOOK_URL$"
}

define command {
    command_name    notify-service-by-spike
    command_line    $USER1$/spike-notify.sh service "$NOTIFICATIONTYPE$" "$HOSTNAME$" "$HOSTDISPLAYNAME$" "$HOSTADDRESS$" "$HOSTSTATE$" "$SERVICEDESC$" "$SERVICEDISPLAYNAME$" "$SERVICESTATE$" "$SERVICESTATETYPE$" "$SERVICEOUTPUT$" "$LONGSERVICEOUTPUT$" "$SERVICEGROUPNAMES$" "$SERVICEPROBLEMID$" "$LASTSERVICEPROBLEMID$" "$SERVICENOTIFICATIONNUMBER$" "$SERVICEATTEMPT$" "$MAXSERVICEATTEMPTS$" "$NOTIFICATIONAUTHORNAME$" "$NOTIFICATIONCOMMENT$" "$TIMET$" "$_CONTACTSPIKE_WEBHOOK_URL$"
}

define contact {
    contact_name                    spike
    alias                           Spike.sh
    host_notification_period        24x7
    service_notification_period     24x7
    host_notification_options       d,u,r,f,s
    service_notification_options    w,u,c,r,f,s
    host_notification_commands      notify-host-by-spike
    service_notification_commands   notify-service-by-spike
    _SPIKE_WEBHOOK_URL              https://hooks.spike.sh/<your-token>/push-events
}

define contactgroup {
    contactgroup_name   spike-oncall
    alias               Spike on-call
    members             spike
}
```

Keeping the URL on the contact rather than in the command line means it is not repeated in every notification log entry, and one contact can be reused by every host and service.

Tell Nagios to read the file by adding this line to `/usr/local/nagios/etc/nagios.cfg`:

```cfg
cfg_file=/usr/local/nagios/etc/objects/spike.cfg
```

## Step 4 — Send your hosts and services to Spike

Add the `spike-oncall` contact group to the hosts and services you want to page for. The easiest way is on a template that everything already inherits:

```cfg
define host {
    name                    spike-host
    use                     generic-host
    contact_groups          spike-oncall
    notification_interval   30
    register                0
}

define service {
    name                    spike-service
    use                     generic-service
    contact_groups          spike-oncall
    notification_interval   30
    register                0
}
```

`notification_interval 30` re-notifies every 30 minutes while a problem is open. Those repeats are added to the incident already open in Spike, they do not page again.

## Step 5 — Verify and reload

```bash
sudo /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg
sudo systemctl restart nagios
```

Then send a test incident. It opens an incident called `Spike test on <hostname> is CRITICAL` and resolves it two seconds later:

```bash
sudo -u nagios /usr/local/nagios/libexec/spike-notify.sh --test \
  "https://hooks.spike.sh/<your-token>/push-events"
```

A resolved **Spike test** incident on your service means Nagios can reach Spike and the integration is wired to the right escalation policy.

## Nagios XI

Nagios XI runs Nagios Core underneath, so the script and the definitions above are the same. Add them through Core Config Manager instead of editing files:

1. Copy `spike-notify.sh` to `/usr/local/nagios/libexec/` on the XI server and make it executable, owned by `nagios`.
2. Go to **Configure → Core Config Manager → Commands → Add New**. Create `notify-host-by-spike` and `notify-service-by-spike` with the command lines from Step 3, command type **notification**.
3. Go to **Contacts → Add New**. Name the contact `spike`, set the host and service notification commands to the two commands you just created, and tick the notification options.
4. On the contact's **Misc Settings** tab add a custom variable named `_SPIKE_WEBHOOK_URL` with your webhook URL as the value.
5. Go to **Contact Groups → Add New**, create `spike-oncall` with `spike` as its only member, then add that contact group to the hosts and services, or to the templates they use.
6. Click **Apply Configuration**.

## Naemon, Shinken and Icinga 1

All three read Nagios object configuration, so use the **Nagios** tile in Spike and follow the steps above. Two differences:

* The configuration lives elsewhere: `/etc/naemon/conf.d/` for Naemon, `/etc/shinken/` for Shinken and `/etc/icinga/objects/` for Icinga 1. Check what `$USER1$` resolves to in that tool's `resource.cfg` before copying the script.
* Set `SPIKE_SOURCE` so incidents record which tool sent them, by putting `SPIKE_SOURCE=naemon` (or `shinken`, or `icinga1`) in front of the script path in both command lines.

## Things worth knowing

* **A `$` in a URL has to be written `$$`.** Nagios treats `$` as a macro delimiter, so any literal dollar sign in a command line or a custom variable must be doubled. An `&` is stripped by Nagios' default `illegal_macro_output_chars`. Spike webhook URLs contain neither character, so you can paste yours as it is.
* **Quotes in plugin output are safe.** Nagios' default `illegal_macro_output_chars` removes both quote types from macro output, and the script JSON-escapes every value itself, so output containing quotes, backslashes or newlines still produces valid JSON if you narrow that setting.
* **Notifications are not retried by Nagios.** The script retries once on its own and gives up after roughly 23 seconds, inside the default 30 second `notification_timeout`. It then exits non-zero and Nagios logs `Notifying contact spike ... failed`, so failures are visible in `nagios.log`.
* **Acknowledging a host problem does not acknowledge its services.** Nagios suppresses service notifications while the host is down, so only the host incident in Spike is acknowledged.
* **Problem ids are recorded, not matched on.** Nagios resets `$SERVICEPROBLEMID$` to `0` on recovery and Naemon may send an empty value, so Spike identifies an incident by host and service name. The problem id is shown on the incident for reference.

## Payload reference

The script posts a flat JSON object. Every value is a string.

```json
{
  "type": "PROBLEM",
  "kind": "service",
  "source": "nagios",
  "host_name": "db-01",
  "host_display_name": "db-01",
  "host_address": "10.0.0.5",
  "host_state": "UP",
  "host_state_type": "HARD",
  "host_output": "",
  "host_groups": "linux-servers",
  "service_name": "Disk /",
  "service_display_name": "Disk /",
  "service_state": "CRITICAL",
  "service_state_type": "HARD",
  "service_output": "DISK CRITICAL - free space: / 120 MB (3% inode=99%)",
  "service_long_output": "",
  "service_groups": "disk-checks",
  "severity": "CRITICAL",
  "problem_id": "142",
  "last_problem_id": "0",
  "notification_number": "1",
  "attempt": "3",
  "max_attempts": "3",
  "author": "",
  "comment": "",
  "timestamp": "1764930000",
  "monitor_url": ""
}
```

`author` and `comment` carry the name and note of whoever acknowledged the problem in Nagios, and Spike writes them into the incident activity as `Acknowledged in Nagios by jane: looking into it`.

{% hint style="info" %}
There is no top-level `message` key in this payload on purpose. Spike builds the incident title from the host and service fields, which keeps the title identical across a problem, its repeats and its acknowledgement.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Run the script by hand as the `nagios` user with `SPIKE_DEBUG=1` to see the payload and the curl error:

```bash
sudo -u nagios SPIKE_DEBUG=1 /usr/local/nagios/libexec/spike-notify.sh --test \
  "https://hooks.spike.sh/<your-token>/push-events"
```

If curl reports a connection or timeout error, the Nagios server cannot reach `hooks.spike.sh` on port 443. If it exits with `2`, the webhook URL argument did not reach the script, which usually means the contact is missing the `_SPIKE_WEBHOOK_URL` custom variable.

</details>

<details>

<summary>Nagios logs "Notifying contact spike ... failed"</summary>

The script exited non-zero. Look for its stderr in `/usr/local/nagios/var/nagios.log`, and confirm the script is executable and owned by the `nagios` user.

</details>

<details>

<summary>Incidents are created but never resolve</summary>

The contact needs the recovery notification option, `r` in both `host_notification_options` and `service_notification_options`, otherwise Nagios never sends `RECOVERY`. A recovery that arrives when nothing is open in Spike is dropped, which is what should happen if you resolved the incident by hand first.

</details>

<details>

<summary>A check opens a new incident on every notification</summary>

Spike groups by host name and service name, so check that the command line passes `$HOSTNAME$` and `$SERVICEDESC$` in the positions shown in Step 3. If the arguments are in a different order the fields land in the wrong keys.

</details>
