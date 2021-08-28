pipelineJob("deployments/destroy-stack") {
    displayName("Destroy Stack")
    description("Destroy DeFiYield application deployment.")
    logRotator {
        numToKeep(30)
        daysToKeep(30)
        artifactNumToKeep(30)
        artifactDaysToKeep(30)
    }
    properties {
        githubProjectUrl("https://github.com/defiyield-info/defiyield-backend-v2")
    }
    parameters {
        runParam("DEPLOYMENT", "/deployments/deploy-stack", "Stack deployment to destroy", "SUCCESSFUL")
    }
    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url("https://github.com/defiyield-info/defiyield-backend-v2.git")
                        credentials("1")
                    }
                    branch("master")
                    scriptPath(".ci/destroy.groovy")
                    extensions { }
                }
            }
            lightweight(false)
        }
    }
}