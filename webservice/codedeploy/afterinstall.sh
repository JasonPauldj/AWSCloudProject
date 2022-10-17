#!/bin/bash

# cd /home/ec2-user && changing permission and installing node packages.
cd /home/ec2-user/app 
sudo chown ec2-user *
cd /home/ec2-user/app && sudo npm i --only=prod
