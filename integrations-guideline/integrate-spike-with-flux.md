---
description: "Connect Flux to Spike to get alerted when a Kustomization, HelmRelease or source fails to reconcile, and have the incident resolve when it reconciles again."
---
# Flux

## Overview

[Flux](https://fluxcd.io) is a GitOps toolkit for Kubernetes. It keeps your clusters in sync with configuration stored in Git, OCI registries and Helm repositories. Flux's notification-controller forwards events from its controllers (kustomize-controller, helm-controller, source-controller and others) to external systems.

With Spike's integration, you can receive real-time alerts when Flux reports problems such as:

* **Failed reconciliations**: A Kustomization or HelmRelease could not be applied, for example because of a validation error.
* **Failed health checks**: Resources applied by Flux did not become ready in time.
* **Build and fetch failures**: Kustomize builds, Git clones or artifact downloads fail.
* **Helm action failures**: Helm installs, upgrades, tests or rollbacks fail.

Spike uses the Kubernetes UID of the Flux object (the Kustomization, HelmRelease, GitRepository and so on) to group repeated failures into one incident and to resolve it when the same object reports a successful reconciliation.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly.
{% endhint %}

## Set up instructions

**Step 1:** Create a Flux integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Flux" %}

**Prerequisites:**
* Flux is installed on your cluster, including the notification-controller.
* You can apply resources to the `flux-system` namespace (or the namespace where you keep your Flux notification resources).

You send events to Spike with a Flux `Provider` of type `generic` and an `Alert` that points at it.

1. **Create a Secret holding the Spike webhook URL:**

   ```bash
   kubectl -n flux-system create secret generic spike-webhook \
     --from-literal=address=<SPIKE_WEBHOOK_URL>
   ```

   Replace `<SPIKE_WEBHOOK_URL>` with the webhook URL copied in Step 1.

2. **Create the Provider:**

   ```yaml
   apiVersion: notification.toolkit.fluxcd.io/v1beta3
   kind: Provider
   metadata:
     name: spike
     namespace: flux-system
   spec:
     type: generic
     secretRef:
       name: spike-webhook
   ```

3. **Create the Alert:**

   ```yaml
   apiVersion: notification.toolkit.fluxcd.io/v1beta3
   kind: Alert
   metadata:
     name: spike
     namespace: flux-system
   spec:
     providerRef:
       name: spike
     eventSeverity: info
     eventSources:
       - kind: Kustomization
         name: '*'
       - kind: HelmRelease
         name: '*'
       - kind: GitRepository
         name: '*'
     eventMetadata:
       cluster: prod-eu-1
   ```

   * **providerRef** (required): the Provider created in the previous step.
   * **eventSources** (required): the Flux objects to watch. Add or remove kinds as needed, and set `namespace` on a source to limit it to one namespace.
   * **eventSeverity** (required for auto-resolution): use `info` so Flux also sends success events. With `error`, incidents open but never resolve automatically.
   * **eventMetadata.cluster** (optional): the name of your cluster. Spike shows it in the incident title as `in <cluster>`, which helps when several clusters send to the same integration.

4. **Apply the manifests:**

   ```bash
   kubectl apply -f spike-provider.yaml -f spike-alert.yaml
   ```

5. **Test the Integration:**
   * Make a Kustomization fail, for example by committing an invalid manifest to the watched path.
   * Verify that a new incident appears in Spike with Flux's error message and the object name.
   * Fix the manifest and verify that the incident resolves after the next successful reconciliation.

{% endtab %}
{% endtabs %}

## Event payload structure

Flux sends each event to Spike as a JSON payload. A failure looks like this:

```json
{
  "involvedObject": {
    "apiVersion": "kustomize.toolkit.fluxcd.io/v1",
    "kind": "Kustomization",
    "name": "webapp",
    "namespace": "apps",
    "uid": "7d0cdc51-ddcf-4743-b223-83ca5c699632"
  },
  "metadata": {
    "revision": "main@sha1:731f7eaddfb6af01cb2173e18f0f75b0ba780ef1",
    "cluster": "prod-eu-1"
  },
  "severity": "error",
  "reason": "ValidationFailed",
  "message": "service/apps/webapp validation error: spec.type: Unsupported value: Ingress",
  "reportingController": "kustomize-controller",
  "reportingInstance": "kustomize-controller-7c7b47f5f-8bhrp",
  "timestamp": "2022-10-28T07:26:19Z"
}
```

When the same object reconciles successfully, Flux sends a recovery event:

```json
{
  "involvedObject": {
    "apiVersion": "kustomize.toolkit.fluxcd.io/v1",
    "kind": "Kustomization",
    "name": "webapp",
    "namespace": "apps",
    "uid": "7d0cdc51-ddcf-4743-b223-83ca5c699632"
  },
  "metadata": {
    "revision": "main@sha1:9b2e41c07d5f3a8e6c1d0f4b7a2e9c3d8f6a1b05",
    "commit_status": "update",
    "cluster": "prod-eu-1"
  },
  "severity": "info",
  "reason": "ReconciliationSucceeded",
  "message": "Reconciliation finished in 1.204s, next run in 10m0s",
  "reportingController": "kustomize-controller",
  "reportingInstance": "kustomize-controller-7c7b47f5f-8bhrp",
  "timestamp": "2022-10-28T07:41:22Z"
}
```

**Key Fields:**
* `involvedObject.uid` - Kubernetes UID of the Flux object. Spike uses it to match repeat and recovery events to the open incident. If it is missing, Spike matches on `kind`, `namespace` and `name` together.
* `involvedObject.kind`, `involvedObject.namespace`, `involvedObject.name` - The Flux object the event is about. They appear in the incident title.
* `severity` - `error` opens an incident. `info` with a `reason` ending in `Succeeded` resolves it. Other `info` events and `trace` events never open or resolve an incident.
* `reason` - Machine-readable reason, for example `ValidationFailed` or `ReconciliationSucceeded`.
* `message` - Flux's description of what happened. It becomes the incident title.
* `metadata.cluster` - Optional cluster name from `eventMetadata`.

The remaining fields (`apiVersion`, `metadata.revision`, `reportingController`, `reportingInstance`, `timestamp`) are sent by Flux and are not used to open or resolve incidents.

An incident from the first payload is titled: `service/apps/webapp validation error: spec.type: Unsupported value: Ingress — Kustomization apps/webapp in prod-eu-1`.

## Troubleshooting

**No incidents appear in Spike:**
* Check the Provider and Alert status with `kubectl -n flux-system get providers,alerts`; both should be ready.
* Confirm the `address` in the Secret is the exact Spike webhook URL.
* Confirm `eventSources` includes the kind and namespace of the failing object.
* Check the notification-controller logs: `kubectl -n flux-system logs deploy/notification-controller`.

**Incidents do not resolve:**
* Set `eventSeverity: info` on the Alert so Flux sends success events.
* Resolution happens when the same object sends an `info` event whose `reason` ends in `Succeeded`, such as `ReconciliationSucceeded`.

**Cluster name missing from the title:**
* Add `cluster` under the Alert's `spec.eventMetadata`.

{% hint style="success" %}
This integration auto resolves
{% endhint %}
