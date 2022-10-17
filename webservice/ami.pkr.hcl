packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_access_key" {
  type    = string
  default = ""
}

variable "aws_region" {
  type    = string
  default = ""
}

variable "aws_secret_key" {
  type    = string
  default = ""
}

variable "source_ami" {
  type    = string
  default = "ami-0c02fb55956c7d316"
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "subnet_id" {
  type    = string
  default = ""
}

locals { timestamp = regex_replace(timestamp(), "[- TZ:]", "") }

source "amazon-ebs" "ec2-user" {
  access_key      = "${var.aws_access_key}"
  ami_description = "Linux AMI for CSYE 6225"
  ami_name        = "csye6225_spring2022_${local.timestamp}"
  ami_users       = ["605025718575"]
  instance_type   = "t2.micro"
  region       = "${var.aws_region}"
  secret_key   = "${var.aws_secret_key}"
  source_ami   = "${var.source_ami}"
  ssh_username = "${var.ssh_username}"
}

build {
  sources = ["source.amazon-ebs.ec2-user"]

  provisioner "file" {
    source = "./webservice.zip"
    destination = "/home/ec2-user/webservice.zip"
  }

  provisioner "file" {
    source = "./webservice.service"
    destination = "/tmp/webservice.service"
  }

  provisioner "file" {
    source = "./cloudwatch-agent-config.json"
    destination = "/tmp/cloudwatch-agent-config.json"
  }

  provisioner "shell" {
    script = "./app.sh"
  }

}