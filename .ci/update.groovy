#!/usr/bin/env groovy

pipeline {
    agent any
    parameters {
        run(name: "DEPLOYMENT", description: "Stack deployment to update", projectName: "/deployments/deploy-stack", filter: "SUCCESSFUL")
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
        BRANCH          = ""
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

                    BRANCH = DEPLOY_JOB_RUN \
                        .getDisplayName() \
                        .split(" - ") \
                        .first()

                    currentBuild.displayName = "${ENVIRONMENT}-${STACK_ID}"
                }
            }
        }
        stage("Approval") {
            steps {
                timeout(time: 30, unit: "MINUTES") {
                    input(
                        message: "Update deployment ${STACK_ID} in ${ENVIRONMENT} environment?\n\nWaiting for approval from ${OWNER}",
                        ok: "Update",
                        submitter: OWNER
                    )
                }
            }
        }
        stage("Update") {
            steps {
                script {
                    build(
                        job: "/deployments/deploy-stack",
                        wait: true,
                        propagate: true,
                        parameters: [
                            string(name: "ENVIRONMENT", value: ENVIRONMENT),
                            gitParameter(name: "BRANCH_NAME", value: BRANCH),
                            [ $class: "WHideParameterValue", name: "STACK_ID", value: STACK_ID ]
                        ]
                    )
                }
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
}