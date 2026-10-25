#!/bin/bash
sudo dnf update -y
sudo dnf install -y httpd php
sudo systemctl enable --now httpd
