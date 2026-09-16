---
description: >-
  Send Icinga 2 host and service notifications to Spike so on-call is paged by phone, SMS, Slack or Teams, and incidents resolve and acknowledge themselves.
---

# Integrate Spike with Icinga 2

[Icinga 2](https://icinga.com/docs/icinga-2/latest/doc/01-about/) has no webhook output. It runs a notification command instead, so Spike ships a small bash script that turns an Icinga notification into an incident. A hard `CRITICAL` or `DOWN` pages your on-call rotation, the recovery resolves the incident, and an acknowledgement made in Icinga Web stops the escalation in Spike.

The script works both with the stock `env` style of notification commands and with `--flag value` arguments, which is what you need when you manage configuration through [Icinga Director](https://icinga.com/docs/icinga-director/latest/doc/01-Introduction/).

{% hint style="info" %}
Running Icinga 1, Nagios, Naemon or Shinken? Those read Nagios object configuration, so use the [Nagios guide](integrate-spike-with-nagios.md) and the Nagios tile instead.
{% endhint %}

## What Spike does with each notification

| Notification type | What happens in Spike |
| --- | --- |
| `PROBLEM` | Opens an incident for that host and service, or adds an event to the one already open |
| `RECOVERY` | Auto-resolves the open incident. Dropped when nothing is open |
| `ACKNOWLEDGEMENT` | Acknowledges the open incident and records who acknowledged it and their comment. Dropped when nothing is open |
| `CUSTOM`, `FLAPPINGSTART`, `FLAPPINGEND`, `DOWNTIMESTART`, `DOWNTIMEEND`, `DOWNTIMEREMOVED` | Added as an event to the open incident. Dropped when nothing is open. They never page anyone |

There is one incident per host and service pair, and one incident per host for host checks. Repeat notifications from `interval`, a `WARNING` that turns into a `CRITICAL`, and a flapping check all land on that one incident, so a noisy check never pages the team twice.

Incident titles stay the same for every repeat, which is what makes them readable when Spike reads them out on a phone call:

* Service problem: `Disk / on db-01 is CRITICAL`
* Host problem: `Host db-01 is DOWN`

Check output, attempt counts and host groups are on the incident page rather than in the title.

Severity comes from the state Icinga reports:

| State | Severity |
| --- | --- |
| `CRITICAL`, `DOWN` | SEV1 |
| `WARNING` | SEV2 |
| `UNKNOWN`, `OK`, `UP` | SEV3 |

{% hint style="info" %}
Severity is set when the incident is created and does not move on repeats. [Alert rules](../alerts/alert-rules.md) can override it, route the incident elsewhere, or suppress it entirely.
{% endhint %}

## Prerequisites

* Root or `sudo` access on the Icinga 2 master
* `bash` and `curl` on that host. The script needs nothing else, no `jq` and no Python
* An Icinga 2 integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Icinga 2**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Install the notification script

Save the script below as `/etc/icinga2/scripts/spike-notify.sh` on the master that sends notifications, and make it executable by the `icinga` user.

```bash
sudo nano /etc/icinga2/scripts/spike-notify.sh
sudo chmod 755 /etc/icinga2/scripts/spike-notify.sh
sudo chown icinga:icinga /etc/icinga2/scripts/spike-notify.sh
```

<details>

<summary>spike-notify.sh</summary>

```bash
#!/usr/bin/env bash
#
# spike-notify.sh - send Icinga 2 notifications to Spike.sh
#
# Reads the environment variables set by the NotificationCommand `env` block and
# accepts the same values as --flag arguments, which is what Icinga Director
# users need because Director cannot set `env` on a command.
# Requires only bash and curl.
#
# Usage:
#   spike-notify.sh                     (all values from the environment)
#   spike-notify.sh --type PROBLEM --kind service --host-name db-01 ...
#   spike-notify.sh --test --webhook-url https://hooks.spike.sh/<token>/push-events
#
# Set SPIKE_DEBUG=1 to print the payload to stderr before it is sent.

spike_source=${SPIKE_SOURCE:-icinga2}
curl_timeout=${SPIKE_CURL_TIMEOUT:-10}
retry_delay=${SPIKE_RETRY_DELAY:-3}

notification_type=${NOTIFICATIONTYPE:-}
kind=${NOTIFICATIONKIND:-}
# bash presets HOSTNAME, so spike.conf always sets it explicitly in the env block
host_name=${HOSTNAME:-}
host_display_name=${HOSTDISPLAYNAME:-}
host_address=${HOSTADDRESS:-}
host_state=${HOSTSTATE:-}
host_state_type=${HOSTSTATETYPE:-}
host_output=${HOSTOUTPUT:-}
host_groups=${HOSTGROUPS:-}
service_name=${SERVICENAME:-}
service_display_name=${SERVICEDISPLAYNAME:-}
service_state=${SERVICESTATE:-}
service_state_type=${SERVICESTATETYPE:-}
service_output=${SERVICEOUTPUT:-}
service_long_output=${SERVICELONGOUTPUT:-}
service_groups=${SERVICEGROUPS:-}
problem_id=${PROBLEMID:-}
last_problem_id=${LASTPROBLEMID:-}
notification_number=${NOTIFICATIONNUMBER:-}
attempt=${CHECKATTEMPT:-}
max_attempts=${MAXCHECKATTEMPTS:-}
author=${NOTIFICATIONAUTHORNAME:-}
comment=${NOTIFICATIONCOMMENT:-}
timestamp=${TIMET:-}
monitor_url=${MONITORURL:-}
webhook_url=${SPIKE_WEBHOOK_URL:-}
test_mode=""
payload=""

usage() {
    cat >&2 <<'USAGE'
Usage: spike-notify.sh [options]

Every value can come from the environment or from a flag. Flags win.

  --type            PROBLEM, RECOVERY, ACKNOWLEDGEMENT, CUSTOM, FLAPPINGSTART, ...
  --kind            host or service (guessed from --service-name when omitted)
  --host-name       --host-display-name  --host-address
  --host-state      --host-state-type    --host-output   --host-groups
  --service-name    --service-display-name
  --service-state   --service-state-type --service-output --service-groups
  --author          --comment
  --attempt         --max-attempts       --notification-number
  --timestamp       --monitor-url
  --webhook-url     the Spike webhook URL (or set SPIKE_WEBHOOK_URL)
  --test            send a synthetic PROBLEM followed by a RECOVERY
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
    kind="service"
    host_name=$(hostname 2>/dev/null || echo "spike-test-host")
    host_display_name=$host_name
    host_state="UP"
    host_state_type="HARD"
    service_name="Spike test"
    service_display_name="Spike test"
    service_state_type="HARD"
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

while [ $# -gt 0 ]; do
    option=$1
    case "$option" in
        --test|-t) test_mode="yes"; shift; continue ;;
        --help|-h) usage; exit 0 ;;
    esac

    if [ $# -lt 2 ]; then
        echo "spike-notify.sh: $option needs a value" >&2
        exit 2
    fi
    value=$2

    case "$option" in
        --type) notification_type=$value ;;
        --kind) kind=$value ;;
        --host-name) host_name=$value ;;
        --host-display-name) host_display_name=$value ;;
        --host-address) host_address=$value ;;
        --host-state) host_state=$value ;;
        --host-state-type) host_state_type=$value ;;
        --host-output) host_output=$value ;;
        --host-groups) host_groups=$value ;;
        --service-name) service_name=$value ;;
        --service-display-name) service_display_name=$value ;;
        --service-state) service_state=$value ;;
        --service-state-type) service_state_type=$value ;;
        --service-output) service_output=$value ;;
        --service-long-output) service_long_output=$value ;;
        --service-groups) service_groups=$value ;;
        --notification-number) notification_number=$value ;;
        --attempt) attempt=$value ;;
        --max-attempts) max_attempts=$value ;;
        --author) author=$value ;;
        --comment) comment=$value ;;
        --timestamp) timestamp=$value ;;
        --monitor-url) monitor_url=$value ;;
        --webhook-url) webhook_url=$value ;;
        *) echo "spike-notify.sh: unknown argument $option" >&2; usage; exit 2 ;;
    esac
    shift 2
done

if [ -z "$kind" ]; then
    if [ -n "$service_name" ]; then
        kind="service"
    else
        kind="host"
    fi
fi

if [ -z "$webhook_url" ]; then
    echo "spike-notify.sh: no webhook URL, pass --webhook-url or set SPIKE_WEBHOOK_URL" >&2
    exit 2
fi

if [ -n "$test_mode" ]; then
    run_test
    exit $?
fi

if [ -z "$host_name" ]; then
    echo "spike-notify.sh: host name is required" >&2
    exit 2
fi

build_payload
send_payload
```

</details>

## Step 3 — Add the notification commands, user and rules

Create `/etc/icinga2/conf.d/spike.conf` with the objects below and paste your webhook URL into `vars.spike_webhook_url` on the `spike` user.

```icinga2
object NotificationCommand "spike-host-notification" {
  command = [ ConfigDir + "/scripts/spike-notify.sh" ]

  env = {
    NOTIFICATIONKIND = "host"
    NOTIFICATIONTYPE = "$notification.type$"
    HOSTNAME = "$host.name$"
    HOSTDISPLAYNAME = "$host.display_name$"
    HOSTADDRESS = "$address$"
    HOSTSTATE = "$host.state$"
    HOSTSTATETYPE = "$host.state_type$"
    HOSTOUTPUT = "$host.output$"
    HOSTGROUPS = "$host.groups$"
    CHECKATTEMPT = "$host.check_attempt$"
    MAXCHECKATTEMPTS = "$host.max_check_attempts$"
    NOTIFICATIONAUTHORNAME = "$notification.author$"
    NOTIFICATIONCOMMENT = "$notification.comment$"
    TIMET = "$icinga.timet$"
    SPIKE_WEBHOOK_URL = "$user.vars.spike_webhook_url$"
  }
}

object NotificationCommand "spike-service-notification" {
  command = [ ConfigDir + "/scripts/spike-notify.sh" ]

  env = {
    NOTIFICATIONKIND = "service"
    NOTIFICATIONTYPE = "$notification.type$"
    HOSTNAME = "$host.name$"
    HOSTDISPLAYNAME = "$host.display_name$"
    HOSTADDRESS = "$address$"
    HOSTSTATE = "$host.state$"
    SERVICENAME = "$service.name$"
    SERVICEDISPLAYNAME = "$service.display_name$"
    SERVICESTATE = "$service.state$"
    SERVICESTATETYPE = "$service.state_type$"
    SERVICEOUTPUT = "$service.output$"
    SERVICEGROUPS = "$service.groups$"
    CHECKATTEMPT = "$service.check_attempt$"
    MAXCHECKATTEMPTS = "$service.max_check_attempts$"
    NOTIFICATIONAUTHORNAME = "$notification.author$"
    NOTIFICATIONCOMMENT = "$notification.comment$"
    TIMET = "$icinga.timet$"
    SPIKE_WEBHOOK_URL = "$user.vars.spike_webhook_url$"
  }
}

object User "spike" {
  display_name = "Spike.sh"
  enable_notifications = true

  vars.spike_webhook_url = "https://hooks.spike.sh/<your-token>/push-events"
}

apply Notification "spike-host" to Host {
  command = "spike-host-notification"
  users = [ "spike" ]

  types = [ Problem, Recovery, Acknowledgement, Custom,
            FlappingStart, FlappingEnd,
            DowntimeStart, DowntimeEnd, DowntimeRemoved ]
  states = [ Up, Down ]
  interval = 30m

  assign where host.address
}

apply Notification "spike-service" to Service {
  command = "spike-service-notification"
  users = [ "spike" ]

  types = [ Problem, Recovery, Acknowledgement, Custom,
            FlappingStart, FlappingEnd,
            DowntimeStart, DowntimeEnd, DowntimeRemoved ]
  states = [ OK, Warning, Critical, Unknown ]
  interval = 30m

  assign where true
}
```

A few things to adjust for your setup:

* `assign where` decides what gets sent to Spike. The rules above cover every host with an address and every service. Narrow them the usual way, for example `assign where host.vars.notify_spike == true` or `assign where "production" in host.groups`.
* `interval = 30m` re-notifies every 30 minutes while a problem is open. Those repeats are added to the incident already open in Spike, they do not page again. Set `interval = 0` if you only want the first notification.
* Keeping the URL in `vars.spike_webhook_url` on the user rather than in the command means it is not repeated in every log line, and both commands pick it up through `$user.vars.spike_webhook_url$`.

## Step 4 — Validate and reload

```bash
sudo icinga2 daemon -C
sudo systemctl reload icinga2
```

Then send a test incident. It opens an incident called `Spike test on <hostname> is CRITICAL` and resolves it two seconds later:

```bash
sudo -u icinga /etc/icinga2/scripts/spike-notify.sh --test \
  --webhook-url "https://hooks.spike.sh/<your-token>/push-events"
```

A resolved **Spike test** incident on your service means Icinga can reach Spike and the integration is wired to the right escalation policy.

## Icinga Director

Director cannot set `env` on a command, so define the same two commands with arguments instead. The script accepts every value as a `--flag`, and flags always win over the environment.

In Director, go to **Commands → Add** and create a **Notification Plugin Command** pointing at `/etc/icinga2/scripts/spike-notify.sh`, then add one argument row per flag. This is the configuration Director generates:

```icinga2
object NotificationCommand "spike-service-notification" {
  command = [ "/etc/icinga2/scripts/spike-notify.sh" ]

  arguments = {
    "--type" = "$notification.type$"
    "--kind" = "service"
    "--host-name" = "$host.name$"
    "--host-display-name" = "$host.display_name$"
    "--host-address" = "$address$"
    "--host-state" = "$host.state$"
    "--service-name" = "$service.name$"
    "--service-display-name" = "$service.display_name$"
    "--service-state" = "$service.state$"
    "--service-state-type" = "$service.state_type$"
    "--service-output" = "$service.output$"
    "--service-groups" = "$service.groups$"
    "--attempt" = "$service.check_attempt$"
    "--max-attempts" = "$service.max_check_attempts$"
    "--author" = "$notification.author$"
    "--comment" = "$notification.comment$"
    "--timestamp" = "$icinga.timet$"
    "--webhook-url" = "$user.vars.spike_webhook_url$"
  }
}
```

The host command is the same with `"--kind" = "host"`, the `--host-*` flags, `"--host-state-type" = "$host.state_type$"`, `"--host-output" = "$host.output$"` and `"--host-groups" = "$host.groups$"`, and no `--service-*` flags.

Then create the user and the notifications in Director as usual: a **User** named `spike` carrying the custom variable `spike_webhook_url`, and two **Notifications** using the commands above with the types and states from Step 3.

## Things worth knowing

* **Icinga 2 hosts are only `UP` or `DOWN`.** There is no `UNREACHABLE` host state, so a host incident from Icinga 2 is always SEV1.
* **Icinga 2 has no problem id.** Spike identifies an incident by host and service name, so nothing depends on one. The same identity is used for Nagios, which is why both tools behave identically in Spike.
* **Acknowledging in Icinga Web acknowledges in Spike.** The acknowledgement carries the author and the comment, and the incident activity reads `Acknowledged in Icinga 2 by jane: looking into it`. Escalation stops there.
* **Notifications are not retried by Icinga.** The script retries once on its own and gives up after roughly 23 seconds, well inside Icinga's 60 second command timeout. It then exits non-zero, which Icinga logs as a failed notification in `/var/log/icinga2/icinga2.log`.
* **Output with quotes, backslashes or newlines is safe.** The script JSON-escapes every value it sends, so plugin output never breaks the payload.

## Payload reference

The script posts a flat JSON object. Every value is a string.

```json
{
  "type": "PROBLEM",
  "kind": "service",
  "source": "icinga2",
  "host_name": "db-01",
  "host_display_name": "db-01",
  "host_address": "10.0.0.5",
  "host_state": "UP",
  "host_state_type": "",
  "host_output": "",
  "host_groups": "",
  "service_name": "Disk /",
  "service_display_name": "Disk /",
  "service_state": "CRITICAL",
  "service_state_type": "HARD",
  "service_output": "DISK CRITICAL - free space: / 120 MB (3% inode=99%)",
  "service_long_output": "",
  "service_groups": "disk-checks",
  "severity": "CRITICAL",
  "problem_id": "",
  "last_problem_id": "",
  "notification_number": "",
  "attempt": "3",
  "max_attempts": "3",
  "author": "",
  "comment": "",
  "timestamp": "1764930000",
  "monitor_url": ""
}
```

{% hint style="info" %}
There is no top-level `message` key in this payload on purpose. Spike builds the incident title from the host and service fields, which keeps the title identical across a problem, its repeats and its acknowledgement.
{% endhint %}

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Run the script by hand as the `icinga` user with `SPIKE_DEBUG=1` to see the payload and the curl error:

```bash
sudo -u icinga SPIKE_DEBUG=1 /etc/icinga2/scripts/spike-notify.sh --test \
  --webhook-url "https://hooks.spike.sh/<your-token>/push-events"
```

If curl reports a connection or timeout error, the Icinga master cannot reach `hooks.spike.sh` on port 443. If the script says it has no webhook URL, `$user.vars.spike_webhook_url$` did not resolve, which usually means the notification is pointing at a different user object.

</details>

<details>

<summary>Icinga logs a failed notification</summary>

Check `/var/log/icinga2/icinga2.log` for the script's stderr, and confirm the file is executable and readable by the `icinga` user. On SELinux systems the script also needs a context Icinga is allowed to execute.

</details>

<details>

<summary>Incidents are created but never resolve</summary>

`Recovery` has to be in the `types` list of both the notification rule and the user object, otherwise Icinga never sends it. A recovery that arrives when nothing is open in Spike is dropped, which is what should happen if you resolved the incident by hand first.

</details>

<details>

<summary>Host notifications arrive with the wrong host name</summary>

`HOSTNAME` is set by bash itself, so the `env` block has to set it explicitly, as in Step 3. If you wrote your own command definition and left `HOSTNAME` out, every notification will carry the Icinga master's hostname instead of the monitored host's.

</details>
