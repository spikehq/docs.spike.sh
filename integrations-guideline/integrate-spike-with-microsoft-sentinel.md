---
description: "Send Microsoft Sentinel incidents to Spike with an automation rule and a playbook, so a new incident pages your on-call rotation and closing it resolves the Spike incident."
---
# Integrate Spike with Microsoft Sentinel

### Service and Integration

Create a Microsoft Sentinel integration and copy the unique webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

### How it works

Microsoft Sentinel does not post webhooks by itself. You connect it to Spike with a **playbook**, which is an Azure Logic App that uses the **Microsoft Sentinel incident** trigger. An **automation rule** runs the playbook whenever an incident is created or updated. The playbook sends the incident to your Spike webhook URL with one **HTTP** action.

* An incident with status `New` or `Active` opens a Spike incident, or joins the one already open for it.
* An incident whose status changes to `Closed` resolves the Spike incident.
* Spike identifies an incident by its Sentinel incident ID (`object.name`). If that is missing it uses the incident number (`object.properties.incidentNumber`). The ID is the same for every notification about one incident, so a repeat notification never pages twice and a close finds the incident it belongs to.

### Fields Spike reads

Send the whole incident. These are the fields Spike reads:

| Field | Required | Used for |
| --- | --- | --- |
| `object.name` | Yes | The incident ID. Matches a close to the open incident. |
| `object.properties.incidentNumber` | Only if `object.name` is missing | Fallback incident ID. |
| `object.properties.status` | Yes | `New` and `Active` open an incident. `Closed` resolves it. |
| `object.properties.description` | Recommended | The incident title in Spike. |
| `object.properties.title` | Recommended | Title when `description` is empty, and in the resolved message. |
| `object.properties.severity` | Recommended | Shown in the title when `description` is empty. |
| `workspaceInfo.WorkspaceName` | Recommended | The workspace the incident belongs to. |

### Integrating with Microsoft Sentinel

#### Step 1: Create the playbook

