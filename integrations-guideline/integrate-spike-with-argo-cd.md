---
description: >-
  Send Argo CD notifications to Spike so a failed sync or an unhealthy application pages your on-call rotation, and the incident resolves when the app is healthy and synced again.
---

# Integrate Spike with Argo CD

[Argo CD](https://argo-cd.readthedocs.io) is a declarative GitOps continuous delivery tool for Kubernetes. It keeps each Application in your cluster matched to the Git revision it points at, and reports when a sync fails or the application stops being healthy.

Argo CD Notifications can post to any webhook. Point one at a Spike integration URL and a failed sync or a degraded application pages your on-call rotation, repeats join the incident already open, and the incident resolves itself when Argo CD reports the application healthy and synced.

Nothing is installed in your cluster. The setup is one webhook service, one template and a few triggers in the `argocd-notifications-cm` ConfigMap, plus a subscription on the applications you want to watch.

## What Spike does with each notification

Spike decides from two fields, `operation_phase` (the last sync operation) and `health_status` (the application's health).

| `operation_phase` | `health_status` | What Spike does |
| --- | --- | --- |
| `Failed` or `Error` | Any | Opens an incident and pages. A failed sync wins over health |
| Empty, `Succeeded`, `Running` or `Terminating` | `Degraded` | Opens an incident and pages |
| Empty or `Succeeded` | `Healthy` | Resolves the open incident |
| `Running` or `Terminating` | Any other than `Degraded` | Added to the open incident for the same application. Never opens one |
| Empty or `Succeeded` | `Progressing`, `Suspended`, `Missing` or `Unknown` | Added to the open incident for the same application. Never opens one |

An empty `operation_phase` (the application has not synced yet) or `<no value>` has no effect of its own. `sync_status` never opens or resolves anything.

{% hint style="info" %}
A recovery, or a `Progressing` or `Running` notification, that arrives with no matching open incident is dropped rather than turned into a new incident.
{% endhint %}

## Incident identity

Spike identifies the incident by `app_uid`, the Kubernetes UID of the Application object. It is stable across syncs and unique across clusters and Argo CD instances, so repeats join the incident already open and the recovery resolves it. Because the UID is the key, the title is for reading only and differs between the failure and the recovery.

`app_uid` counts only when it is a non-empty value and not an unexpanded template such as `{{.app.metadata.uid}}` or Go's `<no value>`. Without a usable `app_uid`, Spike falls back to `app`, together with `app_namespace` when that is usable, so two Applications with the same name in different namespaces stay separate. With neither, Spike matches the open incident by title, which is why the title is then the plain one with no sentence in it.

## Incident title

The title is Argo CD's own sentence followed by the application:

```
one or more objects failed to apply, reason: Deployment.apps "checkout-api" is invalid: spec.template.spec.containers[0].image: Required value — checkout-api
Deployment "checkout-api" exceeded its progress deadline — checkout-api
checkout-api recovered: Healthy and synced
```

| Event | Title |
| --- | --- |
| `operation_phase` `Failed` or `Error` | `{sync_message} — {app}` |
| `health_status` `Degraded` | `{health_message} — {app}` |
| Sentence empty | `{app} sync {operation_phase} in {destination_namespace}` or `{app} health {health_status} in {destination_namespace}`. ` in …` is dropped when `destination_namespace` is empty |
| Recovery | `{app} recovered: Healthy and synced` |
| No usable `app_uid` or `app` | `Argo CD sync {operation_phase}` or `Argo CD health {health_status}` |
| Nothing usable | `Argo CD alert with no details` |

`sync_message` is used only while `operation_phase` is `Failed` or `Error`; in any other phase it is a success line such as `successfully synced`. Whitespace in the sentence is collapsed and the title is capped at 200 characters. The sentence is cut, never ` — {app}`. Revisions, URLs and timestamps are never in the title; they are on the incident page.

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

## Step 3 — Add the service, template and triggers

Argo CD has no screen for notifications; they are configured in the `argocd-notifications-cm` ConfigMap. Edit it (`kubectl -n argocd edit configmap argocd-notifications-cm`) and add the following. `{{.context.argocdUrl}}` needs `context: argocdUrl: https://argocd.example.com` in the same ConfigMap.

```yaml
data:
  context: |
    argocdUrl: https://argocd.acme.io

  service.webhook.spike: |
    url: $spike-url
    headers:
    - name: Content-Type
      value: application/json

  template.spike-alert: |
    webhook:
      spike:
        method: POST
        body: |
          {
            "app_uid": {{ .app.metadata.uid | toJson }},
            "app": {{ .app.metadata.name | toJson }},
            "app_namespace": {{ .app.metadata.namespace | toJson }},
            "project": {{ .app.spec.project | toJson }},
            "destination_namespace": {{ .app.spec.destination.namespace | toJson }},
            "health_status": {{ dig "status" "health" "status" "" .app | toJson }},
            "health_message": {{ dig "status" "health" "message" "" .app | toJson }},
            "sync_status": {{ dig "status" "sync" "status" "" .app | toJson }},
            "revision": {{ dig "status" "sync" "revision" "" .app | toJson }},
            "operation_phase": {{ dig "status" "operationState" "phase" "" .app | toJson }},
            "sync_message": {{ dig "status" "operationState" "message" "" .app | toJson }},
            "finished_at": {{ dig "status" "operationState" "finishedAt" "" .app | toJson }},
            "repo_url": {{ dig "spec" "source" "repoURL" "" .app | toJson }},
            "app_url": "{{ .context.argocdUrl }}/applications/{{ .app.metadata.name }}"
          }

  trigger.on-spike-sync-failed: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Error', 'Failed']
      send: [spike-alert]
      oncePer: app.status.operationState.finishedAt

  trigger.on-spike-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [spike-alert]

  trigger.on-spike-recovered: |
    - when: app.status.health.status == 'Healthy' and app.status.sync.status == 'Synced'
      send: [spike-alert]
```

Send the body exactly as shown, field for field. The example below is what a failed sync looks like once rendered:

```json
{
  "app_uid": "6f1c2e3a-8b4d-4f7e-9a21-3c5d7e9f0b12",
  "app": "checkout-api",
  "app_namespace": "argocd",
  "project": "payments",
  "destination_namespace": "checkout",
  "health_status": "Healthy",
  "health_message": "",
  "sync_status": "OutOfSync",
  "revision": "9f2c4e1b7a3d5f6e8c0b1a2d3e4f5a6b7c8d9e0f",
  "operation_phase": "Failed",
  "sync_message": "one or more objects failed to apply, reason: Deployment.apps \"checkout-api\" is invalid: spec.template.spec.containers[0].image: Required value",
  "finished_at": "2026-10-13T03:12:44Z",
  "repo_url": "https://github.com/acme/deploy-manifests.git",
  "app_url": "https://argocd.acme.io/applications/checkout-api"
}
```

And the recovery, once the app is healthy and synced again:

```json
{
  "app_uid": "6f1c2e3a-8b4d-4f7e-9a21-3c5d7e9f0b12",
  "app": "checkout-api",
  "app_namespace": "argocd",
  "project": "payments",
  "destination_namespace": "checkout",
  "health_status": "Healthy",
  "health_message": "",
  "sync_status": "Synced",
  "revision": "b41d7e09c2a85f3e6d1c0b9a8f7e6d5c4b3a2918",
  "operation_phase": "Succeeded",
  "sync_message": "successfully synced (all tasks run)",
  "finished_at": "2026-10-13T03:31:07Z",
  "repo_url": "https://github.com/acme/deploy-manifests.git",
  "app_url": "https://argocd.acme.io/applications/checkout-api"
}
```

| Field | Used for |
| --- | --- |
| `app_uid` | The incident's identity. Strongly recommended; see [Incident identity](#incident-identity) |
| `app` | **Required.** The end of every title and the fallback identity |
| `app_namespace` | Used with `app` in the fallback identity |
| `health_status` | **Required.** `Degraded` opens, `Healthy` resolves |
| `operation_phase` | **Required.** `Failed` and `Error` open, `Succeeded` resolves together with `Healthy` |
| `sync_message` | The sentence in a sync failure title |
| `health_message` | The sentence in a degraded title |
| `destination_namespace` | ` in {destination_namespace}` in the built titles |
| `project`, `sync_status`, `revision`, `finished_at`, `repo_url`, `app_url` | Incident details only. `repo_url` is empty for multi-source Applications |

{% hint style="warning" %}
Argo CD fills the template from the live Application, so a field it does not have renders empty. A health-only notification can arrive with no `operationState` at all, which Spike reads as an empty `operation_phase`. Check the rendered body with a test notification (Step 5) before relying on it.
{% endhint %}

## Step 4 — Subscribe your applications

Subscriptions are annotations. Add them to a single Application, or to an AppProject to cover every Application in it:

```bash
kubectl -n argocd annotate application checkout-api \
  notifications.argoproj.io/subscribe.on-spike-sync-failed.spike="" \
  notifications.argoproj.io/subscribe.on-spike-health-degraded.spike="" \
  notifications.argoproj.io/subscribe.on-spike-recovered.spike=""
```

The part after `subscribe.` is the trigger name and the last part, `spike`, is the webhook service from Step 3. The value stays empty because a webhook service has no recipient.

{% hint style="info" %}
Always subscribe the recovery trigger together with the failure triggers. Without `on-spike-recovered`, Spike opens incidents and nothing resolves them until somebody does it by hand. A [resolve timer](../incidents/resolve-timer.md) is a reasonable backstop.
{% endhint %}

{% content-ref url="archive-an-integration.md" %}
[archive-an-integration.md](archive-an-integration.md)
{% endcontent-ref %}

## Step 5 — Confirm it end to end

1. In the Argo CD UI, open the Application, go to **Details → Notifications** (or use the CLI below) and send a test notification:

   ```bash
   argocd admin notifications template notify spike-alert checkout-api \
     --recipient webhook:spike
   ```

2. Check the incident that opens in Spike. Its page should show the Application name, UID, the phase and the health status. A test sent from a healthy, synced app is read as a recovery and is dropped when nothing is open.
3. Break a sync on purpose (for example a manifest with a missing required field) and look for a incident titled with the sync error and your application name that escalates through your policy.
4. Fix the manifest, sync again, and watch the incident resolve; its last event is titled `<app> recovered: Healthy and synced`.

## Things worth knowing

* **One service covers every application.** Add the webhook service once; subscribe as many Applications or projects as you like.
* **Triggers fire once per operation.** `on-spike-sync-failed` uses `oncePer` on the operation's `finishedAt`, so each failed operation notifies once. The open incident is still open.
* **Health recovers without a sync.** An application that goes `Degraded` and heals on its own sends no sync, which is why the recovery trigger watches health rather than only the deployed trigger.
* **Resolving in Spike does not touch Argo CD.** The Application keeps its status; the next failure opens a fresh incident.

## Troubleshooting

<details>

<summary>Nothing arrives in Spike</summary>

Check that the Application carries the `notifications.argoproj.io/subscribe...` annotations, that the trigger names match the ConfigMap, and that `spike-url` exists in `argocd-notifications-secret`. The notifications controller logs each delivery and each failure: `kubectl -n argocd logs deploy/argocd-notifications-controller`.

</details>

<details>

<summary>The webhook body is not valid JSON</summary>

Every value in the template ends in `| toJson`, which quotes strings and renders empty values safely. A value added without it breaks the JSON as soon as Argo CD renders a message containing a quote or a newline.

</details>

<details>

<summary>Incidents never resolve</summary>

Spike resolves when the body shows `health_status` `Healthy` and `operation_phase` is `Succeeded` or empty. Check that `on-spike-recovered` is subscribed, and that the rendered body carries the same `app_uid` as the incident that opened.

</details>

<details>

<summary>An incident titled "Argo CD alert with no details" opened</summary>

The body reached Spike without an Application name or any state Spike recognises. Open the payload on the incident page and compare it with the template in Step 3.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of the Argo Project or the Linux Foundation.
