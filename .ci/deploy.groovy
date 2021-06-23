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
            name: "BACKEND_BRANCH_NAME",
            description: "Git branch for backend to bake",
            useRepository: ".*defiyield-backend-v2.git",
            defaultValue: "backend/master",
            type: "PT_BRANCH",
            branchFilter: "backend/.*",
            sortMode: "ASCENDING",
            selectedValue: "DEFAULT",
            listSize: "0",
            quickFilterEnabled: true
        )
        gitParameter(
            name: "FRONTEND_BRANCH_NAME",
            description: "Git branch for frontend to bake",
            useRepository: ".*defiyield-website.git",
            defaultValue: "frontend/main",
            type: "PT_BRANCH",
            branchFilter: "frontend/.*",
            sortMode: "ASCENDING",
            selectedValue: "DEFAULT",
            listSize: "0",
            quickFilterEnabled: true
        )
        booleanParam(name: "DEPLOY_FRONTEND", description: "Deploy frontend service?", defaultValue: true)
        booleanParam(name: "DRY_RUN", description: "Generate stack manifest only?", defaultValue: false)
    }
    options {
        timeout(time: 1, unit: "HOURS")
        parallelsAlwaysFailFast()
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
        AWS_REGION        = "eu-central-1"
        AWS_CREDENTIALS   = "defiyield-aws"
        STACK_ID          = "${params.STACK_ID ?: UUID.randomUUID().toString()}"
        OWNER             = ""
        BACKEND_BRANCH    = ""
        FRONTEND_BRANCH   = ""
        BUILD_JOBS        = ""
        MISSED_IMAGES     = ""
        BACKEND_REVISION  = ""
        FRONTEND_REVISION = ""
    }
    stages {
        stage("Initialization") {
            steps {
                wrap([$class: "BuildUser"]) {
                    script {
                        FRONTEND_BRANCH = params.FRONTEND_BRANCH_NAME.replaceFirst("^frontend\\/", "")
                        BACKEND_BRANCH = params.BACKEND_BRANCH_NAME.replaceFirst("^backend\\/", "")
                        FRONTEND_REVISION = sh(script: "git rev-parse ${params.FRONTEND_BRANCH_NAME}", returnStdout: true).trim()
                        BACKEND_REVISION = sh(script: "git rev-parse ${params.BACKEND_BRANCH_NAME}", returnStdout: true).trim()
                        OWNER = env.BUILD_USER_EMAIL
                        currentBuild.displayName = "${FRONTEND_BRANCH} - ${BACKEND_BRANCH} - ${params.ENVIRONMENT}-${STACK_ID}"
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
                            message: "Bake stack for ${params.ENVIRONMENT} from\nFrontend: ${FRONTEND_BRANCH}(${FRONTEND_REVISION})\nBackend: ${BACKEND_BRANCH}(${BACKEND_REVISION})\n?\n\nWaiting for approval from ${env.BUILD_USER_ID}",
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
                            script: "find . -maxdepth 1 -type d ! -name '.*' ! -name 'agenda' ! -name 'common' ! -name 'swap_service' ! -name 'frontend_service' ! -name '*_crawlers' ! -name '*_consumers' -printf '%f\n' | sort",
                            returnStdout: true
                        ).trim().split("\n").collectEntries{ folder ->
                            def SERVICE = folder.replace("_", "-")
                            def REVISION = sh(script: "git log --pretty=tformat:'%h' -n1 ./${folder}", returnStdout: true).trim().take(7)
                            if (!ecrListImages(repositoryName: SERVICE).any{image -> image.imageTag == REVISION}) {
                                MISSED_SERVICES.add(SERVICE)
                            }
                            [(SERVICE): REVISION]
                        }
                        if (params.DEPLOY_FRONTEND) {
                            SERVICES["frontend-service"] = FRONTEND_REVISION.take(7)
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
                            "frontend": [
                                "branch": FRONTEND_BRANCH,
                                "revision": FRONTEND_REVISION
                            ],
                            "backend": [
                                "branch": BACKEND_BRANCH,
                                "revision": BACKEND_REVISION
                            ],
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
                                if (service in MISSED_IMAGES.split(",") || service in ["frontend-service"]) {
                                    switch(service) {
                                        case "frontend-service":
                                            build(
                                                job: "/services/${service}",
                                                wait: true,
                                                propagate: true,
                                                parameters: [
                                                    string(name: "BRANCH_NAME", value: FRONTEND_REVISION),
                                                    string(name: "API_GATEWAY", value: "https://${params.ENVIRONMENT}-api-${STACK_ID}.defyield.xyz/v1")
                                                ]
                                            )
                                            break
                                        default:
                                            build(
                                                job: "/services/${service}",
                                                wait: true,
                                                propagate: true,
                                                parameters: [
                                                    string(name: "BRANCH_NAME", value: BACKEND_REVISION)
                                                ]
                                            )
                                            break
                                    }
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
                                "text": "*Frontend Branch*: ${FRONTEND_BRANCH}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Frontend Revision*: ${FRONTEND_REVISION}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Backend Branch*: ${BACKEND_BRANCH}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Backend Revision*: ${BACKEND_REVISION}"
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