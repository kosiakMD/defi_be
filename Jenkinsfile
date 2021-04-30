#!/usr/bin/env groovy

pipeline {
    agent any
    parameters {
        string(name: "BRANCH_NAME", description: "Git branch to build Docker image", defaultValue: "master", trim: true)
    }
    options {
        buildDiscarder(
            logRotator(
                numToKeepStr: "50",
                daysToKeepStr: "30",
                artifactNumToKeepStr: "50",
                artifactDaysToKeepStr: "30"
            )
        )
    }
    environment {
        DOCKER_REGISTRY     = ""
        DOCKER_IMAGE        = ""
        DOCKER_TAG          = ""
        DOCKER_REGISTRY_URL = "https://625623467395.dkr.ecr.eu-central-1.amazonaws.com"
        DOCKER_CREDENTIALS  = "ecr:eu-central-1:defiyield-aws"
    }
    stages {
        stage("Build") {
            steps {
                script {
                    docker.withRegistry(DOCKER_REGISTRY_URL, DOCKER_CREDENTIALS) {
                        SERVICE_FOLDER = env.JOB_BASE_NAME.replace("-", "_")
                        DOCKER_REGISTRY = DOCKER_REGISTRY_URL.replace("https://", "")
                        DOCKER_TAG = sh(script: "git log --pretty=tformat:'%h' -n1 ./${SERVICE_FOLDER}", returnStdout: true).trim()
                        DOCKER_IMAGE = docker.build("${env.JOB_BASE_NAME}:${DOCKER_TAG}", "-f ./Dockerfile ./${SERVICE_FOLDER}")
                    }
                }
            }
        }
        stage("Push") {
            steps {
                script {
                    docker.withRegistry(DOCKER_REGISTRY_URL, DOCKER_CREDENTIALS) {
                        DOCKER_IMAGE.push()
                        DOCKER_IMAGE.push("latest")
                    }
                    writeJSON(
                        file: "image.json",
                        pretty: 4,
                        json: [
                            "image": DOCKER_IMAGE.imageName(),
                            "registry": DOCKER_REGISTRY,
                            "repository": env.JOB_BASE_NAME,
                            "tag": DOCKER_TAG
                        ]
                    )
                    archiveArtifacts(
                        artifacts: "image.json",
                        fingerprint: true,
                        allowEmptyArchive: true
                    )
                }
            }
        }
    }
    post {
        always {
            cleanWs()
            script {
                currentBuild.displayName = "${env.JOB_BASE_NAME} - ${params.BRANCH_NAME} #${env.BUILD_NUMBER}"
                currentBuild.description = DOCKER_IMAGE.imageName()
            }
            sh """
                docker rmi --force \
                  ${DOCKER_IMAGE.imageName()} \
                  ${DOCKER_REGISTRY}/${env.JOB_BASE_NAME}:latest
            """
        }
    }
}