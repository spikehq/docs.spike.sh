---
description: Configure Single Sign-On on Spike.sh
---

# SSO



This guide explains the settings you’d need to use to configure SAML with your Identity Provider. Once this is set up you should get an XML metadata file which you can provide to Spike and start using SSO.





### Step 1&#x20;

Follow the configurations given below while configuring your SAML with your IdP.&#x20;

{% hint style="info" %}
The below values will be same for Okta, Microsoft Azure AD, Google, and other IdPs.&#x20;
{% endhint %}

* Assertion consumer service URL / Single Sign-On URL / Destination URL: `https://app.spike.sh/sso/oauth/saml`
* Entity ID / Identifier / Audience URI / Audience Restriction: `https://app.spike.sh`
* Response: `Signed`
* Assertion Signature: `Signed`
* Signature Algorithm: `RSA-SHA256`
* Assertion Encryption: `Unencrypted`

Guides for setting up SAML with other IdPs

1. [How to setup SAML on Microsoft Azure AD](https://docs.microsoft.com/en-us/power-apps/maker/portals/configure/configure-saml2-settings-azure-ad)
2. [How to setup SAML on Google Workspace](https://support.google.com/a/answer/6087519?hl=en)
3. [How to setup SAML on Centrify](https://docs.centrify.com/Content/Applications/AppsCustom/AddConfigSAML.htm)



For example, in the case of Okta users, this is how the configuration looks

![SAML configurations](<../.gitbook/assets/image (140) (2).png>)

### Step 2

Add user mappings as shown below. Note that `email` , `firstName` and `lastName` are mandatory.

![Mappings](<../.gitbook/assets/image (141).png>)



### Step 3

Once the SAML is configured, head over to Spike.sh and open [organisation settings](https://app.spike.sh/settings/org).

Paste the IdP XML Metadata and save.

![](<../.gitbook/assets/image (142) (1) (1).png>)



### Step 4

Once configured, you can find the organisation slug from organisation settings.

<img src="../.gitbook/assets/image (150) (1).png" alt="" data-size="original">![](<../.gitbook/assets/image (147).png>)

Use that slug at the time of login.&#x20;



