---
description: >-
  Send Argo CD notifications to Spike so a failed sync or an unhealthy application pages your on-call rotation, and the incident resolves when the app is healthy and synced again.
---

# Integrate Spike with Argo CD

[Argo CD](https://argo-cd.readthedocs.io) is a declarative GitOps continuous delivery tool for Kubernetes. It keeps each Application in your cluster matched to the Git revision it points at, and reports when a sync fails or the application stops being healthy.

Argo CD Notifications can post to any webhook. Point one at a Spike integration URL and a failed sync or a degraded application pages your on-call rotation, repeats join the incident already open, and the incident resolves itself when Argo CD reports the application healthy and synced.

Nothing is installed in your cluster. The setup is one webhook service, two templates and two triggers in the `argocd-notifications-cm` ConfigMap, plus a subscription on the applications you want to watch.

## How Spike reads a notification

Spike reads the `status` field you type into each template and the Application's UID.

| `status` | What Spike does |
| --- | --- |
| `firing` | Opens an incident, or joins the open one for the same `app_uid` |
| `resolved` | Resolves the open incident with the same `app_uid`. With nothing open, the recovery is dropped |
| Anything else, or missing | Treated as `firing`. Spike never resolves on it |

`operation_phase`, `health_status` and `sync_status` only choose the wording of the title. They never open or close anything.

## Incident identity

Spike identifies the incident by `app_uid`, the Application's Kubernetes UID. It is stable for the Application's whole life, so repeats join the incident already open and the recovery resolves it. The title is for reading only.

`app_uid` counts only when it is a non-empty string (or a number) and not an unexpanded template: `<no value>`, anything containing `{{` or `}}`, or a whole value like `$app_uid`, `${app_uid}` or `%app_uid%`. Two alerts with the same unexpanded `app_uid` are therefore not treated as one. Without a usable `app_uid`, Spike matches the open incident by title instead, so the title is then the plain one with no Argo CD sentence in it.

## Incident title

| Event | Title |
| --- | --- |
| `operation_phase` `Failed` or `Error`, with `operation_message` and a usable `app_uid` | `{operation_message} on {app}` |
| `operation_phase` `Failed` or `Error`, any other case | `Sync failed on {app}` |
| `health_status` `Degraded`, `Missing` or `Unknown` | `Health {health_status} on {app}` |
| `sync_status` `Unknown` | `Sync status Unknown on {app}` |
| Anything else | `Argo CD alert on {app}` |
| `status` `resolved` | `{app} is synced and healthy` |

With no usable `app`, ` on {app}` is left off (`Sync failed`, `Argo CD application is synced and healthy`), and with nothing usable the title is `Argo CD alert with no details`. Whitespace in the sentence is collapsed, and ` on {app}` is left off when the sentence already names the application as a whole word. Titles are capped at 200 characters: ` on {app}` is kept whole and the sentence is cut at a word boundary with `...`. Revisions, URLs and timestamps are never in the title.

Argo CD may change `operation_message` between deliveries (for example by appending `(retried 2 times)`). That is fine: the `app_uid` is what joins them.

## Severity

Spike does not read a severity from the Argo CD payload, so incidents open at your integration's default. Use an [alert rule](../alerts/alert-rules.md) on `health_status`, `project` or `app` to set severity, route to another service or suppress. Read more about [priority and severity](../incidents/priority-and-severity.md).

## Prerequisites

* Argo CD with the Notifications controller running (bundled with Argo CD 2.3 and later)
* Permission to edit the `argocd-notifications-cm` ConfigMap and to annotate Applications or AppProjects
* An Argo CD integration in Spike and its webhook URL
* Nothing to open on your network. Argo CD calls out to Spike, so your cluster needs outbound HTTPS to `hooks.spike.sh`

## Step 1 — Create the integration in Spike

In Spike, go to **Integrations → Add integration → Argo CD**, attach it to a service and an escalation policy, and copy the webhook URL. It looks like `https://hooks.spike.sh/<your-token>/push-events`.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

## Step 2 — Store the webhook URL in Argo CD

The URL contains your token, so keep it in the `argocd-notifications-secret` Secret rather than in the ConfigMap:

```bash
kubectl -n argocd patch secret argocd-notifications-secret \
  --type merge -p '{"stringData": {"spike-url": "https://hooks.spike.sh/<your-token>/push-events"}}'
```

If you manage the Secret declaratively, add a `spike-url` key to it instead.

## Step 3 — Add the service, templates and triggers

Argo CD has no screen for notifications; they are configured in the `argocd-notifications-cm` ConfigMap. Edit it (`kubectl -n argocd edit configmap argocd-notifications-cm`) and add the following. Argo CD has no variable that says which trigger fired, so the `status` value is typed into each template as a literal. `{{.context.argocdUrl}}` needs the `context` entry shown.

```yaml
data:
  context: |
    argocdUrl: https://argocd.example.com

  service.webhook.spike: |
    url: $spike-url
    headers:
    - name: Content-Type
      value: application/json

  template.spike-firing: |
    webhook:
      spike:
        method: POST
        body: |
          {
            "status": "firing",
            "app": {{ .app.metadata.name | toJson }},
            "app_uid": {{ .app.metadata.uid | toJson }},
            "app_namespace": {{ .app.metadata.namespace | toJson }},
            "project": {{ .app.spec.project | toJson }},
            "health_status": {{ .app.status.health.status | toJson }},
            "sync_status": {{ .app.status.sync.status | toJson }},
            "operation_phase": {{ if .app.status.operationState }}{{ .app.status.operationState.phase | toJson }}{{ else }}""{{ end }},
            "operation_message": {{ if .app.status.operationState }}{{ .app.status.operationState.message | toJson }}{{ else }}""{{ end }},
            "revision": {{ .app.status.sync.revision | toJson }},
            "destination_server": {{ .app.spec.destination.server | toJson }},
            "destination_namespace": {{ .app.spec.destination.namespace | toJson }},
            "finished_at": {{ if .app.status.operationState }}{{ .app.status.operationState.finishedAt | toJson }}{{ else }}""{{ end }},
            "app_url": "{{ .context.argocdUrl }}/applications/{{ .app.metadata.name }}"
          }

  template.spike-resolved: |
    webhook:
      spike:
        method: POST
        body: |
          {
            "status": "resolved",
            "app": {{ .app.metadata.name | toJson }},
            "app_uid": {{ .app.metadata.uid | toJson }},
            "app_namespace": {{ .app.metadata.namespace | toJson }},
            "project": {{ .app.spec.project | toJson }},
            "health_status": {{ .app.status.health.status | toJson }},
            "sync_status": {{ .app.status.sync.status | toJson }},
            "operation_phase": {{ if .app.status.operationState }}{{ .app.status.operationState.phase | toJson }}{{ else }}""{{ end }},
            "operation_message": {{ if .app.status.operationState }}{{ .app.status.operationState.message | toJson }}{{ else }}""{{ end }},
            "revision": {{ .app.status.sync.revision | toJson }},
            "destination_server": {{ .app.spec.destination.server | toJson }},
            "destination_namespace": {{ .app.spec.destination.namespace | toJson }},
            "finished_at": {{ if .app.status.operationState }}{{ .app.status.operationState.finishedAt | toJson }}{{ else }}""{{ end }},
            "app_url": "{{ .context.argocdUrl }}/applications/{{ .app.metadata.name }}"
          }

  trigger.on-spike-sync-failed: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Error', 'Failed']
      send: [spike-firing]
      oncePer: app.status.operationState.finishedAt

  trigger.on-spike-health-degraded: |
    - when: app.status.health.status in ['Degraded', 'Missing', 'Unknown']
      send: [spike-firing]

  trigger.on-spike-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send: [spike-firing]

  trigger.on-spike-resolved: |
    - when: app.status.health.status == 'Healthy' and app.status.sync.status == 'Synced'
      send: [spike-resolved]
```

Send the body exactly as shown, field for field. This is what a failed sync looks like once rendered:

```json
{
  "status": "firing",
  "app": "checkout-prod",
  "app_uid": "6f1c2b7e-9d4a-4c8e-b3a1-2e5f7d9c0a14",
  "app_namespace": "argocd",
  "project": "payments",
  "health_status": "Healthy",
  "sync_status": "OutOfSync",
  "operation_phase": "Failed",
  "operation_message": "one or more objects failed to apply, reason: Deployment.apps \"checkout\" is invalid: spec.template.spec.containers[0].image: Required value",
  "revision": "a3f9c1d27be84e0f5c6d9b21e7a4f0c8d3b5e6a1",
  "destination_server": "https://kubernetes.default.svc",
  "destination_namespace": "checkout",
  "finished_at": "2026-10-14T03:12:44Z",
  "app_url": "https://argocd.example.com/applications/checkout-prod"
}
```

And the recovery, once the application is healthy and synced again:

```json
{
  "status": "resolved",
  "app": "checkout-prod",
  "app_uid": "6f1c2b7e-9d4a-4c8e-b3a1-2e5f7d9c0a14",
  "app_namespace": "argocd",
  "project": "payments",
  "health_status": "Healthy",
  "sync_status": "Synced",
  "operation_phase": "Succeeded",
  "operation_message": "successfully synced (all tasks run)",
  "revision": "c71e0b94f2d35a8e6b1c4f07d9a2e5b8f3c6d1a0",
  "destination_server": "https://kubernetes.default.svc",
  "destination_namespace": "checkout",
  "finished_at": "2026-10-14T03:41:09Z",
  "app_url": "https://argocd.example.com/applications/checkout-prod"
}
```

| Field | Used for |
| --- | --- |
| `status` | **Required.** `firing` or `resolved`, typed as a literal in each template |
| `app_uid` | **Required for joining and resolving.** The incident's identity; see [Incident identity](#incident-identity) |
| `app` | **Required.** The application name at the end of every title |
| `operation_message` | The sentence in a sync failure title, when `operation_phase` is `Failed` or `Error` and `app_uid` is usable |
| `operation_phase` | `Failed` or `Error` selects the sync failed title |
| `health_status` | `Degraded`, `Missing` or `Unknown` selects the health title |
| `sync_status` | `Unknown` selects the sync status title |
| `app_namespace`, `project`, `revision`, `destination_server`, `destination_namespace`, `finished_at`, `app_url` | Incident details only |

{% hint style="warning" %}
Do not add a top-level `message` key to the body. Spike would use it as the incident title and skip the Argo CD parser, so titles, the recovery title and the id rules above would no longer apply.
{% endhint %}

{% hint style="warning" %}
`operationState` does not exist until the first sync, so the template guards the `operation_*` and `finished_at` fields with `{{ if .app.status.operationState }}`. A field Argo CD cannot fill may arrive as `<no value>`; Spike treats that as missing. Check the rendered body with a test notification (Step 5) before relying on it.
{% endhint %}

## Step 4 — Subscribe your applications

Subscriptions are annotations. Add them to a single Application, or to an AppProject to cover every Application in it:

```bash
kubectl -n argocd annotate application checkout-prod \
  notifications.argoproj.io/subscribe.on-spike-sync-failed.spike="" \
  notifications.argoproj.io/subscribe.on-spike-health-degraded.spike="" \
  notifications.argoproj.io/subscribe.on-spike-sync-status-unknown.spike="" \
  notifications.argoproj.io/subscribe.on-spike-resolved.spike=""
```

The part after `subscribe.` is the trigger name and the last part, `spike`, is the webhook service from Step 3. The value stays empty because a webhook service has no recipient.

{% hint style="info" %}
Always subscribe the recovery trigger with the failure triggers. Without `on-spike-resolved`, Spike opens incidents and nothing resolves them until somebody does it by hand. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop. The recovery is a custom trigger because the catalogue's `on-deployed` fires once per revision, so a health recovery without a new commit would not be reported.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 5 — Confirm it end to end

1. Send a test notification from the CLI:

   ```bash
   argocd admin notifications template notify spike-firing checkout-prod \
     --recipient spike
   ```

2. Check the incident that opens in Spike. Its page shows the application name, UID, phase and health status.
3. Break a sync on purpose (for example a manifest with a missing required field) and look for an incident titled with the sync error and your application name.
4. Fix the manifest, sync again, and watch the incident resolve; its last event is titled `<app> is synced and healthy`.

## Things worth knowing

* **One service covers every application.** Add the webhook service once; subscribe as many Applications or projects as you like.
* **Each fault has its own trigger.** A trigger without `oncePer` sends once each time its condition goes from false to true. Keeping sync failure, health and sync status in separate triggers means a new fault still sends while another is active, for example a failed sync on an application that is already `Degraded`. `on-spike-sync-failed` uses `oncePer` on the operation's `finishedAt`, so each failed operation notifies once.
* **Resolving in Spike does not touch Argo CD.** The Application keeps its status; the next failure opens a fresh incident.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Application carries the `notifications.argoproj.io/subscribe...` annotations, that the trigger names match the ConfigMap, and that `spike-url` exists in `argocd-notifications-secret`. The notifications controller logs each delivery and each failure: `kubectl -n argocd logs deploy/argocd-notifications-controller`.

</details>

<details>

<summary>The webhook body is not valid JSON</summary>

Every string value in the template ends in `| toJson`, which quotes strings safely. A value added without it breaks the JSON as soon as Argo CD renders a message containing a quote or a newline.

</details>

<details>

<summary>Incidents never resolve</summary>

Check that `on-spike-resolved` is subscribed, that its template sends `"status": "resolved"`, and that the rendered body carries the same `app_uid` as the incident that opened.

</details>

<details>

<summary>An incident titled "Argo CD alert with no details" opened</summary>

The body reached Spike without an application name or any state Spike recognises. Open the payload on the incident page and compare it with the template in Step 3.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of the Argo Project or the Linux Foundation.
