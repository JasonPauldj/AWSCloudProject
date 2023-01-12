# webservice
This repository contains the code of all assignments for the course.
---

## Table of contents
  - [Prerequisites](#prerequisites)
  - [Build & Deploy Instructions](#build--deploy-instructions)
  - [Testing](#testing)
## Prerequisites
* **node** should be installed. Preferred version 16.13.2. 
If you do not have node installed, kindly visit [node.org](https://nodejs.org/en/) to install it.
## Build & Deploy Instructions
Run the following command in the terminal to install dependent packages.<br>
`npm install` <br><br>
Run the following command in the terminal to start the server.<br>
`npm start`
## Testing
Before testing, kindly ensure that you have previously downloaded the packages by running the command. <br>
`npm install` <br><br>
Run the following command to run the unit tests<br>
`npm test`
## Packer CLI Reference
* packer init .
* packer build -var-file="dev-vars.pkrvars.json" ami.pkr.hcl
