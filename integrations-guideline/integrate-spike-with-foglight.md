---
description: >-
  Connect Quest Foglight to Spike and get paged on phone, SMS, Slack and Teams when a Foglight rule raises an alarm on a database, a host or an application.
---

# Integrate Spike with Foglight

[Quest Foglight](https://www.quest.com/foglight/) watches your databases, infrastructure and applications and raises an alarm when a rule fires. Foglight has no webhook action, but every rule can run a command on the Management Server, so Spike ships a small script for that command. A firing alarm opens an incident that escalates through your on-call policy, a severity escalation on the same alarm lands on that same incident, and clearing the alarm in Foglight closes it.

The script and the same Spike integration work on **Foglight 7.x**, **Foglight Evolve** and **Foglight Cloud**, with a bash version for a Linux Management Server and a PowerShell version for a Windows one.

## What Spike does with each alarm

| `state` | What happens in Spike |
| --- | --- |
| `firing` | Opens an incident for that alarm, or adds an event to the one already open |
| `cleared` | Auto-resolves the open incident for that alarm. Dropped when nothing is open |

Spike identifies an incident by the alarm id Foglight generates, so every repeat and every severity escalation on one alarm is one incident:

* A Warning that becomes Critical and then Fatal is three `firing` alarms with the same alarm id. The first opens the incident, the other two are added to it as events. Nobody is paged a second time.
* Two different alarms on the same object, say CPU and memory both alarming on `db-prod-03`, have different alarm ids, so they are two incidents. Identity is the alarm, not the machine.
* A clear that arrives when nothing is open in Spike, because someone resolved the incident by hand first, is dropped rather than treated as an error.

## Incident titles

The title is the rule name, the object it fired on, and Foglight's own alarm message:

```
{rule} on {object}: {summary}
```

So the CPU alarm above reads:

```
CPU Utilization - Critical on db-prod-03: CPU utilization on db-prod-03 has been above 95% for 10 minutes
```

That is the whole alarm in one line on a phone screen, which is the point. The title stays the same across repeats and severity escalations on that alarm, so the incident does not rename itself under a responder. The host name, the alarm id and the rest of the payload are on the incident page rather than in the title.

{% hint style="info" %}
Foglight alarm messages are written by the rule, so a rule with a vague message produces a vague incident title. If a rule's message is not something you would want read out on a phone call, either improve the message in Foglight or rewrite the title with the [Title Remapper](../alerts/title-remapper.md).
{% endhint %}

## Severity

Severity comes straight from the alarm's severity level:

| Foglight severity | Severity in Spike |
| --- | --- |
| `Fatal` | SEV1 |
| `Critical` | SEV1 |
| `Warning` | SEV2 |

Foglight sends the severity as a number on some versions. The script translates `2`, `3` and `4` into `Warning`, `Critical` and `Fatal` before sending, so the incident is graded the same either way.

{% hint style="info" %}
When an alarm escalates, the incident shows the severity of the most recent alarm Spike processed. [Alert rules](../alerts/alert-rules.md) can override severity, route the incident elsewhere, or suppress it entirely.
{% endhint %}

## Prerequisites

* Administrator access to the Foglight Management Server, enough to edit a rule's **Action** tab
* Shell access to the Management Server to save the script, and `curl` on it for the bash version, or Windows PowerShell 5.1 for the PowerShell version
* A Foglight integration in Spike and its webhook URL

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration** and pick **Foglight**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Install the alarm script

The script runs on the Management Server, as the account the Foglight service runs as. Save it somewhere that account can read and execute, such as the `scripts` directory of your Foglight installation.

### Linux Management Server

```bash
sudo nano /opt/quest/foglight/scripts/spike-alarm.sh
sudo chmod 750 /opt/quest/foglight/scripts/spike-alarm.sh
sudo chown foglight:foglight /opt/quest/foglight/scripts/spike-alarm.sh
```

Replace `/opt/quest/foglight` with your own installation directory and `foglight` with the account your Management Server runs as.

<details>

<summary>spike-alarm.sh</summary>

```bash
#!/usr/bin/env bash
#
# spike-alarm.sh - send Quest Foglight alarms to Spike
#
# Runs from a Command Action on a Foglight rule's Action tab and posts one JSON
# object per alarm to a Spike webhook URL. Requires only bash and curl.
#
# Usage:
#   spike-alarm.sh --state firing --alarm-id ID --rule NAME --severity LEVEL \
#                  --object OBJECT --host HOST --message TEXT --time TIME \
#                  --webhook-url URL
#   spike-alarm.sh --state cleared --alarm-id ID ... --webhook-url URL
#   spike-alarm.sh --test --webhook-url URL
#
# The Foglight variables that fill these arguments (@alarm_id, @severity and so
# on) differ between Foglight versions and cartridges. When they differ, only
# the arguments in the Command Action change; the JSON Spike receives is the
# same either way.
#
# Set SPIKE_DEBUG=1 to print the payload to stderr before it is sent.

curl_timeout=${SPIKE_CURL_TIMEOUT:-10}
retry_delay=${SPIKE_RETRY_DELAY:-3}

state=""
alarm_id=""
rule=""
severity=""
object=""
host=""
message=""
timestamp=""
webhook_url=${SPIKE_WEBHOOK_URL:-}
test_mode=""
payload=""

usage() {
    cat >&2 <<'USAGE'
Usage: spike-alarm.sh [options]

  --state         firing or cleared. Entering, exiting and normal are accepted
                  as the words Foglight uses for the same two things
  --alarm-id      the alarm id Foglight generates. Spike matches repeats,
                  severity escalations and the clear on this value
  --rule          the rule name
  --severity      Warning, Critical or Fatal. A Foglight severity number
                  (2, 3, 4) is translated to the matching word
  --object        the topology object the alarm is on
  --host          the host the object lives on
  --message       the alarm message, sent to Spike as "summary"
  --time          the alarm time. Defaults to now in UTC
  --webhook-url   the Spike webhook URL (or set SPIKE_WEBHOOK_URL)
  --test          send a synthetic firing alarm and then clear it
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

normalise_state() {
    case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
        firing|fire|entering|active)                   printf 'firing' ;;
        cleared|clear|exiting|normal|recovery|resolved) printf 'cleared' ;;
        *)                                              printf '%s' "$1" ;;
    esac
}

# Foglight sends the severity as a number in some versions and as a word in
# others. Spike reads the word.
normalise_severity() {
    case "$1" in
        0) printf 'Undefined' ;;
        1) printf 'Normal' ;;
        2) printf 'Warning' ;;
        3) printf 'Critical' ;;
        4) printf 'Fatal' ;;
        *) printf '%s' "$1" ;;
    esac
}

build_payload() {
    payload=""
    add_field source "foglight"
    add_field state "$state"
    add_field alarm_id "$alarm_id"
    add_field rule "$rule"
    add_field severity "$(normalise_severity "$severity")"
    add_field object "$object"
    add_field host "$host"
    # The alarm message is sent as "summary", never as "message". A top level
    # "message" key makes Spike skip the Foglight parser and title the incident
    # with the raw text instead.
    add_field summary "$message"
    add_field timestamp "${timestamp:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
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

    echo "spike-alarm.sh: could not deliver the alarm to Spike" >&2
    return 1
}

new_alarm_id() {
    if [ -r /proc/sys/kernel/random/uuid ]; then
        cat /proc/sys/kernel/random/uuid
    elif command -v uuidgen >/dev/null 2>&1; then
        uuidgen
    else
        printf 'spike-test-%s-%s' "$(date +%s)" "$$"
    fi
}

run_test() {
    alarm_id=$(new_alarm_id)
    rule="Spike test"
    object=$(hostname 2>/dev/null || echo "spike-test-host")
    host=$object

    state="firing"
    severity="Critical"
    message="Spike test alarm on $object - this incident resolves itself"
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    build_payload
    send_payload || return 1
    echo "spike-alarm.sh: test alarm sent, an incident should be open in Spike"

    sleep 2

    state="cleared"
    severity="Normal"
    message="Spike test alarm on $object has returned to normal"
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    build_payload
    send_payload || return 1
    echo "spike-alarm.sh: test clear sent, the incident should now be resolved"
}

while [ $# -gt 0 ]; do
    option=$1
    case "$option" in
        --test|-t) test_mode="yes"; shift; continue ;;
        --help|-h) usage; exit 0 ;;
    esac

    if [ $# -lt 2 ]; then
        echo "spike-alarm.sh: $option needs a value" >&2
        exit 2
    fi
    value=$2

    case "$option" in
        --state) state=$value ;;
        --alarm-id) alarm_id=$value ;;
        --rule) rule=$value ;;
        --severity) severity=$value ;;
        --object) object=$value ;;
        --host) host=$value ;;
        --message|--summary) message=$value ;;
        --time|--timestamp) timestamp=$value ;;
        --webhook-url) webhook_url=$value ;;
        *) echo "spike-alarm.sh: unknown argument $option" >&2; usage; exit 2 ;;
    esac
    shift 2
done

if [ -z "$webhook_url" ]; then
    echo "spike-alarm.sh: no webhook URL, pass --webhook-url or set SPIKE_WEBHOOK_URL" >&2
    exit 2
fi

if [ -n "$test_mode" ]; then
    run_test
    exit $?
fi

state=$(normalise_state "$state")
if [ "$state" != "firing" ] && [ "$state" != "cleared" ]; then
    echo "spike-alarm.sh: --state must be firing or cleared" >&2
    exit 2
fi

if [ -z "$alarm_id" ]; then
    echo "spike-alarm.sh: --alarm-id is required, Spike matches repeats and clears on it" >&2
    exit 2
fi

for empty_field in rule object message; do
    if [ -z "${!empty_field}" ]; then
        echo "spike-alarm.sh: --$empty_field is empty, the incident title will read poorly" >&2
    fi
done

build_payload
send_payload
```

</details>

### Windows Management Server

Save the PowerShell version as `C:\Quest\Foglight\scripts\spike-alarm.ps1`, again under your own installation directory, and give the Foglight service account read and execute on it.

<details>

<summary>spike-alarm.ps1</summary>

```powershell
# spike-alarm.ps1 - post a Quest Foglight alarm to a Spike webhook
#
# Runs as the Command Action of a Foglight rule on a Windows Management Server.
# Needs Windows PowerShell 5.1 or later and nothing else.
#
# Usage:
#   spike-alarm.ps1 -State firing|cleared -AlarmId ID -Rule NAME -Severity LEVEL
#                   -ObjectName NAME -HostName NAME -Message TEXT [-Time ISO8601]
#                   [-WebhookUrl URL]
#   spike-alarm.ps1 -Test [-WebhookUrl URL]
#
# The Foglight @variable names that feed these arguments differ between Foglight
# versions and cartridges, so the Command Action arguments are the only thing you
# ever edit - the JSON Spike receives is the same on every version.
#
# Environment: SPIKE_WEBHOOK_URL, SPIKE_DEBUG (print the body before sending),
# SPIKE_CURL_TIMEOUT (seconds, default 10), SPIKE_RETRY_DELAY (seconds, default 3).

param(
    [string]$State,
    [string]$AlarmId,
    [string]$Rule,
    [string]$Severity,
    [Alias('Object')]
    [string]$ObjectName,
    [string]$HostName,
    [Alias('Summary')]
    [string]$Message,
    [string]$Time,
    [string]$WebhookUrl,
    [switch]$Test
)

# Windows PowerShell 5.1 still negotiates TLS 1.0 first on older builds.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.ServicePointManager]::SecurityProtocol

if (-not $WebhookUrl) { $WebhookUrl = $env:SPIKE_WEBHOOK_URL }

$timeout = 10
if ($env:SPIKE_CURL_TIMEOUT) { $timeout = [int]$env:SPIKE_CURL_TIMEOUT }

$retryDelay = 3
if ($env:SPIKE_RETRY_DELAY) { $retryDelay = [int]$env:SPIKE_RETRY_DELAY }

function Write-Usage {
    [Console]::Error.WriteLine(@'
Usage:
  spike-alarm.ps1 -State firing|cleared -AlarmId ID -Rule NAME -Severity LEVEL
                  -ObjectName NAME -HostName NAME -Message TEXT [-Time ISO8601]
                  [-WebhookUrl URL]
  spike-alarm.ps1 -Test [-WebhookUrl URL]
'@)
}

function ConvertTo-SpikeState {
    param([string]$Value)
    $normalized = "$Value".Trim().ToLowerInvariant()
    if ('firing', 'fire', 'entering', 'active' -contains $normalized) {
        return 'firing'
    }
    if ('cleared', 'clear', 'exiting', 'normal', 'recovery', 'resolved' -contains $normalized) {
        return 'cleared'
    }
    return ''
}

function ConvertTo-SpikeSeverity {
    param([string]$Value)
    # Some cartridges pass the severity as a number, Spike wants the word.
    $trimmed = "$Value".Trim()
    switch ($trimmed) {
        '0' { return 'Undefined' }
        '1' { return 'Normal' }
        '2' { return 'Warning' }
        '3' { return 'Critical' }
        '4' { return 'Fatal' }
    }
    return $trimmed
}

function Get-SpikeTimestamp {
    return [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
}

function Send-SpikeAlarm {
    param(
        [string]$AlarmState,
        [string]$AlarmIdentifier,
        [string]$RuleName,
        [string]$AlarmSeverity,
        [string]$MonitoredObject,
        [string]$MonitoredHost,
        [string]$AlarmSummary,
        [string]$Timestamp
    )
    # The key is "summary", never "message": a top-level "message" key makes
    # Spike's hooks service bypass the Foglight parser. The flag stays -Message
    # because that is the name of the Foglight variable feeding it.
    $payload = [ordered]@{
        source    = 'foglight'
        state     = $AlarmState
        alarm_id  = $AlarmIdentifier
        rule      = $RuleName
        severity  = $AlarmSeverity
        object    = $MonitoredObject
        host      = $MonitoredHost
        summary   = $AlarmSummary
        timestamp = $Timestamp
    }

    $body = ConvertTo-Json -InputObject $payload -Compress
    if ($env:SPIKE_DEBUG) { Write-Output $body }

    $lastError = ''
    foreach ($attempt in 1, 2) {
        try {
            Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body -Uri $WebhookUrl -TimeoutSec $timeout -ErrorAction Stop | Out-Null
            return
        }
        catch {
            $lastError = $_.Exception.Message
            if ($attempt -eq 1) { Start-Sleep -Seconds $retryDelay }
        }
    }

    Write-Error "spike-alarm.ps1: could not deliver the alarm to Spike - $lastError"
    exit 1
}

if (-not $WebhookUrl) {
    Write-Error 'spike-alarm.ps1: no webhook URL, pass -WebhookUrl or set SPIKE_WEBHOOK_URL'
    Write-Usage
    exit 2
}

if ($Test) {
    $testId = [guid]::NewGuid().ToString()
    $testNode = $env:COMPUTERNAME
    if (-not $testNode) { $testNode = 'spike-test-host' }

    Send-SpikeAlarm -AlarmState 'firing' -AlarmIdentifier $testId -RuleName 'Spike test' -AlarmSeverity 'Critical' -MonitoredObject $testNode -MonitoredHost $testNode -AlarmSummary "Spike test alarm on $testNode - this incident resolves itself" -Timestamp (Get-SpikeTimestamp)
    Write-Output 'spike-alarm.ps1: test alarm sent, an incident should now be open in Spike'

    Start-Sleep -Seconds 2

    Send-SpikeAlarm -AlarmState 'cleared' -AlarmIdentifier $testId -RuleName 'Spike test' -AlarmSeverity 'Normal' -MonitoredObject $testNode -MonitoredHost $testNode -AlarmSummary "Spike test alarm on $testNode has returned to normal" -Timestamp (Get-SpikeTimestamp)
    Write-Output 'spike-alarm.ps1: test clear sent, the incident should now be resolved in Spike'
    exit 0
}

if (-not $State) {
    Write-Error 'spike-alarm.ps1: -State is required, pass firing or cleared, nothing is inferred'
    Write-Usage
    exit 2
}

$spikeState = ConvertTo-SpikeState -Value $State
if (-not $spikeState) {
    Write-Error "spike-alarm.ps1: unknown state '$State', expected firing or cleared"
    exit 2
}

if (-not $AlarmId) {
    Write-Error 'spike-alarm.ps1: -AlarmId is required, without it Spike cannot match repeats and clears to the same incident'
    exit 2
}

# The incident title is built from these three, an empty one is worth saying out
# loud but is not worth dropping the alarm over.
$titleFields = [ordered]@{ '-Rule' = $Rule; '-ObjectName' = $ObjectName; '-Message' = $Message }
foreach ($name in $titleFields.Keys) {
    if (-not $titleFields[$name]) {
        Write-Warning "spike-alarm.ps1: $name is empty, the incident title will be incomplete"
    }
}

$timestamp = "$Time".Trim()
if (-not $timestamp) { $timestamp = Get-SpikeTimestamp }

Send-SpikeAlarm -AlarmState $spikeState -AlarmIdentifier "$AlarmId".Trim() -RuleName "$Rule".Trim() -AlarmSeverity (ConvertTo-SpikeSeverity -Value $Severity) -MonitoredObject "$ObjectName".Trim() -MonitoredHost "$HostName".Trim() -AlarmSummary "$Message" -Timestamp $timestamp
exit 0
```

</details>

Neither script needs anything installed beyond what the Management Server already has: bash and curl on Linux, Windows PowerShell 5.1 on Windows.

## Step 3 — Add two Command Actions to the rule

Open **Administration → Rules & Notifications → Rules**, find the rule you want to be paged for, and open its **Action** tab. Every rule you want in Spike needs **two** Command Actions, and the second one is the one people forget:

1. **The firing action.** Action type **Entering**, on the severity levels you want paged for, usually Warning, Critical and Fatal. Passes `--state firing`.
2. **The recovery action.** Action type **Exiting**, or an action on the **Normal** severity level on versions that model recovery that way. Passes `--state cleared`.

{% hint style="warning" %}
Without the second action nothing ever auto-resolves. Foglight clearing an alarm is invisible to Spike unless something tells Spike about it, so an incident opened by the first action stays open until somebody closes it by hand. Add both, on every rule.
{% endhint %}

On a Linux Management Server, fill the Command Action in like this:

| Field | Value |
| --- | --- |
| Command | `/opt/quest/foglight/scripts/spike-alarm.sh` |
| Arguments | the line below, on one line |

```
--state firing --alarm-id "@alarm_id" --rule "@rule_name" --severity "@severity" --object "@topology_object" --host "@host_name" --message "@message" --time "@time" --webhook-url "https://hooks.spike.sh/<your-token>/push-events"
```

The recovery action is the same line with `--state cleared`. If your Foglight version will not run the `.sh` directly, set the Command field to `/bin/bash` and put the script's path at the front of the Arguments line instead.

On a Windows Management Server, point the command at PowerShell and pass the script as a file:

| Field | Value |
| --- | --- |
| Command | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` |
| Arguments | the line below, on one line |

```
-NoProfile -ExecutionPolicy Bypass -File "C:\Quest\Foglight\scripts\spike-alarm.ps1" -State firing -AlarmId "@alarm_id" -Rule "@rule_name" -Severity "@severity" -ObjectName "@topology_object" -HostName "@host_name" -Message "@message" -Time "@time" -WebhookUrl "https://hooks.spike.sh/<your-token>/push-events"
```

{% hint style="warning" %}
**Check the `@` variable names against your own server.** The names above are the usual ones, but they move between Foglight versions and between cartridges, and a name that does not resolve arrives at the script as empty text. Use the variable picker in the Command Action editor to see what your rule actually exposes, and map what you find onto the flags: the alarm id onto `--alarm-id`, the severity onto `--severity`, the alarm message onto `--message`, and so on. Only this Arguments line changes. The JSON the script sends, and everything Spike does with it, is the same whatever the variables are called.
{% endhint %}

If you would rather not repeat the webhook URL in every rule, set `SPIKE_WEBHOOK_URL` in the environment of the account the Management Server runs as and leave `--webhook-url` off the Arguments line. The script falls back to it.

## Step 4 — Send a test alarm

Both scripts have a test mode that sends a synthetic alarm and then clears it two seconds later, so you can prove the whole path without waiting for a real alarm. Run it as the account Foglight runs as:

```bash
sudo -u foglight /opt/quest/foglight/scripts/spike-alarm.sh --test \
  --webhook-url "https://hooks.spike.sh/<your-token>/push-events"
```

```powershell
C:\Quest\Foglight\scripts\spike-alarm.ps1 -Test -WebhookUrl "https://hooks.spike.sh/<your-token>/push-events"
```

A resolved **Spike test** incident on your service means the Management Server can reach Spike, the URL is right, and the integration is wired to the escalation policy you expect. Because the test sends a matching clear, it cleans up after itself.

Then let a real alarm through, or lower a threshold on a test rule for a minute, and confirm the incident opens with the title you expect and resolves when Foglight clears the alarm.

## Things worth knowing

* **Every rule needs both actions.** There is no global "send all alarms to Spike" switch in Foglight, so the two Command Actions are added per rule, the same way a Nagios contact group is added per host and service.
* **Spike never writes back to Foglight.** Foglight's REST API can acknowledge and clear alarms, but this integration does not use it. Resolving an incident in Spike does not clear the alarm in Foglight, and acknowledging in Spike does not acknowledge in Foglight. Clear the alarm in Foglight, and Spike's incident closes with it.
* **The webhook URL is the credential.** Anyone who can read the rule can read the URL in the Arguments line. Keep the script itself readable only by the Foglight account, and rotate the integration in Spike if the URL leaks.
* **The script retries once.** If the first attempt fails it waits three seconds and tries again, then exits non-zero so the failure shows up in the Management Server's logs. Raise `SPIKE_CURL_TIMEOUT` or `SPIKE_RETRY_DELAY` if your network needs more, and keep the Command Action's own timeout above the total.
* **Quotes and newlines in an alarm message are safe.** Both scripts escape every value before sending, so a message containing quotes, backslashes or line breaks still produces valid JSON.

## Payload reference

The script posts a flat JSON object. Every value is a string.

```json
{
  "source": "foglight",
  "state": "firing",
  "alarm_id": "3e7a1c9d-4b2f-4a8e-9c1d-7f8a9b0c1d2e",
  "rule": "CPU Utilization - Critical",
  "severity": "Critical",
  "object": "db-prod-03",
  "host": "db-prod-03.acme.internal",
  "summary": "CPU utilization on db-prod-03 has been above 95% for 10 minutes",
  "timestamp": "2026-09-24T09:15:00Z"
}
```

| Field | What it does |
| --- | --- |
| `state` | `firing` opens or joins an incident, `cleared` resolves it |
| `alarm_id` | Identity. Everything Spike matches to an existing incident, it matches on this |
| `rule` | First part of the incident title |
| `severity` | `Warning`, `Critical` or `Fatal`, mapped to SEV2 or SEV1 |
| `object` | Second part of the incident title |
| `host` | Shown on the incident page |
| `summary` | The rest of the incident title |
| `timestamp` | The alarm time, defaulted to now in UTC when Foglight does not pass one |

{% hint style="info" %}
The alarm message is sent as `summary` and not as `message`, on purpose. A top-level `message` key tells Spike the body is already a finished alert, which would skip the Foglight parser and lose the title, the severity and the auto-resolve. If you adapt the script, keep the key names.
{% endhint %}

The clear for that same alarm looks like this:

```json
{
  "source": "foglight",
  "state": "cleared",
  "alarm_id": "3e7a1c9d-4b2f-4a8e-9c1d-7f8a9b0c1d2e",
  "rule": "CPU Utilization - Critical",
  "severity": "Warning",
  "object": "db-prod-03",
  "host": "db-prod-03.acme.internal",
  "summary": "CPU utilization on db-prod-03 has returned to normal",
  "timestamp": "2026-09-24T09:45:00Z"
}
```

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Run the script by hand as the Foglight account with `SPIKE_DEBUG=1`, which prints the JSON body before sending it and shows the transport error:

```bash
sudo -u foglight SPIKE_DEBUG=1 /opt/quest/foglight/scripts/spike-alarm.sh --test \
  --webhook-url "https://hooks.spike.sh/<your-token>/push-events"
```

```powershell
$env:SPIKE_DEBUG = "1"
C:\Quest\Foglight\scripts\spike-alarm.ps1 -Test -WebhookUrl "https://hooks.spike.sh/<your-token>/push-events"
```

A connection or timeout error means the Management Server cannot reach `hooks.spike.sh` on port 443, usually a proxy or an egress rule. An exit code of `2` means an argument never reached the script, most often the webhook URL.

</details>

<details>

<summary>The test works but real alarms do not</summary>

The test mode does not use Foglight's variables, so this is almost always a variable name that does not resolve on your server. Set `SPIKE_DEBUG=1` in the Command Action's environment, fire the rule, and look at the payload in the Management Server log: the fields that arrive empty are the ones whose `@` names are wrong for your version or cartridge. Fix them in the Arguments line, on both actions.

</details>

<details>

<summary>Incidents are created but never resolve</summary>

The rule has the firing Command Action but not the recovery one. Open the rule's **Action** tab and confirm there are two Command Actions, one Entering and one Exiting or Normal, and that the second passes `--state cleared`. A clear that arrives when nothing is open in Spike is dropped, which is the right behaviour if you already closed the incident by hand.

</details>

<details>

<summary>Every repeat opens a new incident</summary>

`--alarm-id` is arriving empty or changing between alarms. Spike matches repeats, escalations and clears on that value alone, so it has to be the alarm's own id and it has to be identical on the firing and the clearing action. Check the payload with `SPIKE_DEBUG=1`. Two different alarms on the same object are meant to be two incidents.

</details>

<details>

<summary>The incident lands on the wrong severity</summary>

Check what `--severity` actually received. `Fatal` and `Critical` are SEV1 and `Warning` is SEV2; anything else falls through to Spike's default. If your Foglight version passes a severity number, the script already translates `2`, `3` and `4`, but a custom rule with its own numbering would need mapping onto those words in the Arguments line. [Alert rules](../alerts/alert-rules.md) can override severity per service if Foglight's grading does not match how your team triages.

</details>

<details>

<summary>The Command Action never runs</summary>

Foglight runs it as the Management Server's own account. Confirm that account can read and execute the script, that the path in the Command field is absolute, and on Windows that the action calls `powershell.exe` with `-File` rather than the `.ps1` path on its own. The Management Server logs, under the `logs` directory of the installation, record the command it ran and its exit code.

</details>
