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

* An incident with status `New` opens a Spike incident, or joins the one already open for it.
* An incident with status `Active` joins the open Spike incident. If Sentinel reopens an incident that Spike already resolved, it reopens in Spike.
* An incident with status `Closed` resolves the Spike incident.
* Status is compared without regard to case or surrounding spaces. A missing or unknown status is treated as a new incident.
* Spike identifies an incident by its Sentinel incident ID (`object.name`, the GUID at the end of `object.id`). The ID is the same for every notification about one incident, so a repeat notification never pages twice and a close finds the incident it belongs to. An empty value or an unexpanded template such as `@{...}` is not an ID.

### Fields Spike reads

Send the whole incident. These are the fields Spike reads:

| Field | Required | Used for |
| --- | --- | --- |
| `object.name` | Yes | The incident ID. Matches repeats and the close to the open incident. |
| `object.properties.status` | Yes | `New` opens or joins, `Active` joins or reopens, `Closed` resolves. |
| `object.properties.description` | Recommended | The incident title in Spike. |
| `object.properties.title` | Recommended | Title when `description` is empty, and in the resolved message. |
| `object.properties.classification` | Optional | Shown in the resolved message, for example `TruePositive`. |
| `object.properties.severity` | Recommended | Sets the Spike severity. It is not part of the title. |
| `workspaceInfo.WorkspaceName` | Recommended | The workspace, used in the title when `description` is empty. |

Nothing else in the body is needed. Do not edit the body: send `@{triggerBody()}` as it is.

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

Spike receives the incident exactly as Sentinel hands it to the playbook. A new incident looks like this:

```json
{
  "eventUniqueId": "b3f1e7a2-6c94-4d58-a1f0-8e2d5c7b9a16",
  "objectSchemaType": "Incident",
  "objectEventType": "Create",
  "workspaceInfo": {
    "SubscriptionId": "7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47",
    "ResourceGroupName": "rg-secops-prod",
    "WorkspaceName": "law-sentinel-prod"
  },
  "workspaceId": "e41a6b2d-0c7f-4e93-b815-3d9f62a1c7e8",
  "object": {
    "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Incidents/5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
    "name": "5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
    "etag": "\"2a00c4d1-0000-0d00-0000-670b9e3c0000\"",
    "type": "Microsoft.SecurityInsights/Incidents",
    "properties": {
      "title": "Brute force attack against an Entra ID account",
      "description": "Identifies evidence of brute force activity against a user based on multiple authentication failures and at least one successful authentication within a given time window.",
      "severity": "High",
      "status": "New",
      "owner": {
        "objectId": null,
        "email": null,
        "assignedTo": null,
        "userPrincipalName": null
      },
      "labels": [],
      "firstActivityTimeUtc": "2026-10-13T02:41:07.113Z",
      "lastActivityTimeUtc": "2026-10-13T02:52:48.902Z",
      "lastModifiedTimeUtc": "2026-10-13T03:01:22.475Z",
      "createdTimeUtc": "2026-10-13T03:01:22.475Z",
      "incidentNumber": 4821,
      "additionalData": {
        "alertsCount": 1,
        "bookmarksCount": 0,
        "commentsCount": 0,
        "alertProductNames": [
          "Azure Sentinel"
        ],
        "tactics": [
          "CredentialAccess"
        ],
        "techniques": [
          "T1110"
        ]
      },
      "relatedAnalyticRuleIds": [
        "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/alertRules/0c8f3b6e-27d1-4a59-9e4c-b1d7a2f5e830"
      ],
      "incidentUrl": "https://portal.azure.com/#asset/Microsoft_Azure_Security_Insights/Incident/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Incidents/5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
      "providerName": "Azure Sentinel",
      "providerIncidentId": "4821",
      "alerts": [
        {
          "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Entities/9e2d4a7c-1b63-4f08-a5d9-6c3e8b1f2a74",
          "type": "Microsoft.SecurityInsights/Entities",
          "kind": "SecurityAlert",
          "properties": {
            "systemAlertId": "9e2d4a7c-1b63-4f08-a5d9-6c3e8b1f2a74",
            "tactics": [
              "CredentialAccess"
            ],
            "alertDisplayName": "Brute force attack against an Entra ID account",
            "description": "Identifies evidence of brute force activity against a user based on multiple authentication failures and at least one successful authentication within a given time window.",
            "severity": "High",
            "productName": "Azure Sentinel",
            "alertType": "7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47_0c8f3b6e-27d1-4a59-9e4c-b1d7a2f5e830",
            "status": "New",
            "startTimeUtc": "2026-10-13T02:41:07.113Z",
            "endTimeUtc": "2026-10-13T02:52:48.902Z",
            "timeGenerated": "2026-10-13T03:01:19.640Z",
            "providerAlertId": "3c71f0b8-5d24-49ae-8b16-0f9a2e6d4c51",
            "friendlyName": "Brute force attack against an Entra ID account"
          }
        }
      ],
      "bookmarks": [],
      "relatedEntities": [
        {
          "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Entities/a4c8e1f2-7b39-4d06-9e25-1f6b3a8c0d97",
          "type": "Microsoft.SecurityInsights/Entities",
          "kind": "Account",
          "properties": {
            "accountName": "jdoe",
            "upnSuffix": "contoso.com",
            "friendlyName": "jdoe@contoso.com"
          }
        },
        {
          "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Entities/d27b9f4a-3e18-4c65-b0a1-8f5c2e7d9b30",
          "type": "Microsoft.SecurityInsights/Entities",
          "kind": "Ip",
          "properties": {
            "address": "185.220.101.47",
            "friendlyName": "185.220.101.47"
          }
        }
      ],
      "comments": []
    }
  }
}
```

