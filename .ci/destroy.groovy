#!/usr/bin/env groovy

pipeline {
    agent any
    parameters {
        run(name: "DEPLOYMENT", description: "Stack deployment to destroy", projectName: "/deployments/deploy-stack", filter: "SUCCESSFUL")
    }
    options {
        buildDiscarder(
            logRotator(
                numToKeepStr: "30",
                daysToKeepStr: "30",
                artifactNumToKeepStr: "30",
                artifactDaysToKeepStr: "30"
            )
        )
    }
    environment {
        ENVIRONMENT     = ""
        STACK_ID        = ""
        OWNER           = ""
    }
    stages {
        stage("Get Stack") {
            steps {
                script {
                    def DEPLOY_JOB_RUN = Jenkins \
                        .instance \
                        .getItemByFullName("/deployments/deploy-stack") \
                        .getBuild(env.DEPLOYMENT.split("/").last())

                    (ENVIRONMENT, STACK_ID) = DEPLOY_JOB_RUN \
                        .getDisplayName() \
                        .split(" - ") \
                        .last() \
                        .split("-", 2)

                    OWNER = (DEPLOY_JOB_RUN.getCause(Cause.UserIdCause) ?: DEPLOY_JOB_RUN.getCause(Cause.UpstreamCause).getUpstreamCauses()[0]) \
                        .getUserId()

                    currentBuild.displayName = "${ENVIRONMENT}-${STACK_ID}"
                }
            }
        }
        stage("Approval") {
            steps {
                timeout(time: 30, unit: "MINUTES") {
                    input(
                        message: "Destroy deployment ${STACK_ID} in ${ENVIRONMENT} environment?\n\nWaiting for approval from ${OWNER}",
                        ok: "Destroy",
                        submitter: OWNER
                    )
                }
            }
        }
        stage("Destroy") {
            steps {
                writeJSON(
                    file: "stack.json",
                    pretty: 4,
                    json: [
                        "stack_id": STACK_ID,
                        "environment": ENVIRONMENT,
                        "owner": OWNER,
                        "owner_id": slackUserIdFromEmail(OWNER)
                    ]
                )
                archiveArtifacts(
                    artifacts: "stack.json",
                    fingerprint: true,
                    allowEmptyArchive: false
                )
            }
            post {
                success {
                    catchError(buildResult: "SUCCESS", stageResult: "SUCCESS") {
                        script {
                            Jenkins \
                                .instance \
                                .getItemByFullName("/deployments/deploy-stack") \
                                .getBuild(env.DEPLOYMENT.split("/").last()) \
                                .delete()
                        }
                    }
                }
            }
        }
    }
    post {
        success {
            slackSend(
                channel: "@" + slackUserIdFromEmail(OWNER),
                color: currentBuild.currentResult == "SUCCESS" ? "good" : "danger",
                message: "Your deployment(${STACK_ID}) in ${ENVIRONMENT} environment was successfully destroyed.",
                blocks: [
                    [
                        "type": "header",
                        "text": [
                            "type": "plain_text",
                            "text": "Deployment destroyed"
                        ]
                    ],
                    [
                        "type": "section",
                        "text": [
                            "type": "mrkdwn",
                            "text": "Your deployment ${STACK_ID} was successfully destroyed."
                        ]
                    ],
                    [
                        "type": "divider"
                    ],
                    [
                        "type": "context",
                        "elements": [
                            [
                                "type": "mrkdwn",
                                "text": "*Environment*: ${ENVIRONMENT}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Stack ID*: ${STACK_ID}"
                            ]
                        ]
                    ]
                ]
            )
        }
    }
}