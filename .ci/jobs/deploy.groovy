pipelineJob("deployments/deploy-stack") {
    displayName("Deploy Stack")
    description("Deploy DeFiYield application.")
    logRotator {
        numToKeep(100)
        daysToKeep(60)
        artifactNumToKeep(100)
        artifactDaysToKeep(60)
    }
    properties {
        githubProjectUrl("https://github.com/defiyield-info/defiyield-backend-v2")
    }
    parameters {
        choiceParam("ENVIRONMENT", ["development", "testing"], "Environment for bake")
        gitParam("BACKEND_BRANCH_NAME") {
            description("Git branch for backend to bake")
            defaultValue("backend/master")
            type("BRANCH")
            sortMode("ASCENDING")
        }
        gitParam("FRONTEND_BRANCH_NAME") {
            description("Git branch for frontend to bake")
            defaultValue("frontend/main")
            type("BRANCH")
            sortMode("ASCENDING")
        }
        booleanParam("DEPLOY_FRONTEND", true, "Deploy frontend service?")
        booleanParam("DRY_RUN", false, "Generate stack manifest only?")
    }
    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url("https://github.com/defiyield-info/defiyield-backend-v2.git")
                        name("backend")
                        credentials("1")
                    }
                    remote {
                        url("https://github.com/defiyield-info/defiyield-website.git")
                        name("frontend")
                        credentials("1")
                    }
                    branch("\${BACKEND_BRANCH_NAME}")
                    scriptPath(".ci/deploy.groovy")
                    extensions { }
                }
            }
            lightweight(false)
        }
    }
}