When an analyst closes the incident, the playbook sends the same incident with `status` set to `Closed` and the classification fields:

```json
{
  "eventUniqueId": "f07c2d95-3a81-4e6b-9d24-5b1a8e3c6f02",
  "objectSchemaType": "Incident",
  "objectEventType": "Update",
  "workspaceInfo": {
    "SubscriptionId": "7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47",
    "ResourceGroupName": "rg-secops-prod",
    "WorkspaceName": "law-sentinel-prod"
  },
  "workspaceId": "e41a6b2d-0c7f-4e93-b815-3d9f62a1c7e8",
  "object": {
    "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Incidents/5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
    "name": "5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
    "etag": "\"2a00f87e-0000-0d00-0000-670bc1a40000\"",
    "type": "Microsoft.SecurityInsights/Incidents",
    "properties": {
      "title": "Brute force attack against an Entra ID account",
      "description": "Identifies evidence of brute force activity against a user based on multiple authentication failures and at least one successful authentication within a given time window.",
      "severity": "High",
      "status": "Closed",
      "classification": "TruePositive",
      "classificationReason": "SuspiciousActivity",
      "classificationComment": "Password reset and sessions revoked for jdoe; source IP blocked at the firewall.",
      "owner": {
        "objectId": "2046feea-040d-4a46-9e2b-91c2941bfa70",
        "email": "priya.nair@contoso.com",
        "assignedTo": "Priya Nair",
        "userPrincipalName": "priya.nair@contoso.com"
      },
      "labels": [],
      "firstActivityTimeUtc": "2026-10-13T02:41:07.113Z",
      "lastActivityTimeUtc": "2026-10-13T02:52:48.902Z",
      "lastModifiedTimeUtc": "2026-10-13T05:32:16.208Z",
      "createdTimeUtc": "2026-10-13T03:01:22.475Z",
      "incidentNumber": 4821,
      "additionalData": {
        "alertsCount": 1,
        "bookmarksCount": 0,
        "commentsCount": 1,
        "alertProductNames": [
          "Azure Sentinel"
        ],
        "tactics": [
          "CredentialAccess"
        ],
        "techniques": [
          "T1110"
        ]
      },
      "relatedAnalyticRuleIds": [
        "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/alertRules/0c8f3b6e-27d1-4a59-9e4c-b1d7a2f5e830"
      ],
      "incidentUrl": "https://portal.azure.com/#asset/Microsoft_Azure_Security_Insights/Incident/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Incidents/5f8b2c1e-9a47-4d3b-8e61-2c9f0a7b4d13",
      "providerName": "Azure Sentinel",
      "providerIncidentId": "4821",
      "alerts": [
        {
          "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Entities/9e2d4a7c-1b63-4f08-a5d9-6c3e8b1f2a74",
          "type": "Microsoft.SecurityInsights/Entities",
          "kind": "SecurityAlert",
          "properties": {
            "systemAlertId": "9e2d4a7c-1b63-4f08-a5d9-6c3e8b1f2a74",
            "tactics": [
              "CredentialAccess"
            ],
            "alertDisplayName": "Brute force attack against an Entra ID account",
            "severity": "High",
            "productName": "Azure Sentinel",
            "status": "Resolved",
            "startTimeUtc": "2026-10-13T02:41:07.113Z",
            "endTimeUtc": "2026-10-13T02:52:48.902Z",
            "timeGenerated": "2026-10-13T03:01:19.640Z",
            "friendlyName": "Brute force attack against an Entra ID account"
          }
        }
      ],
      "bookmarks": [],
      "relatedEntities": [
        {
          "id": "/subscriptions/7d3c9a52-4b1e-4f8a-9c26-1e5b8f0a3d47/resourceGroups/rg-secops-prod/providers/Microsoft.OperationalInsights/workspaces/law-sentinel-prod/providers/Microsoft.SecurityInsights/Entities/a4c8e1f2-7b39-4d06-9e25-1f6b3a8c0d97",
          "type": "Microsoft.SecurityInsights/Entities",
          "kind": "Account",
          "properties": {
            "accountName": "jdoe",
            "upnSuffix": "contoso.com",
            "friendlyName": "jdoe@contoso.com"
          }
        }
      ],
      "comments": [
        {
          "properties": {
            "message": "Password reset and sessions revoked for jdoe; source IP blocked at the firewall.",
            "createdTimeUtc": "2026-10-13T05:31:58.044Z",
            "author": {
              "name": "Priya Nair",
              "email": "priya.nair@contoso.com"
            }
          }
        }
      ]
    }
  }
}
```

