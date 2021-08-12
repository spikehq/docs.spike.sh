---
description: 'How to get Phone, SMS and Slack alerts from CheckMk?'
---

# Integrate Spike with Checkmk

### Service and integration <a id="service-and-integration"></a>

Make sure to add the Checkmk integration and copying the webhook.[  
](https://docs.spike.sh/integrations-guideline/create-integration-and-service-on-dashboard)

{% page-ref page="create-integration-and-service-on-dashboard.md" %}



## Using Spike.sh script with [Checkmk](https://docs.checkmk.com/latest/en/install_packages_debian.html)

**Download the official checkmk-spike package** [**here**](https://exchange.checkmk.com/p/spike-5)**.**

_If you are using Checkmk docker, scroll below._

#### Step 1

Create a script called _**`spike.sh`**_  at  `local/share/check_mk/notifications`

#### **Step 2**

Paste the below script in the spike.sh file, using your prefered editor like nano or vim.

```text
#!/bin/bash
# Notify via Spike.sh

# In order to use this script:
# - copy it into your site into ~/local/share/check_mk/notificaions
# - make sure it is executable
# - Modify the spike webhook url into SPIKE_URL=
# - Create a notification rule that makes use of the new plugin


curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"OMD_ROOT" : "'"$OMD_ROOT"'","OMD_SITE" : "'"$OMD_SITE"'","NOTIFY_WHAT" : "'"$NOTIFY_WHAT"'","NOTIFY_CONTACTNAME" : "'"$NOTIFY_CONTACTNAME"'","NOTIFY_CONTACTEMAIL" : "'"$NOTIFY_CONTACTEMAIL"'","NOTIFY_CONTACTPAGER" : "'"$NOTIFY_CONTACTPAGER"'","NOTIFY_DATE" : "'"$NOTIFY_DATE"'","NOTIFY_LONGDATETIME" : "'"$NOTIFY_LONGDATETIME"'","NOTIFY_SHORTDATETIME" : "'"$NOTIFY_SHORTDATETIME"'","NOTIFY_HOSTNAME" : "'"$NOTIFY_HOSTNAME"'","NOTIFY_HOSTOUTPUT" : "'"$NOTIFY_HOSTOUTPUT"'","NOTIFY_HOSTSTATE" : "'"$NOTIFY_HOSTSTATE"'","NOTIFY_NOTIFICATIONTYPE" : "'"$NOTIFY_NOTIFICATIONTYPE"'","NOTIFY_PARAMETERS" : "'"$NOTIFY_PARAMETERS"'","NOTIFY_PARAMETER_1" : "'"$NOTIFY_PARAMETER_1"'","NOTIFY_PARAMETER_2" : "'"$NOTIFY_PARAMETER_2"'","NOTIFY_SERVICEDESC" : "'"$NOTIFY_SERVICEDESC"'","NOTIFY_SERVICEOUTPUT" : "'"$NOTIFY_SERVICEOUTPUT"'","NOTIFY_SERVICESTATE" : "'"$NOTIFY_SERVICESTATE"'"}' \
  "$SPIKE_URL"
```

#### **Step 3**

Export the spike webhook in an environment variable as:

`$ export SPIKE_URL="https://hooks.spike.sh/********************/push-events"`

#### Step 4

Make the file executable.

`$ sudo chmod +x spike.sh`

#### Step 5

On the dashboard, create a notification rule and choose to **Notify via Spike.sh** option to enable this integration.

## Using Spike.sh script with [Checkmk Docker](https://docs.checkmk.com/latest/en/introduction_docker.html)

In case if you are using Checkmk with Docker containers, follow these steps.

#### Step 1

Create a script called _**`spike.sh`**_  in your server at $HOME

`$ sudo nano $HOME/spike.sh`

#### **Step 2**

Paste the below script in the spike.sh file.

```text
#!/bin/bash
# Notify via Spike.sh

# In order to use this script:
# - copy it into your site into ~/local/share/check_mk/notificaions
# - make sure it is executable
# - Modify the spike webhook url into SPIKE_URL=
# - Create a notification rule that makes use of the new plugin


curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"OMD_ROOT" : "'"$OMD_ROOT"'","OMD_SITE" : "'"$OMD_SITE"'","NOTIFY_WHAT" : "'"$NOTIFY_WHAT"'","NOTIFY_CONTACTNAME" : "'"$NOTIFY_CONTACTNAME"'","NOTIFY_CONTACTEMAIL" : "'"$NOTIFY_CONTACTEMAIL"'","NOTIFY_CONTACTPAGER" : "'"$NOTIFY_CONTACTPAGER"'","NOTIFY_DATE" : "'"$NOTIFY_DATE"'","NOTIFY_LONGDATETIME" : "'"$NOTIFY_LONGDATETIME"'","NOTIFY_SHORTDATETIME" : "'"$NOTIFY_SHORTDATETIME"'","NOTIFY_HOSTNAME" : "'"$NOTIFY_HOSTNAME"'","NOTIFY_HOSTOUTPUT" : "'"$NOTIFY_HOSTOUTPUT"'","NOTIFY_HOSTSTATE" : "'"$NOTIFY_HOSTSTATE"'","NOTIFY_NOTIFICATIONTYPE" : "'"$NOTIFY_NOTIFICATIONTYPE"'","NOTIFY_PARAMETERS" : "'"$NOTIFY_PARAMETERS"'","NOTIFY_PARAMETER_1" : "'"$NOTIFY_PARAMETER_1"'","NOTIFY_PARAMETER_2" : "'"$NOTIFY_PARAMETER_2"'","NOTIFY_SERVICEDESC" : "'"$NOTIFY_SERVICEDESC"'","NOTIFY_SERVICEOUTPUT" : "'"$NOTIFY_SERVICEOUTPUT"'","NOTIFY_SERVICESTATE" : "'"$NOTIFY_SERVICESTATE"'"}' \
  "$SPIKE_URL"
```

#### **Step 3**

Export the spike webhook in an environment variable as:

`$ export SPIKE_URL="https://hooks.spike.sh/********************/push-events"`

#### Step 4

_Do this step once the checkmk docker container is up._

Get the container id using `docker ps`

Copy the spike.sh file inside the docker container at the location `/opt/omd/sites/cmk/local/share/check_mk/notifications#` using the following command.

_replace the &lt;CONTAINER\_ID&gt; with the container id you got from docker ps._

`$ docker cp spike.sh <CONTAINER_ID>:/opt/omd/sites/cmk/local/share/check_mk/notifications/spike.sh`

#### Step 5

Now exec into the docker container.

`$ docker exec -it <CONTAINER_ID> /bin/bash`

Make the spike.sh executable.

`$ cd /opt/omd/sites/cmk/local/share/check_mk/notifications`

`$ chmod +x spike.sh`

#### Step 6

Export the spike webhook in an environment variable as:

`$ export SPIKE_URL="https://hooks.spike.sh/********************/push-events"`

