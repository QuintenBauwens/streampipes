# Architecture Apache Streampipes

I am very interested in using Apache Streampipes as a base for retrieving Industrial 4.0 Data such as OPC UA drivers and PLC4x plcs. 
But some aspects about it are limited, like:

## Requirements

- [ ] create assets with a .json data input from maximo

    ```json
    [
      {

        "LOCATION": "B-41662",

        "PARENT": "B-4166",

        "SYSTEMID": "PRODMID",

        "CHILDREN": 0,

        "SITEID": "VCG",

        "ORGID": "VCCBE",

        "LOCHIERARCHYID": 428060,

        "ROUTE": "B; B-4; B-41; B-416; B-4166; B-41662",

        "DESCRIPTION": "topcoat/preparation/feathers/ventilation/line-2"
      },
      {

        "LOCATION": "B-41661",

        "PARENT": "B-4166",

        "SYSTEMID": "PRODMID",

        "CHILDREN": 0,

        "SITEID": "VCG",

        "ORGID": "VCCBE",

        "LOCHIERARCHYID": 428059,

        "ROUTE": "B; B-4; B-41; B-416; B-4166; B-41661",

        "DESCRIPTION": "topcoat/preparation/feathers/ventilation/line-1"

      },
        ]
    ```

- [ ] import Adapters directly with .yaml file and assign the adapter/datapoint to the corresponding datapoint-asset (for this their has to be a mapping file between the datapoint and the asset because their is no other way to retrieve this from the adapter nor the maximo asset )
- [ ] The Asset hierarchy of the datapoint has to be enriched in the datapoint datastream
- [ ] The parent asset of an end-point device's assets is the zone to which the device belongs to. The zone can contain multiple datapoints. The zone has to perform as a pipeline within streampipes with all the datastreams of the corresponding adapters/datapoints.
- [ ] The pipeline output has to be sent to MQTT broker but since each datapoint datastream is enriched with it hierarchical asset location, use this as the MQTT-topic

## backend

- [ ] The MQTT sink doesnt support dynamic topics
- [ ] MQTT doesnt accept more then one Datastream
- [ ] Pipelines cant contain more then 2 datastreams
- [ ] implement feature to upload .yaml configs directly for certain adapters (PLC4x, PLC4x.Modbus, OPCUA)

## frontend

- [ ] implement ui options to upload file config files directly
- [ ] implement ui options to upload file to import assets directly with maximo format