#### Step 3: Let Sentinel run the playbook

Sentinel needs permission to run playbooks in the resource group that holds the Logic App.

1. In Microsoft Sentinel, go to **Configuration** and then **Settings**, and open **Settings** (workspace settings) then the **Playbook permissions** tab.
2. Select **Configure permissions**, tick the resource group of your playbook and select **Apply**.

#### Step 4: Create the automation rules

Create two rules under **Configuration** > **Automation** > **Create** > **Automation rule**. If your workspace is onboarded to the Microsoft Defender portal, the same page is under **Microsoft Sentinel** > **Configuration** > **Automation** in [security.microsoft.com](https://security.microsoft.com), and Sentinel's Azure portal experience is retired after 31 March 2027.

**Rule 1: new incidents**

1. **Name**: `Spike: incident created`.
2. **Trigger**: `When incident is created`.
3. **Actions**: `Run playbook`, then select the playbook from Step 1.
4. Select **Apply**.

**Rule 2: closed incidents**

1. **Name**: `Spike: incident closed`.
2. **Trigger**: `When incident is updated`.
3. **Actions**: `Run playbook`, then select the same playbook.
4. Select **Apply**.

Leave the conditions empty so that closes and reopens are both sent. Other updates, such as a new owner or comment, are sent too and join the open Spike incident without paging again.

{% hint style="info" %}
Both rules run the same playbook. You do not need a separate one for closing: the incident's `status` in the body tells Spike whether to open or resolve. In the Defender portal, several changes made within 5 to 10 minutes can arrive as a single update.
{% endhint %}

#### Step 5: Test it

Open an incident in Sentinel and run the playbook on it manually: **Incidents**, select the incident, **Actions**, **Run playbook**. The incident appears in Spike. Close the incident in Sentinel and the Spike incident resolves.

### Good to know

* The Spike incident title is the incident `description`, which by default is the description of the analytics rule. Whitespace is collapsed and a long description is cut at a clause or word boundary to 200 characters.
* When `description` is empty or missing, the title is `{title} in {WorkspaceName}`. Without a workspace it is `{title}`. With neither, it is `Microsoft Sentinel incident in {WorkspaceName}` or `Microsoft Sentinel incident with no details`.
* On close, the Spike message is `{title} closed in Microsoft Sentinel as {classification}`. Without a classification it is `{title} closed in Microsoft Sentinel`, and without a title `Microsoft Sentinel incident closed`.
* Spike finds the open incident by the incident ID, not by the title, so an analyst editing the title or description in Sentinel does not break the close.
* Resolving an incident in Spike does not close it in Sentinel. Close it in Sentinel and let the playbook resolve the Spike incident.

Disclaimer: These integration instructions are offered independently by Spike, and Spike is not affiliated with nor a partner of Microsoft Corporation.
