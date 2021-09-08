#!/bin/bash
output_port=3001
dev_port=3000
docker stop ts_web_app
docker rm ts_web_app
docker image rm ts_web_app:test
docker build --tag ts_web_app:test .
docker create --name ts_web_app -p $output_port:$dev_port ts_web_app:test
docker start ts_web_app
