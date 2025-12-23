# Integrate Spike with Jenkins
## Overview

[Jenkins](https://www.jenkins.io/) is an open-source automation server that enables developers to build, test, and deploy software reliably. Jenkins monitors your CI/CD pipelines continuously, tracking build statuses, test results, deployment outcomes, and pipeline health to help you maintain efficient and reliable software delivery.

With Spike's integration, you can receive real-time alerts for various incidents detected by Jenkins, including:

* **Build Failures**: Notifications when builds fail, become unstable, or are aborted, helping you respond quickly to broken builds.
* **Pipeline Issues**: Alerts for pipeline failures, stage errors, and execution problems across your CI/CD workflows.
* **Deployment Failures**: Notifications when deployments to staging, production, or other environments fail or encounter errors.
* **Test Failures**: Alerts when test suites fail, helping you catch regressions and quality issues early.
* **Build Recovery**: Notifications when previously failing builds return to success, providing visibility into issue resolution.

This integration helps you stay on top of your entire Jenkins infrastructure, enabling immediate response to build failures, pipeline disruptions, and deployment issues.

{% hint style="info" %}
Spike will automatically group repeated incidents and also suppress alerts while incident is open. You can set up [alert rules](https://docs.spike.sh/alerts/alert-rules) to determine incident severity and take actions accordingly. Auto-resolution is supported when builds recover.
{% endhint %}

## Set up instructions

**Step 1:** Create a Jenkins integration in the Spike dashboard and copy the webhook URL.

{% content-ref url="create-integration-and-service-on-dashboard.md" %}
[create-integration-and-service-on-dashboard.md](create-integration-and-service-on-dashboard.md)
{% endcontent-ref %}

**Step 2:**

{% tabs %}
{% tab title="Setup on Jenkins" %}

**Prerequisites:**
* Jenkins administrator access
* Jenkins version 2.0 or higher
* HTTP Request Plugin installed (for webhook method)

**Method 1: Using Post-build Actions (Recommended)**

1. **Install Required Plugin:**
   * Navigate to **Manage Jenkins → Manage Plugins**
   * Go to the **Available** tab and search for "HTTP Request Plugin"
   * Install the plugin and restart Jenkins if required

2. **Configure Job Notifications:**
   * Open the Jenkins job you want to monitor
   * Click **Configure** in the left sidebar
   * Scroll down to **Post-build Actions**
   * Click **Add post-build action** and select **HTTP Request**

3. **Configure the HTTP Request:**
   * **URL**: Paste the Spike webhook URL copied from Step 1
   * **HTTP Mode**: Select **POST**
   * **Content type**: Select **APPLICATION_JSON**
   * **Request Body**:
   ```json
   {
     "title": "${JOB_NAME} - Build #${BUILD_NUMBER}",
     "status": "${BUILD_STATUS}",
     "body": {
       "job": "${JOB_NAME}",
       "buildNumber": "${BUILD_NUMBER}",
       "buildUrl": "${BUILD_URL}",
       "result": "${BUILD_STATUS}",
       "duration": "${BUILD_DURATION}",
       "executor": "${EXECUTOR_NUMBER}",
       "timestamp": "${BUILD_TIMESTAMP}"
     }
   }
   ```
   * **Validations**: Add validation to ensure successful delivery (optional)
   * **Timeout**: Set to 10 seconds

4. **Configure Build Triggers:**
   * In the same **Post-build Actions** section, configure when to send notifications
   * Common options:
     * Send on **FAILURE** (build failed)
     * Send on **UNSTABLE** (tests failed but build succeeded)
     * Send on **SUCCESS** (for recovery notifications)
     * Send on **ABORTED** (build was cancelled)

5. **Save Configuration:**
   * Click **Save** at the bottom of the page
   * Your job will now send notifications to Spike for the configured events

**Method 2: Using Jenkins Pipeline (Declarative)**

For pipeline jobs, add the following to your Jenkinsfile:

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                // Your build steps here
                echo 'Building...'
            }
        }
        stage('Test') {
            steps {
                // Your test steps here
                echo 'Testing...'
            }
        }
    }
    
    post {
        failure {
            script {
                def payload = """
                {
                    "title": "${env.JOB_NAME} - Build #${env.BUILD_NUMBER} Failed",
                    "status": "failure",
                    "body": {
                        "job": "${env.JOB_NAME}",
                        "buildNumber": "${env.BUILD_NUMBER}",
                        "buildUrl": "${env.BUILD_URL}",
                        "result": "FAILURE",
                        "branch": "${env.GIT_BRANCH}",
                        "commit": "${env.GIT_COMMIT}"
                    }
                }
                """
                
                httpRequest(
                    url: 'YOUR_SPIKE_WEBHOOK_URL',
                    httpMode: 'POST',
                    contentType: 'APPLICATION_JSON',
                    requestBody: payload
                )
            }
        }
        
        unstable {
            script {
                def payload = """
                {
                    "title": "${env.JOB_NAME} - Build #${env.BUILD_NUMBER} Unstable",
                    "status": "unstable",
                    "body": {
                        "job": "${env.JOB_NAME}",
                        "buildNumber": "${env.BUILD_NUMBER}",
                        "buildUrl": "${env.BUILD_URL}",
                        "result": "UNSTABLE"
                    }
                }
                """
                
                httpRequest(
                    url: 'YOUR_SPIKE_WEBHOOK_URL',
                    httpMode: 'POST',
                    contentType: 'APPLICATION_JSON',
                    requestBody: payload
                )
            }
        }
        
        success {
            script {
                // Send recovery notification
                def payload = """
                {
                    "title": "${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                    "status": "resolve",
                    "body": {
                        "job": "${env.JOB_NAME}",
                        "buildNumber": "${env.BUILD_NUMBER}",
                        "buildUrl": "${env.BUILD_URL}",
                        "result": "SUCCESS"
                    }
                }
                """
                
                httpRequest(
                    url: 'YOUR_SPIKE_WEBHOOK_URL',
                    httpMode: 'POST',
                    contentType: 'APPLICATION_JSON',
                    requestBody: payload
                )
            }
        }
    }
}
```

**Method 3: Using Scripted Pipeline**

```groovy
node {
    try {
        stage('Build') {
            // Your build steps
        }
        stage('Test') {
            // Your test steps
        }
        
        // Send success notification
        notifySpike('resolve', 'SUCCESS')
        
    } catch (Exception e) {
        // Send failure notification
        notifySpike('failure', 'FAILURE')
        throw e
    }
}

