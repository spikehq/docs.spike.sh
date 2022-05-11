---
description: Configure Single Sign-On on Spike.sh
---

# SSO



This guide explains the settings you’d need to use to configure SAML with your Identity Provider. Once this is set up you should get an XML metadata file which you can provide to Spike and start using SSO.



### Step 1&#x20;

Follow the configurations given below while configuring your SAML with your IdP.

* Assertion consumer service URL / Single Sign-On URL / Destination URL: `https://app.spike.sh/sso/oauth/saml`
* Entity ID / Identifier / Audience URI / Audience Restriction: `https://app.spike.sh`
* Response: `Signed`
* Assertion Signature: `Signed`
* Signature Algorithm: `RSA-SHA256`
* Assertion Encryption: `Unencrypted`



For example, in the case of Okta users, this is how the configuration looks

![SAML configurations](<../.gitbook/assets/image (140).png>)

### Step 2

Add user mappings as shown below. Note that `email` , `firstName` and `lastName` are mandatory.

![Mappings](<../.gitbook/assets/image (141).png>)



### Step 3

Once the SAML is configured, head over to Spike.sh and open [organisation settings](https://app.spike.sh/settings/org).

Paste the IdP XML Metadata and save.

![](<../.gitbook/assets/image (142).png>)



&#x20;
