pipelineJob("services/build-test") {
    displayName("Build Test")
    description("Pull Request checker.")
    logRotator {
        numToKeep(50)
        daysToKeep(50)
        artifactNumToKeep(30)
        artifactDaysToKeep(30)
    }
    properties {
        githubProjectUrl("https://github.com/defiyield-info/defiyield-backend-v2")
    }
    triggers {
        githubPullRequest {
            whiteListTargetBranches(["master"])
            useGitHubHooks()
            cron("")
            permitAll()
            extensions {
                commitStatus {
                    context("ci/jenkins/build/pr")
                    triggeredStatus("PR build has triggered...")
                    startedStatus("PR build has started...")
                    completedStatus("SUCCESS", "Success")
                    completedStatus("FAILURE", "Failure")
                    completedStatus("PENDING", "PR build is still in progress...")
                    completedStatus("ERROR", "Error")
                }
                buildStatus {
                    completedStatus("SUCCESS", "There were no errors, go have a cup of coffee...")
                    completedStatus("FAILURE", "There were errors, for info, please see...")
                    completedStatus("ERROR", "There was an error in the infrastructure, please contact...")
                }
            }
        }
    }
    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url("https://github.com/defiyield-info/defiyield-backend-v2.git")
                        credentials("1")
                    }
                    branch("\${ghprbActualCommit}")
                    scriptPath(".ci/build-test.groovy")
                    extensions { }
                }
            }
            lightweight(false)
        }
    }
}