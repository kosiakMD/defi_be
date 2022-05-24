#!/bin/bash
app="categorization_service"
version="ver_debug"
environment="env_debug"
outdir="./${app}/out"
chartdir="../.chart"
release="defiyield-service"
values_file="./${app}/config/values.yaml"

rm -rf ${outdir}
helm template ${release} -f ${values_file} \
 --set application.name=${app} \
 --set application.version=${version} \
 --set application.environment=${environment} \
 ${chartdir} --debug --output-dir ${outdir}
