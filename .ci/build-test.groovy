#!/usr/bin/env groovy

def setGithubCommitStatus(context, status) {
    step([
        $class: "GitHubCommitStatusSetter",
        reposSource: [
            $class: "ManuallyEnteredRepositorySource",
            url: GIT_URL
        ],
        commitShaSource: [
            $class: "ManuallyEnteredShaSource",
            sha: ghprbActualCommit
        ],
        contextSource: [
            $class: "ManuallyEnteredCommitContextSource",
            context: context
        ],
        statusResultSource: [
            $class: "ConditionalStatusResultSource",
            results: [
                [
                    $class: "AnyBuildResult",
                    message: status.capitalize(),
                    state: status.toUpperCase()
                ]
            ]
        ]
    ])
}

pipeline {
    agent any
    options {
        timeout(time: 1, unit: "HOURS")
        buildDiscarder(
            logRotator(
                numToKeepStr: "50",
                daysToKeepStr: "50",
                artifactNumToKeepStr: "30",
                artifactDaysToKeepStr: "30"
            )
        )
    }
    stages {
        stage("Trigger Builds") {
            steps {
                script {
                    currentBuild.displayName = "${ghprbSourceBranch} #${env.BUILD_NUMBER}"
                    currentBuild.description = "<b>Revision:</b> ${ghprbActualCommit}"
                    setGithubCommitStatus("ci/jenkins/build/push", "pending")
                    parallel sh(
                        script: """
                            find . -maxdepth 1 -type d \
                                ! -name '.*' \
                                ! -name 'agenda' \
                                ! -name 'common' \
                                ! -name 'swap_service' \
                                ! -name 'frontend_service' \
                                -printf '%f\n' | sort
                        """,
                        returnStdout: true
                    ).trim().split("\n").collectEntries{ SERVICE_FOLDER ->
                        def SERVICE = SERVICE_FOLDER.replace("_", "-")
                        ["Build ${SERVICE}", {
                            stage("Build ${SERVICE}") {
                                setGithubCommitStatus("ci/jenkins/build/${SERVICE}", "pending")
                                try {
                                    docker.build("${SERVICE}:${ghprbActualCommit}", "--file ./Dockerfile --target development ./${SERVICE_FOLDER}")
                                    setGithubCommitStatus("ci/jenkins/build/${SERVICE}", "success")
                                } catch (Exception exc) {
                                    setGithubCommitStatus("ci/jenkins/build/${SERVICE}", "failure")
                                    error(exc.toString())
                                } finally {
                                    sh script: "docker rmi --force ${SERVICE}:${ghprbActualCommit}", returnStatus: true
                                }
                            }
                        }]
                    }
                }
            }
        }
    }
    post {
        success {
            setGithubCommitStatus("ci/jenkins/build/push", "success")
        }
        failure {
            setGithubCommitStatus("ci/jenkins/build/push", "failure")
        }
        aborted {
            setGithubCommitStatus("ci/jenkins/build/push", "failure")
        }
        always {
            slackSend(
                channel: "@" + slackUserIdFromEmail(ghprbActualCommitAuthorEmail),
                color: currentBuild.currentResult == "SUCCESS" ? "good" : "danger",
                message: "Your PR build is completed with ${currentBuild.currentResult} status.\nDetails: ${BUILD_URL}.",
                blocks: [
                    [
                        "type": "header",
                        "text": [
                            "type": "plain_text",
                            "text": "PR build completed"
                        ]
                    ],
                    [
                        "type": "section",
                        "text": [
                            "type": "mrkdwn",
                            "text": "Your PR build is completed with *${currentBuild.currentResult}* status."
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
                                "text": "*PR*: ${ghprbPullLink}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Branch*: ${ghprbSourceBranch}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Revision*: ${ghprbActualCommit}"
                            ],
                            [
                                "type": "mrkdwn",
                                "text": "*Details*: ${BUILD_URL}"
                            ]
                        ]
                    ]
                ]
            )
            cleanWs()
        }
    }
}