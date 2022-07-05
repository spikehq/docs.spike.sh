# Title Remapper

Title remapper provides the ability to write custom parsers for your integration to parse the incident title the way you want. The title remapper dynamically changes the title of the incident. You will see the new title across all your alert channels



You can write parsing logic using Handlebars syntax and formulate incident titles accordingly. Read more [here](https://handlebarsjs.com/guide/#what-is-handlebars).\


#### Step 1

From the Alerts menu, go to title remapper and create a new remapper.

![](<../.gitbook/assets/image (142).png>)

#### Step 2

Provide a suitable name and description for your title remapper.

![](<../.gitbook/assets/image (150).png>)



#### Step 3

Select an integration for which you want to parse the title.

![](<../.gitbook/assets/image (143).png>)

Once you select an integration, a JSON body will be displayed in the preview section.

This payload is the metadata which we receive from the selected integration. Using this payload, you can now write a custom parser in the code editor provided on the left.

Once you have written the parser, press `Try Now` to check if the parser works and if the parsed incident title is meeting your requirements. Hit save to continue.



#### Step 4

Select all the integrations to be connected with the title remapper.

![](<../.gitbook/assets/image (144).png>)





