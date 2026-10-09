---
description: >-
  Send Argo CD notifications to Spike so a failed sync or an unhealthy application pages your on-call rotation, and the incident resolves when the app is synced and healthy again.
---

# Integrate Spike with Argo CD

[Argo CD](https://argo-cd.readthedocs.io) is a declarative GitOps continuous delivery tool for Kubernetes. It keeps each Application in your cluster matched to the Git revision it points at, and reports when a sync fails or the application stops being healthy.

Argo CD Notifications can post to any webhook. Point one at a Spike integration URL and a failed sync or a degraded application pages your on-call rotation, repeats join the incident already open, and the incident resolves itself when Argo CD reports the application synced and healthy.

Nothing is installed in your cluster. The setup is one webhook service, one template and a few triggers in the `argocd-notifications-cm` ConfigMap, plus a subscription on the applications you want to watch.

## What Spike does with each notification

Spike reads three fields from the body and decides from those alone.

| State | What Argo CD sends | What Spike does |
| --- | --- | --- |
| Sync failed | `app.status.operationState.phase` is `Failed` | Opens an incident and pages |
| Sync errored | `app.status.operationState.phase` is `Error` | Opens an incident and pages |
| Health failed | `app.status.health.status` is `Degraded`, `Missing` or `Unknown` | Opens an incident and pages |
| Sync status unknown | `app.status.sync.status` is `Unknown` | Opens an incident and pages |
| Recovered | `app.status.operationState.phase` is `Succeeded` (or absent) and `app.status.health.status` is `Healthy` | Resolves the open incident |
| Anything else | For example `Running`, `Progressing`, `Suspended`, `OutOfSync` | Neither opens nor resolves |

`app.status.operationState` is absent when Argo CD notifies about health only. Spike treats an absent operation state as "not failed".

{% hint style="info" %}
A recovery that arrives with no matching open incident is dropped rather than turned into a new incident.
{% endhint %}

## Incident identity

Spike identifies the incident by the Application name, `app.metadata.name`. Every notification for `checkout-api` joins the one incident open for `checkout-api`, and a recovery for `checkout-api` resolves it. When `app.metadata.namespace` is present on both the open incident and the notification, it must match as well, so two Applications with the same name in different namespaces stay separate.

Because the name is the key, the title is for reading only and may change between the failure and the recovery.

## Incident title

Spike builds the title around the application and Argo CD's own words about the fault:

```
Sync failed on checkout-api: Deployment checkout-api is missing its container image
Sync error on checkout-api
Health degraded on checkout-api: Deployment "checkout-api" exceeded its progress deadline
Health missing on checkout-api
Sync status unknown on checkout-api
Checkout-api is synced and healthy
```

The reason after the colon is `app.status.operationState.message` for a sync failure and `app.status.health.message` for a health failure. When Argo CD sends none, the title is the short form without a reason. Revisions, URLs and timestamps are never in the title. They are on the incident page. Titles are capped at 200 characters and the reason is what gets shortened.

If the body has no `app.metadata.name`, the title only names the state, for example `Argo CD sync failed`, and a body with no usable state is titled `Argo CD alert with no details`.

## Severity

Spike does not read a severity from the Argo CD payload, so incidents open at your integration's default. Use an [alert rule](../alerts/alert-rules.md) on `app.status.health.status`, `app.spec.project` or the application name to set severity, route to another service or suppress. Read more about [priority and severity](../incidents/priority-and-severity.md).

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

Edit `argocd-notifications-cm` (`kubectl -n argocd edit configmap argocd-notifications-cm`) and add the following. All of the keys below are required.

```yaml
data:
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
            "app": {
              "metadata": {
                "name": {{ .app.metadata.name | toJson }},
                "namespace": {{ .app.metadata.namespace | toJson }}
              },
              "spec": {
                "project": {{ .app.spec.project | toJson }},
                "destination": {
                  "server": {{ .app.spec.destination.server | toJson }},
                  "namespace": {{ .app.spec.destination.namespace | toJson }}
                }
              },
              "status": {
                "sync": {
                  "status": {{ .app.status.sync.status | toJson }},
                  "revision": {{ .app.status.sync.revision | toJson }}
                },
                "health": {
                  "status": {{ .app.status.health.status | toJson }},
                  "message": {{ .app.status.health.message | toJson }}
                },
                "operationState": {
                  "phase": {{ .app.status.operationState.phase | toJson }},
                  "message": {{ .app.status.operationState.message | toJson }},
                  "startedAt": {{ .app.status.operationState.startedAt | toJson }},
                  "finishedAt": {{ .app.status.operationState.finishedAt | toJson }},
                  "syncResult": {
                    "revision": {{ .app.status.operationState.syncResult.revision | toJson }}
                  }
                }
              }
            }
          }

  trigger.on-spike-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [spike-alert]
      oncePer: app.status.operationState.syncResult.revision

  trigger.on-spike-health-degraded: |
    - when: app.status.health.status in ['Degraded', 'Missing', 'Unknown']
      send: [spike-alert]

  trigger.on-spike-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send: [spike-alert]

  trigger.on-spike-recovered: |
    - when: app.status.health.status == 'Healthy' and app.status.sync.status == 'Synced'
      send: [spike-alert]
```

Send the body exactly as shown. Each of these fields is read by Spike or kept on the incident page; do not rename any of them.

| Field | Used for |
| --- | --- |
| `app.metadata.name` | **Required.** The incident's identity and the end of every title |
| `app.metadata.namespace` | Secondary match key, used only when present on both sides |
| `app.status.operationState.phase` | **Required for sync failures.** `Failed` or `Error` opens, `Succeeded` recovers |
| `app.status.operationState.message` | The reason in a sync failure title |
| `app.status.health.status` | **Required for health failures and recovery** |
| `app.status.health.message` | The reason in a health failure title |
| `app.status.sync.status` | `Unknown` opens an incident |
| `app.status.sync.revision`, `app.status.operationState.syncResult.revision` | Incident details only |
| `app.status.operationState.startedAt`, `finishedAt` | Incident details only |
| `app.spec.project`, `app.spec.destination.server`, `app.spec.destination.namespace` | Incident details only |

{% hint style="warning" %}
Argo CD fills the template from the live Application, so a field Argo CD does not have is rendered as an empty value. Health-only notifications can arrive with no `operationState` at all. Spike reads an empty or missing `operationState` as "not failed", so this is safe, but check the rendered body with a test notification before relying on it (Step 5).
{% endhint %}

## Step 4 — Subscribe your applications

Subscriptions are annotations. Add them to a single Application, or to an AppProject to cover every Application in it:

```bash
kubectl -n argocd annotate application checkout-api \
  notifications.argoproj.io/subscribe.on-spike-sync-failed.spike="" \
  notifications.argoproj.io/subscribe.on-spike-health-degraded.spike="" \
  notifications.argoproj.io/subscribe.on-spike-sync-status-unknown.spike="" \
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

2. Check the incident that opens in Spike. Its page should show the Application name, the phase and the health status. A test sent from a healthy, synced app is read as a recovery and is dropped when nothing is open.
3. Break a sync on purpose (for example a manifest with a missing required field) and look for a `Sync failed on <app>` incident that escalates through your policy.
4. Fix the manifest, sync again, and watch the incident resolve with `<App> is synced and healthy`.

## Things worth knowing

* **One service covers every application.** Add the webhook service once; subscribe as many Applications or projects as you like.
* **Triggers fire once per revision.** `on-spike-sync-failed` uses `oncePer` on the synced revision, so a second failure on the same revision does not notify again. The open incident is still open.
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

Spike resolves when the body shows health `Healthy` and the sync phase is `Succeeded` or absent. Check that `on-spike-recovered` is subscribed, and that the rendered body carries the same `app.metadata.name` as the incident that opened.

</details>

<details>

<summary>An incident titled "Argo CD alert with no details" opened</summary>

The body reached Spike without an Application name or any state Spike recognises. Open the payload on the incident page and compare it with the template in Step 3.

</details>

Disclaimer: These integration instructions are offered independently by Spike.sh, and Spike.sh is not affiliated with nor a partner of the Argo Project or the Linux Foundation.
