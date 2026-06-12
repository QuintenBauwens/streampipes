1. When uploading adapter the topic gets enriched correctly but make sure the route is with suffix '/' so mqqt can handle it in its hierarchy example input: B; B-3; B-31; B-315; B-3151; B-31512; B-3151200; B-3151200CR01"
2. When uploading adapter add timestamp field because this is needed to assign the adapter to data lake sink, do this through transformation like you do with the topic enrichment
3. Add settings:

    - now we have settings to auto deploy mqtt sink so the parameters have to be defined once
    - add setting to enable auto pipeline deployments (deploys pipelines automatically for each adapter that gets made)
    - call the settings header pipeline settings
    - add option to enable data lake sink (is enabled when mqqt sink is not enabled)
    - if auto deploy pipeline is enabled, atleast one sink has to be enabled
    - make the settings page layout better

4. when creating/importing adapter, the adapter is still not being linked to the according asset if its found in the adapter,asset mapping FIX THIS PLS
5. mapping page:

    - make it possible to remove certain mapping entries
    - make it possible to select everything at once, and remove or export
    - make it possible to search through the mapping entries