def notifySpike(status, result) {
    def payload = """
    {
        "title": "${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
        "status": "${status}",
        "body": {
            "job": "${env.JOB_NAME}",
            "buildNumber": "${env.BUILD_NUMBER}",
            "buildUrl": "${env.BUILD_URL}",
            "result": "${result}"
        }
    }
    """
    
    httpRequest(
        url: 'YOUR_SPIKE_WEBHOOK_URL',
        httpMode: 'POST',
        contentType: 'APPLICATION_JSON',
        requestBody: payload
    )
}
```

**Recommended Build Events:**

* **FAILURE**: Critical - Build failed to compile or execute
* **UNSTABLE**: Warning - Build succeeded but tests failed
* **SUCCESS**: Info - Build and tests passed (for recovery tracking)
* **ABORTED**: Info - Build was manually cancelled

**Test the Integration:**
* Trigger a build that you expect to fail (or manually abort one)
* Verify the incident appears in Spike with job name and build number
* Trigger a successful build to test auto-resolution
* Check that incidents include links to Jenkins build pages

{% endtab %}
{% endtabs %}

## Event payload structure

Jenkins webhook notifications should be sent as JSON payloads with the following structure:

```json
{
  "title": "backend-api - Build #142",
  "status": "failure",
  "body": {
    "job": "backend-api",
    "buildNumber": "142",
    "buildUrl": "https://jenkins.example.com/job/backend-api/142/",
    "result": "FAILURE",
    "duration": "125000",
    "executor": "2",
    "timestamp": "2025-12-22T10:30:45Z",
    "branch": "main",
    "commit": "a1b2c3d4"
  }
}
```

**Key Fields:**
* `title` - Incident title shown in Spike (should include job name and build number)
* `status` - Build status: `failure`, `unstable`, `resolve` (for success), or `aborted`
* `body.job` - Jenkins job name
* `body.buildNumber` - Build number
* `body.buildUrl` - Direct link to the Jenkins build
* `body.result` - Build result: `FAILURE`, `UNSTABLE`, `SUCCESS`, `ABORTED`
* `body.duration` - Build duration in milliseconds (optional)
* `body.branch` - Git branch name (optional, for pipeline jobs)
* `body.commit` - Git commit hash (optional)

{% hint style="success" %}
This integration supports auto-resolution. When a previously failing build succeeds, set `"status": "resolve"` in your webhook payload to automatically close the incident in Spike.
{% endhint %}