#!/bin/bash

#configuring cloud watch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/cloudwatch-agent-config.json \
    -s

#starting the service
sudo systemctl start webservice.service