---
description: Connect Spike to a self-hosted Jira server using OAuth credentials.
---

# JIRA server (self-hosted)

To connect, you need three things from your Jira server:

- **Base URL** (the domain where your server is hosted, e.g. `https://jira.mydomain.com`)
- **Client ID**
- **Client Secret**

## Generate credentials on Jira

1. On your Jira server, go to **Settings > Applications**
2. Click **Application Links**
3. Click **Create Link**

<figure><img src="../../.gitbook/assets/image (3).png" alt="Application Links in Jira server settings"><figcaption><p>Application Links in Jira server settings.</p></figcaption></figure>

4. On the Create Link modal, select **External application** and **Incoming**

<figure><img src="../../.gitbook/assets/jira-server-spike-2.png" alt="Create Link modal in Jira"><figcaption><p>Select External application and Incoming.</p></figcaption></figure>

5. Fill in the details:
   - **Name**: Spike
   - **Callback URL**: `https://app.spike.sh/task-management/jira/self-hosted/auth/callback`
   - **Permission**: Write
   - Click **Save**

<figure><img src="../../.gitbook/assets/jira-server-integration-form.png" alt="Jira application link details form"><figcaption><p>Fill in the application link details.</p></figcaption></figure>

6. Copy the generated **Client ID** and **Client Secret**
7. Your **Base URL** is the domain where Jira is hosted, e.g. `https://jira.spike.sh`. Do not include a trailing slash.

<figure><img src="../../.gitbook/assets/jira-integration-final-step.png" alt="Generated Client ID and Client Secret in Jira"><figcaption><p>Copy the Client ID and Client Secret.</p></figcaption></figure>

## Connect in Spike

Go to [Settings > Organisation](https://app.spike.sh/settings/general/organisation#org--task-management) and select **JIRA server**. Enter the Base URL, Client ID, and Client Secret. Then click **Connect**.

<figure><img src="../../.gitbook/assets/image (1) (1) (2).png" alt="Jira server connection form in Spike settings"><figcaption><p>Enter your Jira server credentials in Spike settings.</p></figcaption></figure>

Jira opens for validation. Grant the requested permissions to complete the connection.
