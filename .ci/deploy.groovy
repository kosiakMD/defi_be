#!/usr/bin/env groovy

import org.jenkinsci.plugins.pipeline.modeldefinition.Utils

properties([
    parameters([
        [ $class: "WHideParameterDefinition", name: "STACK_ID", description: "Stack unique ID", defaultValue: "" ]
    ])
])

pipeline {
    agent any
    parameters {
        choice(name: "ENVIRONMENT", description: "Environment for bake", choices: ["development", "testing"])
        gitParameter(
            name: "BRANCH_NAME",
            description: "Git branch to bake",
            defaultValue: "origin/master",
            type: "PT_BRANCH",
            branchFilter: "origin/.*",
            sortMode: "ASCENDING",
            selectedValue: "DEFAULT",
            listSize: "0"
        )
        booleanParam(name: "DRY_RUN", description: "Generate stack manifest only", defaultValue: false)
    }
    options {
        buildDiscarder(
            logRotator(
                numToKeepStr: "100",
                daysToKeepStr: "60",
                artifactNumToKeepStr: "100",
                artifactDaysToKeepStr: "60"
            )
        )
    }
    environment {
        AWS_REGION      = "eu-central-1"
        AWS_CREDENTIALS = "defiyield-aws"
        STACK_ID        = "${params.STACK_ID ?: UUID.randomUUID().toString()}"
        OWNER           = ""
        BRANCH          = ""
        BUILD_JOBS      = ""
        MISSED_IMAGES   = ""
    }
    stages {
        stage("Initialization") {
            steps {
                wrap([$class: "BuildUser"]) {
                    script {
                        BRANCH = params.BRANCH_NAME.replaceFirst("^origin\\/", "")
                        OWNER = env.BUILD_USER_EMAIL
                        currentBuild.displayName = "${BRANCH} - ${params.ENVIRONMENT}-${STACK_ID}"
                    }
                }
            }
        }
        stage("Approval") {
            when {
                not {
                    triggeredBy "UpstreamCause"
                }
            }
            steps {
                wrap([$class: "BuildUser"]) {
                    timeout(time: 30, unit: "MINUTES") {
                        input(
                            message: "Bake stack for ${params.ENVIRONMENT} from ${BRANCH}(${GIT_COMMIT})?\n\nWaiting for approval from ${env.BUILD_USER_ID}",
                            ok: "Bake",
                            submitter: env.BUILD_USER_ID
                        )
                    }
                }
            }
        }
        stage("Bake") {
            steps {
                script {
                    def SERVICES = []
                    def MISSED_SERVICES = []

                    withAWS(region: AWS_REGION, credentials: AWS_CREDENTIALS) {
                        SERVICES = sh(
                            script: "find . -maxdepth 1 -type d ! -name '.*' ! -name 'agenda' ! -name 'common' ! -name 'swap_service' -printf '%f\n' | sort",
                            returnStdout: true
                        ).trim().split("\n").collectEntries{ folder ->
                            def SERVICE = folder.replace("_", "-")
                            def REVISION = sh(script: "git log --pretty=tformat:'%h' -n1 ./${folder}", returnStdout: true).trim()
                            if (!ecrListImages(repositoryName: SERVICE).any{image -> image.imageTag == REVISION}) {
                                MISSED_SERVICES.add(SERVICE)
                            }
                            [(SERVICE): REVISION]
                        }
                        MISSED_IMAGES = MISSED_SERVICES.join(",")
                        BUILD_JOBS = (SERVICES.keySet() as List).join(",")
                    }
                    writeJSON(
                        file: "stack.json",
                        pretty: 4,
                        json: [
                            "stack_id": STACK_ID,
                            "environment": params.ENVIRONMENT,
                            "branch": BRANCH,
                            "revision": GIT_COMMIT,
                            "owner": OWNER,
                            "owner_id": slackUserIdFromEmail(OWNER),
                            "services": SERVICES
                        ]
                    )
                    archiveArtifacts(
                        artifacts: "stack.json",
                        fingerprint: true,
                        allowEmptyArchive: false
                    )
                }
            }
        }
        stage("Trigger Builds") {
            when {
                expression {
                    return MISSED_IMAGES.split(",").size() > 0
                }
            }
            steps {
                script {
                    def STAGES = [:]

                    BUILD_JOBS.split(",").each{ service ->
                        STAGES["Build ${service}"] = {
                            stage("Build ${service}") {
                                if (service in MISSED_IMAGES.split(",")) {
                                    build(
                                        job: "/services/${service}",
                                        wait: true,
                                        propagate: true,
                                        parameters: [
                                            string(name: "BRANCH_NAME", value: GIT_COMMIT)
                                        ]
                                    )
                                } else {
                                    Utils.markStageSkippedForConditional("Build ${service}")
                                }
                            }
                        }
                    }
                    parallel STAGES
                }
            }
        }
    }
    post {
        always {
            slackSend(
                channel: "@" + slackUserIdFromEmail(OWNER),
                color: currentBuild.currentResult == "SUCCESS" ? "good" : "danger",
                message: "Your stack deployment(${STACK_ID}) to ${params.ENVIRONMENT} status is ${currentBuild.currentResult}.\nLink to the deployment: https://${params.ENVIRONMENT}-${STACK_ID}.defyield.xyz.",
                blocks: [
                    [
                        "type": "header",
                        "text": [
                            "type": "plain_text",
                            "text": "Deployment completed"
                        ]
                    ],
                    [
                        "type": "section",
                        "text": [
                            "type": "mrkdwn",
                            "text": "Your stack deployment status is *${currentBuild.currentResult}*."
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
                                "text": "*Environment*: ${params.ENVIRONMENT}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Stack ID*: ${STACK_ID}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Branch*: ${BRANCH}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Revision*: ${GIT_COMMIT}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Link*: https://${params.ENVIRONMENT}-${STACK_ID}.defyield.xyz"
                            ]
                        ]
                    ]
                ]
            )
            cleanWs()
        }
        success {
            script {
                currentBuild.result = params.DRY_RUN ? "NOT_BUILT" : "SUCCESS"
                currentBuild.description = "<a href=\"https://${params.ENVIRONMENT}-${STACK_ID}.defyield.xyz\">https://${params.ENVIRONMENT}-${STACK_ID}.defyield.xyz</a>"
            }
        }
    }
}