# rsync for Node-Red

This node is a wrapper around the ![rsyncwrapper](https://www.npmjs.com/package/rsyncwrapper) module, which is a wrapper around rsync.

It requires that rsync is already installed. If using the Docker image for Node-Red, you can create your own image with rsync
installed using the following dockerfile:

**

    FROM nodered/node-red-docker

    USER root

    RUN apt-get update && apt-get -y install rsync

    CMD ["npm", "start", "--", "--userDir", "/data"]

You can then create the image using the following command:

    sudo docker build -t node-red-rsync .

And then replace the reference to the standard Node-Red image "nodered/node-red-docker" with your newly created one "node-red-rsync".