1. In the [Azure portal](https://portal.azure.com), open **Microsoft Sentinel** and select your workspace.
2. Go to **Configuration** and then **Automation**.
3. Select the **Active playbooks** tab, then **Create** and **Playbook with incident trigger**.
4. Pick the subscription, resource group and a name, for example `spike-notify`, then select **Review + create** and **Create and continue to designer**.

#### Step 2: Add the HTTP action

1. In the Logic App designer, under the **Microsoft Sentinel incident** trigger, select **New step** (or **+**) and then **Add an action**.
2. Search for **HTTP** and select the **HTTP** action.
3. Set **Method** to `POST`.
4. Set **URI** to the Spike webhook URL you copied.
5. Under **Headers**, add `Content-Type` with the value `application/json`.
6. In **Body**, select **Dynamic content** and choose **Incident** (the whole trigger body), or enter `@{triggerBody()}`.
7. Select **Save**.

Spike receives the incident exactly as Sentinel hands it to the playbook:

```json
{
  "workspaceInfo": {
    "SubscriptionId": "d0cfe6b2-9ac0-4464-9919-dccaee2e48c0",
    "ResourceGroupName": "rg-secops-prod",
    "WorkspaceName": "law-sentinel-prod"
  },
  "workspaceId": "5b1f7a2e-3c4d-4e8f-9a0b-1c2d3e4f5a6b",
  "object": {
    "id": "/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/incidents/73e01a99-5cd7-4139-a149-9f2736ff2ab5",
    "name": "73e01a99-5cd7-4139-a149-9f2736ff2ab5",
    "properties": {
      "title": "Brute force attack against Azure Portal",
      "description": "Identifies evidence of brute force activity against Azure Portal by highlighting multiple authentication failures followed by a successful login for the same user within a short time window.",
      "severity": "Medium",
      "status": "New",
      "incidentNumber": 3177,
      "incidentUrl": "https://portal.azure.com/#asset/Microsoft_Azure_Security_Insights/Incident/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/incidents/73e01a99-5cd7-4139-a149-9f2736ff2ab5",
      "providerName": "Azure Sentinel",
      "providerIncidentId": "3177",
      "createdTimeUtc": "2026-10-09T02:14:07Z",
      "lastModifiedTimeUtc": "2026-10-09T02:14:07Z",
      "firstActivityTimeUtc": "2026-10-09T01:58:41Z",
      "lastActivityTimeUtc": "2026-10-09T02:09:12Z",
      "labels": [],
      "owner": {
        "objectId": null,
        "email": null,
        "assignedTo": null,
        "userPrincipalName": null
      },
      "relatedAnalyticRuleIds": [
        "/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/alertRules/fab3d2d4-747f-46a7-8ef0-9c0be8112bf7"
      ],
      "additionalData": {
        "alertsCount": 1,
        "bookmarksCount": 0,
        "commentsCount": 0,
        "alertProductNames": [
          "Azure Sentinel"
        ],
        "tactics": [
          "CredentialAccess"
        ]
      },
      "Alerts": [
        {
          "id": "/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/entities/2f9c1d7e-8a4b-4c3d-9e6f-0a1b2c3d4e5f",
          "name": "2f9c1d7e-8a4b-4c3d-9e6f-0a1b2c3d4e5f",
          "properties": {
            "alertDisplayName": "Brute force attack against Azure Portal",
            "description": "Identifies evidence of brute force activity against Azure Portal by highlighting multiple authentication failures followed by a successful login for the same user within a short time window.",
            "severity": "Medium",
            "status": "New",
            "productName": "Azure Sentinel",
            "compromisedEntity": "jane.doe@contoso.com",
            "tactics": [
              "CredentialAccess"
            ],
            "timeGenerated": "2026-10-09T02:14:05Z",
            "startTimeUtc": "2026-10-09T01:58:41Z",
            "endTimeUtc": "2026-10-09T02:09:12Z"
          }
        }
      ]
    }
  }
}
```

When an analyst closes the incident, the playbook sends the same body with `status` set to `Closed`, the classification fields and an `incidentUpdates` block:

```json
{
  "workspaceInfo": {
    "SubscriptionId": "d0cfe6b2-9ac0-4464-9919-dccaee2e48c0",
    "ResourceGroupName": "rg-secops-prod",
    "WorkspaceName": "law-sentinel-prod"
  },
  "workspaceId": "5b1f7a2e-3c4d-4e8f-9a0b-1c2d3e4f5a6b",
  "incidentUpdates": {
    "updatedFields": [
      "Status",
      "Classification"
    ],
    "updatedTime": "2026-10-09T03:02:44Z",
    "updatedBy": {
      "source": "User",
      "name": "sam.analyst@contoso.com"
    }
  },
  "object": {
    "id": "/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/incidents/73e01a99-5cd7-4139-a149-9f2736ff2ab5",
    "name": "73e01a99-5cd7-4139-a149-9f2736ff2ab5",
    "properties": {
      "title": "Brute force attack against Azure Portal",
      "description": "Identifies evidence of brute force activity against Azure Portal by highlighting multiple authentication failures followed by a successful login for the same user within a short time window.",
      "severity": "Medium",
      "status": "Closed",
      "classification": "TruePositive",
      "classificationReason": "SuspiciousActivity",
      "classificationComment": "Password reset and sessions revoked for jane.doe@contoso.com",
      "incidentNumber": 3177,
      "incidentUrl": "https://portal.azure.com/#asset/Microsoft_Azure_Security_Insights/Incident/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/incidents/73e01a99-5cd7-4139-a149-9f2736ff2ab5",
      "providerName": "Azure Sentinel",
      "providerIncidentId": "3177",
      "createdTimeUtc": "2026-10-09T02:14:07Z",
      "lastModifiedTimeUtc": "2026-10-09T03:02:44Z",
      "firstActivityTimeUtc": "2026-10-09T01:58:41Z",
      "lastActivityTimeUtc": "2026-10-09T02:09:12Z",
      "labels": [],
      "owner": {
        "objectId": "2046feea-040d-4a46-9e2b-91c2941bfa70",
        "email": "sam.analyst@contoso.com",
        "assignedTo": "Sam Analyst",
        "userPrincipalName": "sam.analyst@contoso.com"
      },
      "relatedAnalyticRuleIds": [
        "/subscriptions/d0cfe6b2-9ac0-4464-9919-dccaee2e48c0/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/alertRules/fab3d2d4-747f-46a7-8ef0-9c0be8112bf7"
      ],
      "additionalData": {
        "alertsCount": 1,
        "bookmarksCount": 0,
        "commentsCount": 1,
        "alertProductNames": [
          "Azure Sentinel"
        ],
        "tactics": [
          "CredentialAccess"
        ]
      }
    }
  }
}
```

#### Step 3: Let Sentinel run the playbook

Sentinel needs permission to run playbooks in the resource group that holds the Logic App.

1. In Microsoft Sentinel, go to **Configuration** and then **Settings**, and open **Settings** (workspace settings) then the **Playbook permissions** tab.
2. Select **Configure permissions**, tick the resource group of your playbook and select **Apply**.

#### Step 4: Create the automation rules

Create two rules under **Configuration** > **Automation** > **Create** > **Automation rule**.

**Rule 1: new incidents**

1. **Name**: `Spike: incident created`.
2. **Trigger**: `When incident is created`.
3. **Actions**: `Run playbook`, then select the playbook from Step 1.
4. Select **Apply**.

**Rule 2: closed incidents**

1. **Name**: `Spike: incident closed`.
2. **Trigger**: `When incident is updated`.
3. **Conditions**: `Status` `Changed to` `Closed`.
4. **Actions**: `Run playbook`, then select the same playbook.
5. Select **Apply**.

{% hint style="info" %}
Both rules run the same playbook. You do not need a separate one for closing: the incident's `status` in the body tells Spike whether to open or resolve.
{% endhint %}

#### Step 5: Test it

Open an incident in Sentinel and run the playbook on it manually: **Incidents**, select the incident, **Actions**, **Run playbook**. The incident appears in Spike. Close the incident in Sentinel and the Spike incident resolves.

### Good to know

* The Spike incident title is the incident `description`, which by default is the description of the analytics rule. When it is empty, Spike uses the incident title, severity and workspace name instead.
* The rules above only send an incident when it is created or when its status changes to `Closed`. Other updates, such as a reopen, are not sent.
* Resolving an incident in Spike does not close it in Sentinel. Close it in Sentinel and let the playbook resolve the Spike incident.

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Microsoft Corporation.
