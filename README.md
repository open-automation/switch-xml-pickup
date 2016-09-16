# switch-xml-pickup
Pickup XML datasets with traffic-light orphan routing. 

<img src="https://i.imgur.com/u7X687r.png" width="480">

XML Pickup is a great configurator but its error handling for orphaned jobs is not ideal. If you have any orphaned jobs, to further process them, you need to route them out of problem jobs (something to be avoided). This script attempts to remain faithful to the XML Pickup configurator while allowing for more graceful orphan/error handling via traffic-lights.

## Flow element properties

### Pickup mode

#### Metadata alongside asset
Pairs a metadata and job file based on a filename pattern.

##### Metadata filename pattern
The filename pattern to match the asset and metadata to. The pattern should be from the perspective of the asset job. If you're expecting __JobA.pdf__ and __JobA.xml__, then the pattern to match would be __*.xml__.

##### Orphan timeout (minutes)
The amount of time to wait before giving up on pairing a file if only one is received.

#### Metadata refers to asset
Pick up a dataset file from another location, similar to inject.

##### Asset path
The valid absolute path to the dataset.

#### Metadata is asset
The incoming job is the XML dataset. The contents of the job are consumed and the job itself is sent out.

### Dataset name
The name of the external dataset the XML will be tied to.
