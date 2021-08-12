# Integrate Spike with Microsoft Azure

### Service and integration

Make sure to add the Azure integration and copy the webhook.

{% page-ref page="create-integration-and-service-on-dashboard.md" %}

 

{% hint style="success" %}
Azure Integration on Spike is capable of integrating with Azure Services like [**VMs, Application Insights** and more](https://azure.microsoft.com/en-in/services/).
{% endhint %}



### Using Webhook with Azure

### **Step 1**

 On [Azure Portal](https://portal.azure.com/#home) go to **Monitor**

![Select monitor](../.gitbook/assets/azure-1.png)



### **Step 2**

On the Monitor dashboard, choose to **Create Alert**

![Hit create alert](../.gitbook/assets/azure-2.png)

### **Step 3**

![Select resources you would like to monitor](../.gitbook/assets/azure-3.png)

On the Create Alert dashboard, you will be asked to configure the categories:

1. **Select A Resource** Choose a resource group you wish to monitor, for example, a Virtual Machine.
2. **Select A Condition** Choose a condition at which you wish to trigger an alert
3. **Select Action Rule** So, this is the main section which lets you integrate with webhooks. Azure allows you to paste a custom webhook URL to direct alerts to that server.

![Paste the webhook on Azure](../.gitbook/assets/azure-4.png)

### **Step 4**

Finally, add a **description** to your alert and choose the **severity** of the alert.

![Set alert rules](../.gitbook/assets/azure-5.png)



## FAQ

1. **How many services and integrations can I create on Spike?**
   * Unlimited
2. **How many escalation policies can I have on Spike?**
   * Unlimited

At Spike, we are working hard to integrate with all the tools your business uses. We are on a mission to help **you** identify incidents/crashes/spikes before your customers do.

If you have any integration in mind and would like us to build it for you then contact us at [support@spike.sh.](mailto:support@spike.sh)

