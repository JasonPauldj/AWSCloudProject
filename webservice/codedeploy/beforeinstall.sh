#!/bin/bash

#stopping the service
sudo systemctl stop webservice.service

#removing previously installed app folder. the app folder itself gets deleted
sudo rm -rf /home/ec2-user/webservice.zip
sudo rm -rf /home/ec2-user/app

#removing cloudwatch-agent-config
sudo rm /opt/cloudwatch-agent-config.json

#creating app folder
cd /home/ec2-user && mkdir app